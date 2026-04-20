"use server";

import { connectDB } from "@/lib/mongodb";
import { AttendanceModel } from "@/lib/models/Attendance";
import { getAttendeeByToken, getAllAttendees } from "@/lib/actions";
import { getAccessibleEventIds, type Attendee } from "@/lib/data";

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
      .sort({ checkedInAt: 1 })
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
