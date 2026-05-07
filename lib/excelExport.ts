import * as XLSX from "xlsx";
import {
  type Attendee,
  type AttendeePackage,
  type PaymentStatus,
  type DiscountType,
  type HWBEvent,
  events,
  packageLabels,
  packageShortNames,
  paymentStatusLabels,
  discountTypeLabels,
  scheduleOptions,
  getAccessibleEventIds,
} from "@/lib/data";
import type { EventReport, EventReportAttendee } from "@/lib/attendanceActions";
import type { FeedbackResponse } from "@/lib/feedback";
import {
  SPEAKERS,
  EVENT_EXPERIENCE_ITEMS,
  SERVICE_EXPERIENCE_ITEMS,
  SPEAKER_RATINGS,
  FIVE_POINT_LABELS,
} from "@/lib/feedback";

type AttendeeRecord = { id: string; attendee: Attendee; token: string };

const CURRENCY_FMT = '"₱"#,##0';
const PERCENT_FMT = '0"%"';

function scheduleLabel(value: string | null | undefined): string {
  if (!value) return "";
  return scheduleOptions.find((s) => s.value === value)?.label ?? value;
}

function customEventsLabel(ids: string[] | undefined): string {
  if (!ids || ids.length === 0) return "";
  return ids
    .map((id) => events.find((e) => e.id === id)?.name ?? id)
    .join(", ");
}

