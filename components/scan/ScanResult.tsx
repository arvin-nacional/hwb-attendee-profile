"use client";

import { useState } from "react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaRedo,
  FaUserCheck,
  FaTicketAlt,
  FaStarHalfAlt,
  FaStar,
  FaCrown,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { recordAttendance } from "@/lib/attendanceActions";
import { packageShortNames, type AttendeePackage } from "@/lib/data";
import type { ScanResult as ScanResultType } from "@/lib/attendanceActions";

const packageIcons: Record<AttendeePackage, React.ReactNode> = {
  conference: <FaTicketAlt />,
  "3lectures": <FaStarHalfAlt />,
  "5lectures": <FaStar />,
  full: <FaCrown />,
};

interface Props {
  result: ScanResultType;
  eventName: string;
  eventId: string;
  onReset: () => void;
  onCheckedIn: () => void;
}

export function ScanResult({ result, eventName, eventId, onReset, onCheckedIn }: Props) {
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(result.alreadyCheckedIn);
  const [error, setError] = useState<string | null>(null);

  const { attendee, attendeeId, hasAccess } = result;
  const initials = getInitials(attendee.name);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setError(null);
    const res = await recordAttendance(attendeeId, attendee.name, eventId);
    setCheckingIn(false);
    if (res.success) {
      setCheckedIn(true);
      onCheckedIn();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 overflow-hidden">
      {/* Access Status Banner */}
      <div
        className={`px-6 py-4 flex items-center gap-3 font-semibold text-base ${
          hasAccess
            ? "bg-[var(--green-bg)] text-[var(--green)] border-b-2 border-green-200"
            : "bg-[var(--red-bg)] text-[var(--red)] border-b-2 border-red-200"
        }`}
      >
        {hasAccess ? (
          <FaCheckCircle className="text-xl flex-shrink-0" />
        ) : (
          <FaTimesCircle className="text-xl flex-shrink-0" />
        )}
        {hasAccess ? "Access Granted" : "No Access"} — {eventName}
      </div>

      {/* Attendee Info */}
      <Link
        href={`/?id=${encodeURIComponent(result.token)}`}
        className="px-6 py-5 flex items-center gap-4 border-b border-gray-100 hover:bg-gray-50 transition-colors no-underline group"
      >
        <div className="w-14 h-14 rounded-full bg-[var(--maroon)] text-white flex items-center justify-center text-xl font-bold font-[family-name:var(--font-playfair)] flex-shrink-0 group-hover:opacity-90 transition-opacity">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 text-lg leading-tight group-hover:text-[var(--maroon)] transition-colors">{attendee.name}</div>
          <div className="text-xs text-[var(--gray)] mt-0.5">{attendeeId}</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-[var(--maroon)]">
            {packageIcons[attendee.package]}
            {packageShortNames[attendee.package]}
          </div>
        </div>
        <FaExternalLinkAlt className="text-gray-300 text-xs flex-shrink-0 group-hover:text-[var(--maroon)] transition-colors" />
      </Link>

      {/* Check-in Action */}
      <div className="px-6 py-5 space-y-3">
        {!hasAccess && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <FaTimesCircle className="mt-0.5 flex-shrink-0" />
            This attendee&apos;s package does not include access to this event.
          </div>
        )}

        {hasAccess && checkedIn && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-semibold">
            <FaExclamationTriangle className="flex-shrink-0" />
            Already checked in for this event.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {hasAccess && !checkedIn && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full flex items-center justify-center gap-2 bg-[var(--green)] text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <FaUserCheck className="text-base" />
            {checkingIn ? "Recording..." : "Mark as Checked In"}
          </button>
        )}

        {hasAccess && checkedIn && (
          <div className="flex items-center justify-center gap-2 bg-[var(--green-bg)] text-[var(--green)] py-3.5 rounded-xl font-semibold text-sm border-2 border-green-200">
            <FaCheckCircle />
            Check-in Recorded
          </div>
        )}

        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-[var(--gray)] py-3 rounded-xl font-semibold text-sm hover:border-[var(--maroon)] hover:text-[var(--maroon)] transition-colors"
        >
          <FaRedo />
          Scan Next Attendee
        </button>
      </div>
    </div>
  );
}
