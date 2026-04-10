import { NextResponse } from "next/server";
import { auth as getAuth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { isWordPressUser } from "@/lib/wordpress-auth";
import {
  getMonthlyStats,
  getKudosPerYear,
  getPersonalRecords,
  computeYearTotals,
  buildChartData,
  type PersonalRecord,
} from "@/lib/strava/stats";

function formatMovingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(distanceMeters: number, seconds: number): string {
  const paceSecPerKm = (seconds / distanceMeters) * 1000;
  const pm = Math.floor(paceSecPerKm / 60);
  const ps = Math.round(paceSecPerKm % 60);
  return `${pm}:${String(ps).padStart(2, "0")}/km`;
}

function buildGoogleChartsHtml(
  header: string[],
  rows: (string | number | null)[][],
  years: number[]
): string {
  const dataRows = rows
    .map((row) => {
      const values = row
        .slice(1)
        .map((v) => (v === null ? "null" : v))
        .join(", ");
      return `      ['${row[0]}', ${values}]`;
    })
    .join(",\n");

  const colors = [
    "#FC4C02", "#1E3A8A", "#10B981", "#3B82F6", "#FF7A3D", "#6366F1", "#F59E0B",
  ];

  const defaultHidden = new Set(years.slice(0, Math.max(0, years.length - 4)));
  const buttonsHtml = years
    .map((year, i) => {
      const color = colors[i % colors.length];
      const isHidden = defaultHidden.has(year);
      const bg = isHidden ? "transparent" : color;
      const fg = isHidden ? color : "#fff";
      return `<button id="btn-year-${year}" onclick="toggleYear(${i})" style="margin:0 4px 8px 0;padding:4px 14px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;border:2px solid ${color};background:${bg};color:${fg};transition:all 0.15s">${year}</button>`;
    })
    .join("\n");

  return `<div style="margin-bottom:4px">${buttonsHtml}</div>
<div id="running-stats-chart" style="width:100%;height:400px"></div>
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script type="text/javascript">
  var _years = ${JSON.stringify(years)};
  var _colors = ${JSON.stringify(colors)};
  var _hidden = {};
  _years.forEach(function(year, i) { if (i < _years.length - 4) _hidden[i] = true; });
  var _chart, _data;

  google.charts.load('current', {'packages':['corechart']});
  google.charts.setOnLoadCallback(function() {
    _data = google.visualization.arrayToDataTable([
      ${JSON.stringify(header)},
${dataRows}
    ]);
    _chart = new google.visualization.LineChart(document.getElementById('running-stats-chart'));
    drawChart();
  });

  function drawChart() {
    var visibleCols = [0];
    var seriesOpt = {};
    var si = 0;
    _years.forEach(function(year, i) {
      if (!_hidden[i]) {
        visibleCols.push(i + 1);
        seriesOpt[si] = { color: _colors[i % _colors.length], lineWidth: 2 };
        si++;
      }
    });
    var view = new google.visualization.DataView(_data);
    view.setColumns(visibleCols);
    _chart.draw(view, {
      title: 'Km cumulativi per anno',
      curveType: 'function',
      legend: { position: 'bottom' },
      chartArea: { width: '85%', height: '75%' },
      series: seriesOpt,
      hAxis: { textStyle: { fontSize: 12 } },
      vAxis: { textStyle: { fontSize: 12 } }
    });
  }

  function toggleYear(i) {
    var visibleCount = _years.filter(function(year, k) { return !_hidden[k]; }).length;
    if (!_hidden[i]) { if (visibleCount === 1) return; }
    _hidden[i] = !_hidden[i];
    var btn = document.getElementById('btn-year-' + _years[i]);
    var color = _colors[i % _colors.length];
    btn.style.background = _hidden[i] ? 'transparent' : color;
    btn.style.color = _hidden[i] ? color : '#fff';
    drawChart();
  }
</script>`;
}

const S = {
  wrap: `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;`,
  table: `width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);`,
  th: `padding:10px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;`,
  thR: `padding:10px 16px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;`,
  td: `padding:11px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;`,
  tdR: `padding:11px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;font-variant-numeric:tabular-nums;`,
  tdMuted: `padding:11px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:right;font-variant-numeric:tabular-nums;`,
  yearBold: `font-weight:700;font-size:15px;`,
  yearCurrent: `font-weight:700;font-size:15px;color:#FC4C02;`,
  badge: `display:inline-block;margin-left:6px;font-size:10px;font-weight:600;background:#FC4C02;color:#fff;padding:1px 6px;border-radius:99px;vertical-align:middle;`,
  kmBold: `font-weight:600;`,
  prCard: `display:inline-block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;min-width:120px;text-align:center;`,
  prGrid: `display:flex;flex-wrap:wrap;gap:12px;margin-bottom:0;`,
  prLabel: `font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:4px;`,
  prTime: `font-size:22px;font-weight:700;color:#111827;line-height:1.2;`,
  prPace: `font-size:12px;color:#FC4C02;font-weight:600;margin-top:2px;`,
  prDate: `font-size:11px;color:#9ca3af;margin-top:2px;`,
};

function buildStatsTableHtml(
  yearTotals: { year: number; total_distance: number; elevation: number; count: number; total_moving: number; kudos: number }[]
): string {
  const currentYear = new Date().getFullYear();

  const rows = yearTotals.map((y) => {
    const isCurrent = y.year === currentYear;
    const yearCell = isCurrent
      ? `<span style="${S.yearCurrent}">${y.year}<span style="${S.badge}">in corso</span></span>`
      : `<span style="${S.yearBold}">${y.year}</span>`;
    return `<tr>
  <td style="${S.td}">${yearCell}</td>
  <td style="${S.tdR}"><span style="${S.kmBold}">${(y.total_distance / 1000).toFixed(0)}</span> <span style="color:#9ca3af;font-size:12px;">km</span></td>
  <td style="${S.tdR}">${y.elevation.toFixed(0)} <span style="color:#9ca3af;font-size:12px;">m</span></td>
  <td style="${S.tdR}">${y.count}</td>
  <td style="${S.tdMuted}">${formatMovingTime(y.total_moving)}</td>
  <td style="${S.tdMuted}">${y.kudos}</td>
</tr>`;
  }).join("\n");

  return `<div style="${S.wrap}">
<table style="${S.table}">
<thead><tr>
  <th style="${S.th}">Anno</th>
  <th style="${S.thR}">Distanza</th>
  <th style="${S.thR}">Dislivello</th>
  <th style="${S.thR}">Attività</th>
  <th style="${S.thR}">Tempo</th>
  <th style="${S.thR}">Kudos</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>`;
}

const FEATURED_PR = ["5k", "10k", "15k", "Half-Marathon", "30k", "Marathon"];

function buildPersonalRecordsHtml(records: PersonalRecord[]): string {
  if (!records.length) return "";

  const featured = records.filter((r) => FEATURED_PR.includes(r.name));
  const rest = records.filter((r) => !FEATURED_PR.includes(r.name));

  const featuredCards = featured.map((pr) => {
    const date = new Date(pr.startDate).toLocaleDateString("it-IT", {
      day: "numeric", month: "short", year: "numeric",
    });
    return `<div style="${S.prCard}">
  <div style="${S.prLabel}">${pr.name}</div>
  <div style="${S.prTime}">${formatTime(pr.elapsedTime)}</div>
  <div style="${S.prPace}">${formatPace(pr.distanceMeters, pr.elapsedTime)}</div>
  <div style="${S.prDate}">${date}</div>
</div>`;
  }).join("\n");

  const restRows = rest.map((pr) => {
    const date = new Date(pr.startDate).toLocaleDateString("it-IT", {
      day: "numeric", month: "short", year: "numeric",
    });
    return `<tr>
  <td style="${S.td}">${pr.name}</td>
  <td style="${S.tdR}"><span style="${S.kmBold}">${formatTime(pr.elapsedTime)}</span></td>
  <td style="${S.tdMuted}">${formatPace(pr.distanceMeters, pr.elapsedTime)}</td>
  <td style="${S.tdMuted}">${date}</td>
</tr>`;
  }).join("\n");

  const restTable = rest.length ? `
<table style="${S.table};margin-top:12px;">
<thead><tr>
  <th style="${S.th}">Distanza</th>
  <th style="${S.thR}">Tempo</th>
  <th style="${S.thR}">Passo</th>
  <th style="${S.thR}">Data</th>
</tr></thead>
<tbody>
${restRows}
</tbody>
</table>` : "";

  return `<div style="${S.wrap}">
<div style="${S.prGrid}">
${featuredCards}
</div>${restTable}
</div>`;
}

function wrapInGutenbergHtml(html: string): string {
  return `<!-- wp:html -->\n${html}\n<!-- /wp:html -->`;
}

export async function POST() {
  const session = await getAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wpUrl = process.env.WP_SITE_URL;
  const wpUser = process.env.WP_USERNAME;
  const wpPass = process.env.WP_APP_PASSWORD;
  const pageId = process.env.WP_RUNNING_PAGE_ID;

  if (!wpUrl || !wpUser || !wpPass || !pageId) {
    return NextResponse.json(
      { error: "WordPress not configured (WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD, WP_RUNNING_PAGE_ID)" },
      { status: 500 }
    );
  }

  await connectDB();

  const [monthlyData, kudosData, prData] = await Promise.all([
    getMonthlyStats(session.user.id),
    getKudosPerYear(session.user.id),
    getPersonalRecords(session.user.id),
  ]);

  const yearTotals = computeYearTotals(monthlyData, kudosData);
  const { header, rows, years } = buildChartData(monthlyData);

  const chartHtml = buildGoogleChartsHtml(header, rows, years);
  const tableHtml = buildStatsTableHtml(yearTotals);
  const prHtml = buildPersonalRecordsHtml(prData);
  const updateDate = new Date().toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });

  const blocks = [
    wrapInGutenbergHtml(`<p style="font-size:13px;color:#9ca3af;margin:0 0 8px;"><em>Aggiornato il ${updateDate}</em></p>`),
  ];
  if (prHtml) blocks.push(wrapInGutenbergHtml(prHtml));
  blocks.push(wrapInGutenbergHtml(chartHtml));
  blocks.push(wrapInGutenbergHtml(tableHtml));

  const content = blocks.join("\n\n");

  const basicAuth = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");

  const res = await fetch(`${wpUrl}/wp-json/wp/v2/pages/${pageId}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `WordPress API error: ${err}` }, { status: 502 });
  }

  const page = await res.json();
  return NextResponse.json({ ok: true, pageUrl: page.link });
}