function phDate(): string {
  return new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function autoFitColumns(
  rows: Record<string, unknown>[],
  headers: string[]
): { wch: number }[] {
  return headers.map((h) => {
    const maxContent = rows.reduce((max, row) => {
      const v = row[h];
      const len = v == null ? 0 : String(v).length;
      return Math.max(max, len);
    }, h.length);
    return { wch: Math.min(Math.max(maxContent + 2, 10), 50) };
  });
}

function buildSummarySheet(records: AttendeeRecord[]): XLSX.WorkSheet {
  const packageCounts: Record<AttendeePackage, number> = {
    conference: 0,
    "3lectures": 0,
    "5lectures": 0,
    full: 0,
    guest: 0,
    custom: 0,
  };
  const packageRevenue: Record<AttendeePackage, number> = {
    conference: 0,
    "3lectures": 0,
    "5lectures": 0,
    full: 0,
    guest: 0,
    custom: 0,
  };
  const paymentCounts: Record<PaymentStatus, number> = {
    fully_paid: 0,
    downpayment_50: 0,
    partial: 0,
    unpaid: 0,
  };

  let grossTotal = 0;
  let discountTotal = 0;
  let finalTotal = 0;
  let collectedTotal = 0;
  let balanceTotal = 0;

  for (const { attendee } of records) {
    packageCounts[attendee.package] = (packageCounts[attendee.package] ?? 0) + 1;
    packageRevenue[attendee.package] =
      (packageRevenue[attendee.package] ?? 0) + (attendee.finalAmount ?? 0);
    paymentCounts[attendee.paymentStatus] =
      (paymentCounts[attendee.paymentStatus] ?? 0) + 1;
    grossTotal += attendee.originalAmount ?? 0;
    discountTotal += (attendee.originalAmount ?? 0) - (attendee.finalAmount ?? 0);
    finalTotal += attendee.finalAmount ?? 0;
    collectedTotal += (attendee.finalAmount ?? 0) - (attendee.balance ?? 0);
    balanceTotal += attendee.balance ?? 0;
  }

  const aoa: (string | number)[][] = [
    ["HWB 2026 — Attendee Report"],
    [`Generated: ${phDate()} (Asia/Manila)`],
    [],
    ["Total Attendees", records.length],
    [],
    ["Breakdown by Package"],
    ["Package", "Count", "Revenue (Final)"],
  ];

  (Object.keys(packageCounts) as AttendeePackage[]).forEach((pkg) => {
    aoa.push([packageLabels[pkg], packageCounts[pkg], packageRevenue[pkg]]);
  });

  aoa.push([]);
  aoa.push(["Breakdown by Payment Status"]);
  aoa.push(["Status", "Count"]);
  (Object.keys(paymentCounts) as PaymentStatus[]).forEach((ps) => {
    aoa.push([paymentStatusLabels[ps], paymentCounts[ps]]);
  });

  aoa.push([]);
  aoa.push(["Financial Summary"]);
  aoa.push(["Gross (Before Discounts)", grossTotal]);
  aoa.push(["Total Discounts", discountTotal]);
  aoa.push(["Final Amount Due", finalTotal]);
  aoa.push(["Collected", collectedTotal]);
  aoa.push(["Outstanding Balance", balanceTotal]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge title row across 3 columns
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  // Column widths
  ws["!cols"] = [{ wch: 42 }, { wch: 14 }, { wch: 18 }];

  // Currency formatting for revenue/financial cells
  const currencyCells: string[] = [];
  // Package revenue column C starts at row index 7 (1-based row 8)
  for (let i = 0; i < 6; i++) {
    currencyCells.push(XLSX.utils.encode_cell({ r: 7 + i, c: 2 }));
  }
  // Financial summary rows — find them dynamically
  for (let r = 0; r < aoa.length; r++) {
    const label = aoa[r]?.[0];
    if (
      label === "Gross (Before Discounts)" ||
      label === "Total Discounts" ||
      label === "Final Amount Due" ||
      label === "Collected" ||
      label === "Outstanding Balance"
    ) {
      currencyCells.push(XLSX.utils.encode_cell({ r, c: 1 }));
    }
  }
  currencyCells.forEach((addr) => {
    if (ws[addr] && typeof ws[addr].v === "number") {
      ws[addr].z = CURRENCY_FMT;
    }
  });

  return ws;
}

function buildAttendeesSheet(records: AttendeeRecord[]): XLSX.WorkSheet {
  const rows = records.map(({ id, attendee }, i) => ({
    "#": i + 1,
    "Attendee ID": id,
    "Name": attendee.name,
    "Email": attendee.email,
    "Phone": attendee.phone ?? "",
    "Package": packageShortNames[attendee.package],
    "Package (Full)": packageLabels[attendee.package],
    "Schedule": scheduleLabel(attendee.selectedSchedule),
    "Custom Events":
      attendee.package === "custom"
        ? customEventsLabel(attendee.customEventIds)
        : "",
    "Payment Status": paymentStatusLabels[attendee.paymentStatus],
    "Discount Type": discountTypeLabels[attendee.discountType as DiscountType] ?? "",
    "Discount %": attendee.discountPercent ?? 0,
    "Original Amount": attendee.originalAmount ?? 0,
    "Final Amount": attendee.finalAmount ?? 0,
    "Amount Paid": (attendee.finalAmount ?? 0) - (attendee.balance ?? 0),
    "Balance": attendee.balance ?? 0,
    "Registration Date": attendee.registrationDate,
    "Notes": attendee.notes ?? "",
  }));

  const headers = Object.keys(rows[0] ?? { "#": "" });
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  ws["!cols"] = autoFitColumns(
    rows as unknown as Record<string, unknown>[],
    headers
  );

  // Apply number formats to currency/percent columns
  const currencyColumns = [
    "Original Amount",
    "Final Amount",
    "Amount Paid",
    "Balance",
  ];
  const percentColumns = ["Discount %"];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let R = 1; R <= range.e.r; R++) {
    headers.forEach((h, cIdx) => {
      const addr = XLSX.utils.encode_cell({ r: R, c: cIdx });
      if (!ws[addr]) return;
      if (currencyColumns.includes(h)) ws[addr].z = CURRENCY_FMT;
      if (percentColumns.includes(h)) ws[addr].z = PERCENT_FMT;
    });
  }

  return ws;
}

function buildByEventSheet(records: AttendeeRecord[]): XLSX.WorkSheet {
  const aoa: (string | number)[][] = [];

  events.forEach((event, idx) => {
    const eligible = records.filter(({ attendee }) =>
      getAccessibleEventIds(attendee).includes(event.id)
    );

    if (idx > 0) aoa.push([]);

    aoa.push([`${event.name}`]);
    aoa.push([`${event.date} · ${event.time} · ${event.venue}`]);
    aoa.push([`Eligible Attendees: ${eligible.length}`]);
    aoa.push([]);
    aoa.push(["#", "Attendee ID", "Name", "Email", "Package", "Payment Status"]);

    eligible
      .sort((a, b) => a.attendee.name.localeCompare(b.attendee.name))
      .forEach(({ id, attendee }, i) => {
        aoa.push([
          i + 1,
          id,
          attendee.name,
          attendee.email,
          packageShortNames[attendee.package],
          paymentStatusLabels[attendee.paymentStatus],
        ]);
      });
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 28 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
  ];

  return ws;
}

export function downloadAttendeesExcel(records: AttendeeRecord[]): void {
  if (records.length === 0) return;

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(records), "Summary");
  XLSX.utils.book_append_sheet(wb, buildAttendeesSheet(records), "Attendees");
  XLSX.utils.book_append_sheet(wb, buildByEventSheet(records), "By Event");

  const stamp = new Date()
    .toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/[\/:,\s]+/g, "-");

  XLSX.writeFile(wb, `HWB-2026-Attendees_${stamp}.xlsx`);
}

