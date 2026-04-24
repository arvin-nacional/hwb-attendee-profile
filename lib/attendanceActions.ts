"use server";

import { connectDB } from "@/lib/mongodb";
import { AttendanceModel } from "@/lib/models/Attendance";
import { getAttendeeByToken, getAllAttendees } from "@/lib/actions";
import {
  getAccessibleEventIds,
  type Attendee,
  type AttendeePackage,
  type PaymentStatus,
} from "@/lib/data";

export interface AttendanceRecord {
  attendeeId: string;
  attendeeName: string;
  checkedInAt: string;
}

export interface ScanResult {
  attendeeId: string;
  attendee: Attendee;
  token: string;
  hasAccess: boolean;
  alreadyCheckedIn: boolean;
}

export async function scanToken(
  token: string,
  eventId: string
): Promise<{ success: boolean; result?: ScanResult; error?: string }> {
  const found = await getAttendeeByToken(token);
  if (!found) {
    return { success: false, error: "Invalid or unrecognized QR code." };
  }

  const { id: attendeeId, attendee } = found;
  const accessibleIds = getAccessibleEventIds(attendee);
  const hasAccess = accessibleIds.includes(eventId);

  let alreadyCheckedIn = false;
  try {
    await connectDB();
    const existing = await AttendanceModel.findOne({ attendeeId, eventId }).lean();
    alreadyCheckedIn = !!existing;
  } catch (error) {
    console.error("Failed to check attendance status:", error);
  }

  return {
    success: true,
    result: { attendeeId, attendee, token, hasAccess, alreadyCheckedIn },
  };
}

export async function recordAttendance(
  attendeeId: string,
  attendeeName: string,
  eventId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await connectDB();
    await AttendanceModel.create({ attendeeId, attendeeName, eventId });
    return { success: true, message: "Check-in recorded." };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return { success: false, message: "Attendee already checked in for this event." };
    }
    console.error("Failed to record attendance:", error);
    return { success: false, message: "Failed to record check-in." };
  }
}

export async function getEventAttendance(
  eventId: string
): Promise<AttendanceRecord[]> {
  try {
    await connectDB();
    const records = await AttendanceModel.find({ eventId })
      .sort({ checkedInAt: -1 })
      .lean();
    return records.map((r) => ({
      attendeeId: r.attendeeId,
      attendeeName: r.attendeeName,
      checkedInAt: new Date(r.checkedInAt).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }),
    }));
  } catch (error) {
    console.error("Failed to fetch attendance:", error);
    return [];
  }
}

export interface NonAttendeeRecord {
  attendeeId: string;
  attendeeName: string;
  package: string;
}

export async function getNonAttendees(eventId: string): Promise<NonAttendeeRecord[]> {
  const attendees = await getAllAttendees();
  const eligible = attendees.filter(({ attendee }) =>
    getAccessibleEventIds(attendee).includes(eventId)
  );

  let checkedInIds = new Set<string>();
  try {
    await connectDB();
    const records = await AttendanceModel.find({ eventId }).select("attendeeId").lean();
    checkedInIds = new Set(records.map((r) => r.attendeeId));
  } catch (error) {
    console.error("Failed to fetch attendance for non-attendees:", error);
  }

  return eligible
    .filter(({ id }) => !checkedInIds.has(id))
    .map(({ id, attendee }) => ({
      attendeeId: id,
      attendeeName: attendee.name,
      package: attendee.package,
    }))
    .sort((a, b) => a.attendeeName.localeCompare(b.attendeeName));
}

export interface EventReportAttendee {
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  package: AttendeePackage;
  paymentStatus: PaymentStatus;
  balance: number;
  checkedInAt: string | null;
}

export interface EventReport {
  eventId: string;
  attended: EventReportAttendee[];
  notAttended: EventReportAttendee[];
}

export async function getEventReport(eventId: string): Promise<EventReport> {
  const attendees = await getAllAttendees();
  const eligible = attendees.filter(({ attendee }) =>
    getAccessibleEventIds(attendee).includes(eventId)
  );

  const checkInMap = new Map<string, Date>();
  try {
    await connectDB();
    const records = await AttendanceModel.find({ eventId })
      .select("attendeeId checkedInAt")
      .lean();
    for (const r of records) {
      checkInMap.set(r.attendeeId, new Date(r.checkedInAt));
    }
  } catch (error) {
    console.error("Failed to fetch attendance for report:", error);
  }

  const formatCheckIn = (d: Date): string =>
    d.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const attended: EventReportAttendee[] = [];
  const notAttended: EventReportAttendee[] = [];

  for (const { id, attendee } of eligible) {
    const checkedInDate = checkInMap.get(id);
    const entry: EventReportAttendee = {
      attendeeId: id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone ?? "",
      package: attendee.package,
      paymentStatus: attendee.paymentStatus,
      balance: attendee.balance ?? 0,
      checkedInAt: checkedInDate ? formatCheckIn(checkedInDate) : null,
    };
    if (checkedInDate) {
      attended.push(entry);
    } else {
      notAttended.push(entry);
    }
  }

  // Attended: sort by check-in time descending (latest first)
  attended.sort((a, b) => (b.checkedInAt ?? "").localeCompare(a.checkedInAt ?? ""));
  notAttended.sort((a, b) => a.name.localeCompare(b.name));

  return { eventId, attended, notAttended };
}

export async function getAttendeeAttendance(
  attendeeId: string
): Promise<Record<string, string>> {
  try {
    await connectDB();
    const records = await AttendanceModel.find({ attendeeId })
      .select("eventId checkedInAt")
      .lean();
    const map: Record<string, string> = {};
    for (const r of records) {
      map[r.eventId] = new Date(r.checkedInAt).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return map;
  } catch (error) {
    console.error("Failed to fetch attendee attendance:", error);
    return {};
  }
}

export async function getExpectedCounts(): Promise<Record<string, number>> {
  const attendees = await getAllAttendees();
  const counts: Record<string, number> = {};
  for (const { attendee } of attendees) {
    for (const eventId of getAccessibleEventIds(attendee)) {
      counts[eventId] = (counts[eventId] ?? 0) + 1;
    }
  }
  return counts;
}

export async function removeAttendance(
  attendeeId: string,
  eventId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await connectDB();
    await AttendanceModel.deleteOne({ attendeeId, eventId });
    return { success: true, message: "Check-in removed." };
  } catch (error) {
    console.error("Failed to remove attendance:", error);
    return { success: false, message: "Failed to remove check-in." };
  }
}
