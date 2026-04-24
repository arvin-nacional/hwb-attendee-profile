"use client";

import { useEffect, useState, useCallback } from "react";
import { FaUserClock, FaSyncAlt, FaSearch, FaTimes } from "react-icons/fa";
import { getNonAttendees } from "@/lib/attendanceActions";
import type { NonAttendeeRecord } from "@/lib/attendanceActions";
import { packageShortNames, type AttendeePackage } from "@/lib/data";

const LOG_PAGE_SIZE = 15;

interface Props {
  eventId: string;
  eventName: string;
  refreshTrigger?: number;
}

export function NonAttendees({ eventId, eventName, refreshTrigger }: Props) {
  const [records, setRecords] = useState<NonAttendeeRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setRefreshing(true);
    const data = await getNonAttendees(eventId);
    setRecords(data);
    setRefreshing(false);
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    getNonAttendees(eventId).then((data) => {
      if (!cancelled) setRecords(data);
    });
    return () => { cancelled = true; };
  }, [eventId, refreshTrigger]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? records.filter(
        (r) =>
          r.attendeeName.toLowerCase().includes(q) ||
          r.attendeeId.toLowerCase().includes(q)
      )
    : records;
  const totalPages = Math.max(1, Math.ceil(filtered.length / LOG_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * LOG_PAGE_SIZE, safePage * LOG_PAGE_SIZE);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaUserClock className="text-amber-600" />
          <span className="font-semibold text-gray-800 text-sm">
            Not Yet Checked In — {eventName}
          </span>
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {records.length}
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

      {/* Search */}
      {records.length > 0 && (
        <div className="px-4 py-2.5 border-b border-gray-100">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or ID..."
              className="w-full pl-8 pr-8 py-2 text-xs border border-gray-100 rounded-lg outline-none focus:border-[var(--maroon)] transition-colors bg-[#fafafa] placeholder:text-gray-300"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
        </div>
      )}

      {refreshing && (
        <div className="px-6 py-8 text-center text-sm text-[var(--gray)]">
          Loading...
        </div>
      )}

      {!refreshing && records.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-[var(--green)]">
          Everyone has checked in.
        </div>
      )}

      {!refreshing && records.length > 0 && filtered.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-[var(--gray)]">
          No results for &ldquo;{search}&rdquo;.
        </div>
      )}

      {!refreshing && paged.length > 0 && (
        <ul>
          {paged.map((r, i) => (
            <li
              key={r.attendeeId}
              className={`flex items-center px-6 py-3 gap-4 border-b border-gray-50 last:border-b-0 ${
                i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {r.attendeeName}
                </div>
                <div className="text-xs text-[var(--gray)]">
                  {r.attendeeId} · {packageShortNames[r.package as AttendeePackage] ?? r.package}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {!refreshing && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--gray)]">
            {(safePage - 1) * LOG_PAGE_SIZE + 1}–{Math.min(safePage * LOG_PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-300 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 text-xs rounded-lg border transition-colors ${
                      safePage === p
                        ? "bg-[var(--maroon)] text-white border-[var(--maroon)]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
