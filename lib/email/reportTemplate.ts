import type { ReportData } from "./reportData";

function fmt(n: number | null, unit = ""): string {
  if (n === null) return "—";
  return `${n}${unit}`;
}

function fmtDelta(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n} kg`;
}

function fmtPace(distanceM: number, movingTimeSec: number): string {
  if (distanceM === 0) return "—";
  const secPerKm = movingTimeSec / (distanceM / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDistance(m: number): string {
  return `${(m / 1000).toFixed(2)} km`;
}

function trendArrow(delta: number | null): string {
  if (delta === null) return "";
  if (delta > 0.2) return " ↑";
  if (delta < -0.2) return " ↓";
  return " →";
}

function statusColor(status: string | null): string {
  if (!status) return "#888";
  const s = status.toLowerCase();
  if (s.includes("balanced")) return "#10B981";
  if (s.includes("unbalanced")) return "#F59E0B";
  if (s.includes("low")) return "#EF4444";
  return "#888";
}

const BASE = "#1E3A8A";
const ACCENT = "#FC4C02";

function fmtSleepDuration(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function sleepScoreColor(score: number | null): string {
  if (score === null) return "#888";
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

export function buildReportHtml(data: ReportData): string {
  const { weight, hrv, restHr, sleep, activities, generatedAt } = data;
  const dateLabel = generatedAt.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const weightRows = weight.entries
    .slice()
    .reverse()
    .map(
      (e) => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;">${e.date}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${e.weightKg} kg</td>
      </tr>`
    )
    .join("");

  const activityRows = activities
    .map(
      (a) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;">${a.date}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;">${a.name}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${fmtDistance(a.distanceM)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${fmtTime(a.movingTimeSec)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${fmtPace(a.distanceM, a.movingTimeSec)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${a.totalElevationGain > 0 ? `+${Math.round(a.totalElevationGain)} m` : "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${a.averageHeartrate ? `${Math.round(a.averageHeartrate)} bpm` : "—"}</td>
      </tr>`
    )
    .join("");

  const noActivities = activities.length === 0
    ? `<p style="color:#888;font-size:13px;margin:8px 0 0;">Nessuna corsa negli ultimi 7 giorni.</p>`
    : "";

  const targetRow = weight.targetKg
    ? `<div style="margin-top:6px;font-size:13px;color:#555;">
        Target: <strong>${weight.targetKg} kg</strong>
        &nbsp;·&nbsp; Δ target: <strong style="color:${(weight.deltaFromTarget ?? 0) > 0 ? "#EF4444" : "#10B981"}">${fmtDelta(weight.deltaFromTarget)}</strong>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Riepilogo settimanale – Code &amp; Run</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- header -->
  <tr>
    <td style="background:${BASE};padding:24px 28px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Code &amp; Run</span>
        <span style="background:${ACCENT};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;">Weekly Report</span>
      </div>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.7);">Riepilogo degli ultimi 7 giorni · ${dateLabel}</p>
    </td>
  </tr>

  <!-- body -->
  <tr><td style="padding:24px 28px;">

    <!-- ── PESO ── -->
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BASE};border-bottom:2px solid ${ACCENT};padding-bottom:6px;">⚖️ Peso</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;margin-right:6px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Peso attuale</div>
            <div style="font-size:26px;font-weight:800;color:${BASE};font-variant-numeric:tabular-nums;">${fmt(weight.current, " kg")}${trendArrow(weight.delta7d)}</div>
            <div style="font-size:13px;color:#555;margin-top:4px;">Δ 7 giorni: <strong>${fmtDelta(weight.delta7d)}</strong></div>
            ${targetRow}
          </div>
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;margin-left:6px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Media 7 giorni</div>
            <div style="font-size:26px;font-weight:800;color:${BASE};font-variant-numeric:tabular-nums;">${fmt(weight.avg7d, " kg")}</div>
          </div>
        </td>
      </tr>
    </table>
    ${weight.entries.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-radius:6px;overflow:hidden;border:1px solid #f0f0f0;">
      <tr style="background:#f8f9fb;">
        <th style="padding:6px 8px;font-size:11px;text-align:left;color:#888;font-weight:600;text-transform:uppercase;">Data</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Peso</th>
      </tr>
      ${weightRows}
    </table>` : `<p style="color:#888;font-size:13px;margin:0 0 24px;">Nessun dato peso negli ultimi 7 giorni.</p>`}

    <!-- ── HRV ── -->
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BASE};border-bottom:2px solid ${ACCENT};padding-bottom:6px;">💜 HRV (Heart Rate Variability)</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:33%;vertical-align:top;padding-right:6px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Media 7 giorni</div>
            <div style="font-size:24px;font-weight:800;color:${BASE};">${fmt(hrv.avg7d, " ms")}</div>
          </div>
        </td>
        <td style="width:33%;vertical-align:top;padding:0 3px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Ultima notte</div>
            <div style="font-size:24px;font-weight:800;color:${BASE};">${fmt(hrv.latest, " ms")}</div>
            ${hrv.latestDate ? `<div style="font-size:11px;color:#aaa;margin-top:2px;">${hrv.latestDate}</div>` : ""}
          </div>
        </td>
        <td style="width:33%;vertical-align:top;padding-left:6px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Status Garmin</div>
            <div style="font-size:14px;font-weight:700;color:${statusColor(hrv.latestStatus)};margin-top:6px;">${hrv.latestStatus ?? "—"}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- ── FC RIPOSO ── -->
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BASE};border-bottom:2px solid ${ACCENT};padding-bottom:6px;">❤️ FC a Riposo</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:33%;vertical-align:top;padding-right:6px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Media 7 giorni</div>
            <div style="font-size:24px;font-weight:800;color:${BASE};">${fmt(restHr.avg7d, " bpm")}</div>
          </div>
        </td>
        <td style="width:33%;vertical-align:top;padding:0 3px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Minimo</div>
            <div style="font-size:24px;font-weight:800;color:#10B981;">${fmt(restHr.min7d, " bpm")}</div>
          </div>
        </td>
        <td style="width:33%;vertical-align:top;padding-left:6px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Massimo</div>
            <div style="font-size:24px;font-weight:800;color:#EF4444;">${fmt(restHr.max7d, " bpm")}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- ── SONNO ── -->
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BASE};border-bottom:2px solid ${ACCENT};padding-bottom:6px;">😴 Sonno</h2>
    ${sleep.entries.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="width:25%;vertical-align:top;padding-right:4px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Durata media</div>
            <div style="font-size:22px;font-weight:800;color:${BASE};">${fmtSleepDuration(sleep.avgDurationSec)}</div>
          </div>
        </td>
        <td style="width:25%;vertical-align:top;padding:0 4px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Score medio</div>
            <div style="font-size:22px;font-weight:800;color:${sleepScoreColor(sleep.avgScore)};">${fmt(sleep.avgScore)}</div>
          </div>
        </td>
        <td style="width:25%;vertical-align:top;padding:0 4px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">Deep sleep</div>
            <div style="font-size:22px;font-weight:800;color:#3B82F6;">${fmt(sleep.avgDeepPct, "%")}</div>
          </div>
        </td>
        <td style="width:25%;vertical-align:top;padding-left:4px;">
          <div style="background:#f8f9fb;border-radius:8px;padding:12px 16px;">
            <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px;">REM</div>
            <div style="font-size:22px;font-weight:800;color:#8B5CF6;">${fmt(sleep.avgRemPct, "%")}</div>
          </div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-radius:6px;overflow:hidden;border:1px solid #f0f0f0;">
      <tr style="background:#f8f9fb;">
        <th style="padding:6px 8px;font-size:11px;text-align:left;color:#888;font-weight:600;text-transform:uppercase;">Data</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Durata</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Score</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Deep</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">REM</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Leggero</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Risvegli</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Qualità</th>
      </tr>
      ${sleep.entries
        .slice()
        .reverse()
        .map(
          (e) => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;">${e.date}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;">${fmtSleepDuration(e.durationSec)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;color:${sleepScoreColor(e.score)};">${fmt(e.score)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${e.deepSec !== null && e.durationSec ? Math.round(e.deepSec / e.durationSec * 100) + "%" : "—"}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${e.remSec !== null && e.durationSec ? Math.round(e.remSec / e.durationSec * 100) + "%" : "—"}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${e.lightSec !== null && e.durationSec ? Math.round(e.lightSec / e.durationSec * 100) + "%" : "—"}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${fmt(e.awakenings)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${fmt(e.perceivedQuality)}</td>
      </tr>`
        )
        .join("")}
    </table>` : `<p style="color:#888;font-size:13px;margin:0 0 24px;">Nessun dato sonno negli ultimi 7 giorni.</p>`}

    <!-- ── ATTIVITÀ STRAVA ── -->
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BASE};border-bottom:2px solid ${ACCENT};padding-bottom:6px;">🏃 Corse (ultimi 7 giorni)</h2>
    ${activities.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;border:1px solid #f0f0f0;">
      <tr style="background:#f8f9fb;">
        <th style="padding:6px 8px;font-size:11px;text-align:left;color:#888;font-weight:600;text-transform:uppercase;">Data</th>
        <th style="padding:6px 8px;font-size:11px;text-align:left;color:#888;font-weight:600;text-transform:uppercase;">Nome</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Dist.</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Tempo</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">Passo</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">D+</th>
        <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-weight:600;text-transform:uppercase;">FC med</th>
      </tr>
      ${activityRows}
    </table>` : noActivities}

  </td></tr>

  <!-- footer -->
  <tr>
    <td style="background:#f8f9fb;padding:16px 28px;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">
        Report generato automaticamente da <strong>Code &amp; Run</strong> · apps.codeandrun.it
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildReportSubject(data: ReportData): string {
  const w = data.weight.current;
  const wStr = w !== null ? ` · ${w} kg` : "";
  const d = data.generatedAt.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
  return `[Code & Run] Riepilogo settimanale ${d}${wStr}`;
}
