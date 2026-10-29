#!/usr/bin/env python3
"""Garmin Connect Personal API → MongoDB sync for HRV, Resting HR and Sleep."""

import argparse
import logging
import os
import sys
from datetime import date, timedelta

import urllib.request
import urllib.error
from garmin_personal_api import (
    GarminPersonalApiClient,
    GarminPersonalApiError,
    HttpError,
    PersonalApiAuthenticator,
)
from pymongo import MongoClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

GARMIN_PERSONAL_API_KEY = os.environ["GARMIN_PERSONAL_API_KEY"]
MONGODB_URI = os.environ["MONGODB_URI"]
MONGODB_DB = os.environ["MONGODB_DB"]  # same db name used by the Next.js app
USER_EMAIL = os.environ["USER_EMAIL"]
DAYS_BACK = int(os.environ.get("DAYS_BACK", "14"))
SLEEP_DAYS_BACK = int(os.environ.get("SLEEP_DAYS_BACK", "365"))
TOKENSTORE = os.environ.get("TOKENSTORE", "/data/garmin_tokens")
BEARER_TOKEN_CACHE = os.environ.get(
    "BEARER_TOKEN_CACHE", os.path.join(TOKENSTORE, "bearer-token.json")
)
REPORT_APP_URL = os.environ.get("REPORT_APP_URL", "")  # e.g. http://web:3000
PROCESS_QUEUE_SECRET = os.environ.get("PROCESS_QUEUE_SECRET", "")

# The sleep summaries endpoint answers HTTP 400 for ranges around 90 days
# (31 days work); stay well under it for every batch endpoint.
BATCH_DAYS = 30


def get_user_id(mongo, email: str) -> str:
    user = mongo[MONGODB_DB]["users"].find_one({"email": email}, {"_id": 1})
    if not user:
        raise RuntimeError(f"User '{email}' not found in {MONGODB_DB}.users")
    user_id = str(user["_id"])
    log.info("Found userId=%s", user_id)
    return user_id


def garmin_client() -> GarminPersonalApiClient:
    """Exchange the Personal API key for a bearer token (cached for 24h)."""
    os.makedirs(os.path.dirname(BEARER_TOKEN_CACHE), exist_ok=True)
    try:
        with PersonalApiAuthenticator(bearer_token_cache_file=BEARER_TOKEN_CACHE) as auth:
            token = auth.obtain_token(GARMIN_PERSONAL_API_KEY)
    except HttpError as e:
        if e.status_code in (401, 403):
            log.error(
                "Personal API key rejected (HTTP %d): it is expired or revoked. "
                "Generate a new one at https://connect.garmin.com/app/settings/personalApiToken "
                "and update GARMIN_PERSONAL_API_KEY.",
                e.status_code,
            )
        raise
    log.info("Garmin bearer token ready")
    return GarminPersonalApiClient(token.access_token)


def date_chunks(dates: list):
    """Yield (start, end) ISO date pairs of at most BATCH_DAYS days, oldest first."""
    ordered = sorted(dates)
    for i in range(0, len(ordered), BATCH_DAYS):
        chunk = ordered[i : i + BATCH_DAYS]
        yield chunk[0], chunk[-1]


def upsert(collection, user_id: str, cal_date: str, fields: dict, dry_run: bool) -> bool:
    """Upsert one calendarDate document. Return True if it did not exist yet.

    None values are dropped so a field the API does not return never wipes a
    value already stored.
    """
    fields = {k: v for k, v in fields.items() if v is not None}
    key = {"userId": user_id, "calendarDate": cal_date}
    if dry_run:
        existing = collection.find_one(key)
        if existing is None:
            log.info("[dry-run] %s: new %s", cal_date, fields)
            return True
        changed = {k: (existing.get(k), v) for k, v in fields.items() if existing.get(k) != v}
        if changed:
            log.info("[dry-run] %s: would change (db, api) %s", cal_date, changed)
        return False
    result = collection.update_one(
        key,
        {"$set": fields, "$setOnInsert": key},
        upsert=True,
    )
    return result.upserted_id is not None


def sync_hrv(client: GarminPersonalApiClient, collection, user_id: str, dates: list, dry_run: bool) -> None:
    added = skipped = 0
    for start, end in date_chunks(dates):
        try:
            data = client.get_daily_hrv_summaries(start, end)
            summaries = (data or {}).get("hrvSummaries") or []
        except GarminPersonalApiError as e:
            log.warning("HRV fetch failed for %s → %s: %s", start, end, e)
            continue

        for s in summaries:
            cal_date = s.get("calendarDate")
            if not cal_date:
                continue
            hrv_fields = {k: v for k, v in s.items() if k not in ("userId", "calendarDate")}
            if upsert(collection, user_id, cal_date, hrv_fields, dry_run):
                added += 1
            else:
                skipped += 1

    log.info("HRV: %d new, %d already present", added, skipped)


