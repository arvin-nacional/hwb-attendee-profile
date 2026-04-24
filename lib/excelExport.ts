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