// ─── Per-event attendance report ───────────────────────────────────────────

function sanitizeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_");
}

function buildEventSummarySheet(
  event: HWBEvent,
  report: EventReport
): XLSX.WorkSheet {
  const total = report.attended.length + report.notAttended.length;
  const attendedCount = report.attended.length;
  const pct = total > 0 ? (attendedCount / total) * 100 : 0;

  // Package breakdown (attended vs not)
  const packageStats: Record<AttendeePackage, { attended: number; notAttended: number }> = {
    conference: { attended: 0, notAttended: 0 },
    "3lectures": { attended: 0, notAttended: 0 },
    "5lectures": { attended: 0, notAttended: 0 },
    full: { attended: 0, notAttended: 0 },
    guest: { attended: 0, notAttended: 0 },
    custom: { attended: 0, notAttended: 0 },
  };
  for (const a of report.attended) packageStats[a.package].attended++;
  for (const a of report.notAttended) packageStats[a.package].notAttended++;

  const aoa: (string | number)[][] = [
    [`Event Attendance Report — ${event.name}`],
    [`${event.date} · ${event.time} · ${event.venue}`],
    [`Generated: ${phDate()} (Asia/Manila)`],
    [],
    ["Total Eligible", total],
    ["Attended", attendedCount],
    ["Not Attended", report.notAttended.length],
    ["Attendance Rate", `${pct.toFixed(1)}%`],
    [],
    ["Breakdown by Package"],
    ["Package", "Eligible", "Attended", "Not Attended"],
  ];

  (Object.keys(packageStats) as AttendeePackage[]).forEach((pkg) => {
    const s = packageStats[pkg];
    const eligible = s.attended + s.notAttended;
    if (eligible === 0) return;
    aoa.push([packageLabels[pkg], eligible, s.attended, s.notAttended]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
  ];
  ws["!cols"] = [{ wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

  return ws;
}

function attendedRow(a: EventReportAttendee, i: number): Record<string, string | number> {
  return {
    "#": i + 1,
    "Attendee ID": a.attendeeId,
    "Name": a.name,
    "Package": packageShortNames[a.package],
    "Payment Status": paymentStatusLabels[a.paymentStatus],
    "Email": a.email,
    "Phone": a.phone,
    "Checked In At": a.checkedInAt ?? "",
  };
}

function notAttendedRow(a: EventReportAttendee, i: number): Record<string, string | number> {
  return {
    "#": i + 1,
    "Attendee ID": a.attendeeId,
    "Name": a.name,
    "Package": packageShortNames[a.package],
    "Payment Status": paymentStatusLabels[a.paymentStatus],
    "Balance": a.balance,
    "Email": a.email,
    "Phone": a.phone,
  };
}

function buildAttendedSheet(report: EventReport): XLSX.WorkSheet {
  const rows =
    report.attended.length > 0
      ? report.attended.map(attendedRow)
      : [
          {
            "#": "",
            "Attendee ID": "",
            "Name": "(No check-ins yet)",
            "Package": "",
            "Payment Status": "",
            "Email": "",
            "Phone": "",
            "Checked In At": "",
          },
        ];
  const headers = Object.keys(rows[0]);
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = autoFitColumns(
    rows as unknown as Record<string, unknown>[],
    headers
  );
  return ws;
}

function buildNotAttendedSheet(report: EventReport): XLSX.WorkSheet {
  const rows =
    report.notAttended.length > 0
      ? report.notAttended.map(notAttendedRow)
      : [
          {
            "#": "",
            "Attendee ID": "",
            "Name": "(Everyone has checked in)",
            "Package": "",
            "Payment Status": "",
            "Balance": "",
            "Email": "",
            "Phone": "",
          },
        ];
  const headers = Object.keys(rows[0]);
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = autoFitColumns(
    rows as unknown as Record<string, unknown>[],
    headers
  );

  // Currency format for Balance column
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const balanceCol = headers.indexOf("Balance");
  if (balanceCol >= 0) {
    for (let R = 1; R <= range.e.r; R++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: balanceCol });
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].z = CURRENCY_FMT;
      }
    }
  }

  return ws;
}

