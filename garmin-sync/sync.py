#!/usr/bin/env python3
"""Garmin Connect → MongoDB sync for HRV and Resting HR."""

import logging
import os
from datetime import date, timedelta

from garminconnect import Garmin, GarminConnectAuthenticationError
from pymongo import MongoClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

GARMIN_EMAIL = os.environ["GARMIN_EMAIL"]
GARMIN_PASSWORD = os.environ["GARMIN_PASSWORD"]
MONGODB_URI = os.environ["MONGODB_URI"]
MONGODB_DB = os.environ["MONGODB_DB"]  # same db name used by the Next.js app
USER_EMAIL = os.environ["USER_EMAIL"]
DAYS_BACK = int(os.environ.get("DAYS_BACK", "14"))
TOKENSTORE = os.environ.get("TOKENSTORE", "/data/garmin_tokens")


def get_user_id(mongo, email: str) -> str:
    user = mongo[MONGODB_DB]["users"].find_one({"email": email}, {"_id": 1})
    if not user:
        raise RuntimeError(f"User '{email}' not found in {MONGODB_DB}.users")
    user_id = str(user["_id"])
    log.info("Found userId=%s", user_id)
    return user_id


def garmin_login() -> Garmin:
    api = Garmin()
    try:
        api.login(TOKENSTORE)
        log.info("Logged in via cached token")
    except Exception:
        log.info("Token invalid or missing, logging in with credentials")
        api = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
        api.login()
        api.garth.dump(TOKENSTORE)
        log.info("Token saved to %s", TOKENSTORE)
    return api


def sync_hrv(api: Garmin, collection, user_id: str, dates: list) -> None:
    added = skipped = 0
    for date_str in dates:
        try:
            data = api.get_hrv_data(date_str)
            summary = (data or {}).get("hrvSummary")
            summaries = [summary] if summary else []
        except Exception as e:
            log.warning("HRV fetch failed for %s: %s", date_str, e)
            continue

        for s in summaries:
            cal_date = s.get("calendarDate")
            if not cal_date:
                continue
            result = collection.update_one(
                {"userId": user_id, "calendarDate": cal_date},
                {"$setOnInsert": {"userId": user_id, **s}},
                upsert=True,
            )
            if result.upserted_id:
                added += 1
            else:
                skipped += 1

    log.info("HRV: %d new, %d already present", added, skipped)


def sync_rest_hr(api: Garmin, collection, user_id: str, dates: list) -> None:
    added = skipped = 0
    for date_str in dates:
        try:
            data = api.get_heart_rates(date_str)
            resting_hr = (data or {}).get("restingHeartRate")
            if not resting_hr:
                continue
        except Exception as e:
            log.warning("RestHR fetch failed for %s: %s", date_str, e)
            continue

        result = collection.update_one(
            {"userId": user_id, "calendarDate": date_str},
            {"$setOnInsert": {
                "userId": user_id,
                "calendarDate": date_str,
                "values": {"restingHR": resting_hr},
            }},
            upsert=True,
        )
        if result.upserted_id:
            added += 1
        else:
            skipped += 1

    log.info("RestHR: %d new, %d already present", added, skipped)


def main() -> None:
    today = date.today()
    dates = [(today - timedelta(days=i)).isoformat() for i in range(DAYS_BACK)]
    log.info("Syncing %d days (%s → %s)", DAYS_BACK, dates[-1], dates[0])

    api = garmin_login()

    mongo = MongoClient(MONGODB_URI)
    db = mongo[MONGODB_DB]
    user_id = get_user_id(mongo, USER_EMAIL)
    log.info("Syncing for userId=%s", user_id)

    sync_hrv(api, db["hrventries"], user_id, dates)
    sync_rest_hr(api, db["resthrentries"], user_id, dates)

    mongo.close()
    log.info("Done")


if __name__ == "__main__":
    main()
