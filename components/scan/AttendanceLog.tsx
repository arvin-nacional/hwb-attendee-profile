"use client";

import { useEffect, useState, useCallback } from "react";
import { FaUserCheck, FaTrash, FaSyncAlt } from "react-icons/fa";
import { getEventAttendance, removeAttendance } from "@/lib/attendanceActions";
import type { AttendanceRecord } from "@/lib/attendanceActions";

interface Props {
  eventId: string;
  eventName: string;
  refreshTrigger?: number;
  expectedCount?: number;
}

export function AttendanceLog({ eventId, eventName, refreshTrigger, expectedCount }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const data = await getEventAttendance(eventId);
    setRecords(data);
    setRefreshing(false);
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    getEventAttendance(eventId).then((data) => {
      if (!cancelled) setRecords(data);
    });
    return () => { cancelled = true; };
  }, [eventId, refreshTrigger]);

  const handleRemove = async (attendeeId: string) => {
    await removeAttendance(attendeeId, eventId);
    load();
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaUserCheck className="text-[var(--maroon)]" />
          <span className="font-semibold text-gray-800 text-sm">
            Checked In — {eventName}
          </span>
          <span className="bg-[var(--maroon)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {records.length}{expectedCount !== undefined ? `/${expectedCount}` : ""}
          </span>
        </div>
        <button
          onClick={load}
          className="text-[var(--gray)] hover:text-[var(--maroon)] transition-colors text-sm"
          title="Refresh"
        >
          <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {refreshing && (
        <div className="px-6 py-8 text-center text-sm text-[var(--gray)]">
          Loading...
        </div>
      )}

      {!refreshing && records.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-[var(--gray)]">
          No attendees checked in yet.
        </div>
      )}

      {!refreshing && records.length > 0 && (
        <ul>
          {records.map((r, i) => (
            <li
              key={r.attendeeId}
              className={`flex items-center px-6 py-3 gap-4 border-b border-gray-50 last:border-b-0 ${
                i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {r.attendeeName}
                </div>
                <div className="text-xs text-[var(--gray)]">
                  {r.attendeeId} · {r.checkedInAt}
                </div>
              </div>
              <button
                onClick={() => handleRemove(r.attendeeId)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove check-in"
              >
                <FaTrash className="text-xs" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