export function downloadEventReportExcel(
  event: HWBEvent,
  report: EventReport
): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildEventSummarySheet(event, report), "Summary");
  XLSX.utils.book_append_sheet(wb, buildAttendedSheet(report), "Attended");
  XLSX.utils.book_append_sheet(wb, buildNotAttendedSheet(report), "Not Attended");

  const stamp = new Date()
    .toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/[\/:,\s]+/g, "-");

  const eventSlug = sanitizeFilename(event.id.toUpperCase());
  XLSX.writeFile(wb, `HWB-2026-${eventSlug}-Attendance_${stamp}.xlsx`);
}

// ─── Feedback Responses Export ─────────────────────────────────────────────

function speakerRatingLabel(value: string): string {
  return SPEAKER_RATINGS.find((r) => r.value === value)?.label ?? value;
}

function fivePointLabel(value: number): string {
  return value > 0 ? `${value} — ${FIVE_POINT_LABELS[value] ?? ""}` : "";
}

function fmtSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildFeedbackResponsesSheet(
  responses: FeedbackResponse[]
): XLSX.WorkSheet {
  const rows = responses.map((r, i) => {
    const row: Record<string, string | number> = {
      "#": i + 1,
      "Attendee ID": r.attendeeId,
      "Submitted At": fmtSubmittedAt(r.submittedAt),
      "Name": r.name,
      "Field of Work": r.fieldOfWork === "Other" ? `Other: ${r.fieldOfWorkOther}` : r.fieldOfWork,
      "Occupation / Role": r.occupationRole,
      "Affiliation": r.affiliation,
      "Heard About": r.hearAbout === "Other" ? `Other: ${r.hearAboutOther}` : r.hearAbout,
      "Package Availed": r.packageAvailed,
    };
    for (const s of SPEAKERS) {
      row[`Speaker — ${s.name}`] = speakerRatingLabel(r.speakerRatings[s.id] ?? "");
    }
    row["Speaker Comments"] = r.speakerComments;
    row["Conference Topics (1-5)"] = fivePointLabel(r.conferenceTopicsRating);
    for (const item of EVENT_EXPERIENCE_ITEMS) {
      row[`Event — ${item.label}`] = fivePointLabel(r.eventExperience[item.id] ?? 0);
    }
    for (const item of SERVICE_EXPERIENCE_ITEMS) {
      row[`Service — ${item.label}`] = fivePointLabel(r.serviceExperience[item.id] ?? 0);
    }
    row["Overall Experience (1-5)"] = fivePointLabel(r.overallExperience);
    row["Improvements"] = r.improvements;
    return row;
  });

  if (rows.length === 0) {
    const emptyRow: Record<string, string | number> = {
      "#": "",
      "Attendee ID": "",
      "Submitted At": "",
      "Name": "(No feedback submitted yet)",
    };
    const ws = XLSX.utils.json_to_sheet([emptyRow]);
    ws["!cols"] = [{ wch: 4 }, { wch: 15 }, { wch: 18 }, { wch: 30 }];
    return ws;
  }

  const headers = Object.keys(rows[0]);
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = autoFitColumns(
    rows as unknown as Record<string, unknown>[],
    headers
  );
  return ws;
}