def sync_sleep(client: GarminPersonalApiClient, collection, user_id: str, dates: list, dry_run: bool) -> None:
    added = skipped = 0
    for start, end in date_chunks(dates):
        try:
            rows = client.get_daily_sleep_summaries(start, end) or []
        except GarminPersonalApiError as e:
            log.warning("Sleep fetch failed for %s → %s: %s", start, end, e)
            continue

        for row in rows:
            cal_date = row.get("calendarDate")
            if not cal_date:
                continue
            sleep_scores = row.get("sleepScores") or {}
            overall = sleep_scores.get("overall") or {}

            garmin_fields = {
                "sleepTimeSeconds": row.get("sleepTimeSeconds"),
                "deepSleepSeconds": row.get("deepSleepSeconds"),
                "lightSleepSeconds": row.get("lightSleepSeconds"),
                "remSleepSeconds": row.get("remSleepSeconds"),
                "awakeSleepSeconds": row.get("awakeSleepSeconds"),
                "averageSpO2Value": row.get("averageSpO2Value"),
                "sleepScore": overall.get("value"),
                "averageRespirationValue": row.get("averageRespirationValue"),
            }
            if upsert(collection, user_id, cal_date, garmin_fields, dry_run):
                added += 1
            else:
                skipped += 1

    log.info("Sleep: %d new, %d already present", added, skipped)


def sync_rest_hr(client: GarminPersonalApiClient, collection, user_id: str, dates: list, dry_run: bool) -> None:
    added = skipped = 0
    for date_str in dates:
        try:
            data = client.get_daily_heart_rate(date_str)
            resting_hr = (data or {}).get("restingHeartRate")
            if not resting_hr:
                continue
        except GarminPersonalApiError as e:
            log.warning("RestHR fetch failed for %s: %s", date_str, e)
            continue

        key = {"userId": user_id, "calendarDate": date_str}
        if dry_run:
            existing = collection.find_one(key)
            if existing is None:
                log.info("[dry-run] %s: new restingHR=%s", date_str, resting_hr)
                added += 1
            else:
                old = (existing.get("values") or {}).get("restingHR")
                if old != resting_hr:
                    log.info("[dry-run] %s: would change restingHR (db, api) %s", date_str, (old, resting_hr))
                skipped += 1
            continue

        result = collection.update_one(
            key,
            {
                "$set": {"values": {"restingHR": resting_hr}},
                "$setOnInsert": key,
            },
            upsert=True,
        )
        if result.upserted_id:
            added += 1
        else:
            skipped += 1

    log.info("RestHR: %d new, %d already present", added, skipped)


def trigger_report(force: bool = False) -> None:
    """Call the Next.js report endpoint after sync."""
    if not REPORT_APP_URL or not PROCESS_QUEUE_SECRET:
        log.info("REPORT_APP_URL or PROCESS_QUEUE_SECRET not set, skipping report trigger")
        return

    url = f"{REPORT_APP_URL}/api/report/send"
    if force:
        url += "?force=true"

    req = urllib.request.Request(
        url,
        data=b"",
        method="POST",
        headers={
            "x-cron-secret": PROCESS_QUEUE_SECRET,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            log.info("Report trigger response: %s", body)
    except urllib.error.HTTPError as e:
        log.warning("Report trigger HTTP error %d: %s", e.code, e.read().decode())
    except Exception as e:
        log.warning("Report trigger failed: %s", e)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch from Garmin and log what would change; write nothing, skip the report.",
    )
    dry_run = parser.parse_args().dry_run

    today = date.today()
    dates = [(today - timedelta(days=i)).isoformat() for i in range(DAYS_BACK)]
    sleep_dates = [(today - timedelta(days=i)).isoformat() for i in range(SLEEP_DAYS_BACK)]
    log.info("Syncing %d days HRV/RestHR (%s → %s)", DAYS_BACK, dates[-1], dates[0])
    log.info("Syncing %d days Sleep (%s → %s)", SLEEP_DAYS_BACK, sleep_dates[-1], sleep_dates[0])

    try:
        client = garmin_client()
    except GarminPersonalApiError as e:
        log.error("Garmin authentication failed: %s", e)
        sys.exit(1)

    mongo = MongoClient(MONGODB_URI)
    db = mongo[MONGODB_DB]
    user_id = get_user_id(mongo, USER_EMAIL)
    log.info("Syncing for userId=%s", user_id)

    sync_hrv(client, db["hrventries"], user_id, dates, dry_run)
    sync_rest_hr(client, db["resthrentries"], user_id, dates, dry_run)
    sync_sleep(client, db["sleepentries"], user_id, sleep_dates, dry_run)

    mongo.close()
    log.info("Garmin sync done")

    if not dry_run:
        trigger_report()


if __name__ == "__main__":
    main()