function avg(nums: number[]): number {
  const valid = nums.filter((n) => n > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function speakerScoreToNum(value: string): number {
  // good=1, very_good=2, excellent=3
  if (value === "good") return 1;
  if (value === "very_good") return 2;
  if (value === "excellent") return 3;
  return 0;
}

function buildFeedbackSummarySheet(
  responses: FeedbackResponse[]
): XLSX.WorkSheet {
  const total = responses.length;

  const aoa: (string | number)[][] = [
    ["Heritage Without Borders 2026 — Feedback Summary"],
    [`Generated: ${phDate()} (Asia/Manila)`],
    [],
    ["Total Responses", total],
    [],
  ];

  if (total === 0) {
    aoa.push(["No feedback submitted yet."]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 42 }, { wch: 14 }];
    return ws;
  }

  // Speaker average ratings (1-3 scale)
  aoa.push(["Speaker Ratings (avg 1=Good, 3=Excellent)"]);
  aoa.push(["Speaker", "Average Score", "Distribution"]);
  for (const s of SPEAKERS) {
    const scores = responses.map((r) => speakerScoreToNum(r.speakerRatings[s.id] ?? ""));
    const a = avg(scores);
    const dist: Record<string, number> = { good: 0, very_good: 0, excellent: 0 };
    for (const r of responses) {
      const v = r.speakerRatings[s.id];
      if (v && dist[v] !== undefined) dist[v]++;
    }
    const distStr = `Good: ${dist.good} · Very Good: ${dist.very_good} · Excellent: ${dist.excellent}`;
    aoa.push([s.name, a > 0 ? a.toFixed(2) : "—", distStr]);
  }
  aoa.push([]);

  // Conference topics
  const ctScores = responses.map((r) => r.conferenceTopicsRating);
  aoa.push(["Conference Topics Rating (avg 1-5)", avg(ctScores).toFixed(2)]);
  aoa.push([]);

  // Event experience
  aoa.push(["Event Experience (avg 1-5)"]);
  aoa.push(["Aspect", "Average"]);
  for (const item of EVENT_EXPERIENCE_ITEMS) {
    const scores = responses.map((r) => r.eventExperience[item.id] ?? 0);
    aoa.push([item.label, avg(scores).toFixed(2)]);
  }
  aoa.push([]);

  // Service experience
  aoa.push(["Service Experience (avg 1-5)"]);
  aoa.push(["Service", "Average"]);
  for (const item of SERVICE_EXPERIENCE_ITEMS) {
    const scores = responses.map((r) => r.serviceExperience[item.id] ?? 0);
    aoa.push([item.label, avg(scores).toFixed(2)]);
  }
  aoa.push([]);

  // Overall
  const overall = responses.map((r) => r.overallExperience);
  aoa.push(["Overall Conference Experience (avg 1-5)", avg(overall).toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];
  ws["!cols"] = [{ wch: 42 }, { wch: 14 }, { wch: 50 }];
  return ws;
}

export function downloadFeedbackExcel(responses: FeedbackResponse[]): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildFeedbackSummarySheet(responses), "Summary");
  XLSX.utils.book_append_sheet(wb, buildFeedbackResponsesSheet(responses), "Responses");

  const stamp = new Date()
    .toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/[\/:,\s]+/g, "-");

  XLSX.writeFile(wb, `HWB-2026-Feedback_${stamp}.xlsx`);
}
