"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  FaMonument,
  FaUserShield,
  FaSearch,
  FaQrcode,
  FaCheckCircle,
  FaTimesCircle,
  FaCheck,
  FaTimes,
  FaKey,
  FaStickyNote,
  FaUserSlash,
  FaTicketAlt,
  FaStarHalfAlt,
  FaStar,
  FaCrown,
  FaExclamationCircle,
  FaCog,
} from "react-icons/fa";
import { getAttendee } from "@/lib/actions";
import { events, paymentStatusLabels, scheduleOptions, getAccessibleEventIds, type Attendee, type AttendeePackage, type PaymentStatus } from "@/lib/data";
import Link from "next/link";

const badgeConfig: Record<
  AttendeePackage,
  { className: string; icon: React.ReactNode }
> = {
  conference: {
    className: "bg-white/20 text-white",
    icon: <FaTicketAlt />,
  },
  "3lectures": {
    className: "bg-[var(--gold)] text-[var(--maroon-dark)]",
    icon: <FaStarHalfAlt />,
  },
  "5lectures": {
    className:
      "bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--maroon-dark)]",
    icon: <FaStar />,
  },
  full: {
    className:
      "bg-gradient-to-br from-amber-400 to-amber-500 text-[var(--maroon-dark)]",
    icon: <FaCrown />,
  },
};

function EmptyState() {
  return (
    <div className="text-center py-20 px-10 text-[var(--gray)]">
      <FaQrcode className="text-6xl text-[#ddd] mx-auto mb-6" />
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[#999] mb-2.5">
        Scan or Enter Attendee ID
      </h2>
      <p className="text-base">
        Scan an attendee&apos;s QR code or type their ID above to view their
        profile and access permissions.
      </p>
    </div>
  );
}

function NotFoundState({ id }: { id: string }) {
  return (
    <>
      <div className="rounded-xl px-7 py-5 flex items-center gap-4 mb-6 font-semibold text-lg bg-[var(--red-bg)] text-[var(--red)] border-2 border-red-200">
        <FaTimesCircle className="text-xl flex-shrink-0" />
        Attendee Not Found — ID &quot;{id}&quot; does not match any
        registration.
      </div>
      <div className="text-center py-20 px-10 text-[var(--gray)]">
        <FaUserSlash className="text-6xl text-[#ddd] mx-auto mb-6" />
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[#999] mb-2.5">
          No Record Found
        </h2>
        <p className="text-base">
          Please verify the ID and try again, or check the attendee&apos;s
          confirmation email.
        </p>
      </div>
    </>
  );
}

function AttendeeProfile({
  attendee,
  attendeeId,
}: {
  attendee: Attendee;
  attendeeId: string;
}) {
  const initials = attendee.name
    .split(" ")
    .map((n) => n[0])
    .join("");
  const accessibleIds = getAccessibleEventIds(attendee);
  const accessCount = accessibleIds.length;

  return (
    <>
      {/* Status Banner */}
      <div className="rounded-xl px-7 py-5 flex items-center gap-4 mb-8 font-semibold text-lg bg-[var(--green-bg)] text-[var(--green)] border-2 border-green-200">
        <FaCheckCircle className="text-xl flex-shrink-0" />
        Verified Attendee — {attendee.packageLabel} · {accessCount} of{" "}
        {events.length} events accessible
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--maroon)] to-[var(--maroon-dark)] px-10 pt-10 pb-8 text-white flex justify-between items-start max-sm:flex-col max-sm:gap-5 max-sm:items-start">
          <div className="flex-1">
            <div className="font-[family-name:var(--font-playfair)] text-3xl font-bold mb-2">
              {attendee.name}
            </div>
            <div className="text-sm opacity-80 mb-4 font-light">
              {attendeeId}
            </div>
            <div
              className={`inline-flex items-center gap-2 px-4.5 py-2 rounded-lg text-sm font-bold tracking-wide ${badgeConfig[attendee.package].className}`}
            >
              {badgeConfig[attendee.package].icon}
              {attendee.packageLabel}
            </div>
          </div>
          <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center text-3xl font-[family-name:var(--font-playfair)] font-bold border-3 border-white/30 flex-shrink-0 max-sm:w-15 max-sm:h-15 max-sm:text-2xl max-sm:order-first">
            {initials}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 max-sm:grid-cols-1">
          <DetailItem label="Email" value={attendee.email} />
          <DetailItem label="Phone" value={attendee.phone} odd={false} />
          <DetailItem
            label="Registration Date"
            value={attendee.registrationDate}
          />
          <DetailItem
            label="Payment Status"
            value={
              attendee.paymentStatus === "fully_paid" ? (
                <span className="text-[var(--green)] font-semibold flex items-center gap-1.5">
                  <FaCheckCircle />
                  {paymentStatusLabels[attendee.paymentStatus as PaymentStatus] || attendee.paymentStatus}
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <FaExclamationCircle />
                  {paymentStatusLabels[attendee.paymentStatus as PaymentStatus] || attendee.paymentStatus}
                </span>
              )
            }
            odd={false}
          />
          <DetailItem
            label="Package"
            value={
              <span className="text-[var(--maroon)] font-semibold">
                {attendee.packageLabel}
              </span>
            }
          />
          {attendee.package === "3lectures" && attendee.selectedSchedule !== null && (
            <DetailItem
              label="Selected Schedule"
              value={
                <span className="text-[var(--maroon)] font-medium">
                  {scheduleOptions.find((s) => s.value === attendee.selectedSchedule)?.label || attendee.selectedSchedule}
                </span>
              }
              odd={false}
            />
          )}
        </div>
      </div>

      {/* Access Permissions */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
        <div className="px-10 py-7 border-b border-[#f0f0f0] flex items-center gap-3">
          <FaKey className="text-[var(--maroon)] text-xl" />
          <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] font-bold">
            Event Access Permissions
          </h2>
        </div>
        {events.map((event) => {
          const hasAccess = accessibleIds.includes(event.id);
          return (
            <div
              key={event.id}
              className="flex items-center px-10 py-5 border-b border-[#f5f5f5] last:border-b-0 hover:bg-[#fafafa] transition-colors max-sm:flex-wrap max-sm:gap-2"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-5 border-2 ${
                  hasAccess
                    ? "bg-[var(--green-bg)] text-[var(--green)] border-green-200"
                    : "bg-[var(--red-bg)] text-[var(--red)] border-red-200"
                }`}
              >
                {hasAccess ? <FaCheck /> : <FaTimes />}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-[0.95rem] mb-0.5">
                  {event.name}
                </div>
                <div className="text-xs text-[var(--gray)]">
                  {event.meta} · {event.venue}
                </div>
              </div>
              <div className="text-sm text-[var(--gray)] font-medium text-right min-w-[100px] max-sm:min-w-0">
                {event.date}
                <br />
                <span className="text-xs text-[#aaa]">{event.time}</span>
              </div>
              <div
                className={`text-xs font-bold px-3 py-1 rounded-full min-w-[80px] text-center ml-4 ${
                  hasAccess
                    ? "bg-[var(--green-bg)] text-[var(--green)]"
                    : "bg-[var(--red-bg)] text-[var(--red)]"
                }`}
              >
                {hasAccess ? "ACCESS" : "NO ACCESS"}
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Section */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8 p-10 flex items-center gap-10 max-sm:flex-col max-sm:text-center">
        <div className="bg-white p-4 border-2 border-[#e5e7eb] rounded-xl flex-shrink-0">
          <QRCodeSVG
            value={attendeeId}
            size={140}
            fgColor="#651E1F"
            bgColor="#ffffff"
            level="H"
          />
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] mb-2">
            Attendee QR Code
          </h3>
          <p className="text-sm text-[var(--gray)] leading-relaxed mb-4">
            This QR code contains the attendee&apos;s unique ID. Scan it at any
            event check-in point to verify access.
          </p>
          <span className="font-mono text-sm bg-[var(--gray-light)] px-3.5 py-2 rounded-md text-gray-700 inline-block">
            {attendeeId}
          </span>
        </div>
      </div>

      {/* Staff Notes */}
      {attendee.notes && (
        <div className="bg-[var(--cream-light)] border-2 border-[var(--cream)] rounded-2xl px-10 py-8 mb-8">
          <h3 className="text-sm text-[var(--maroon)] font-bold mb-3 flex items-center gap-2">
            <FaStickyNote />
            Staff Notes
          </h3>
          <ul className="text-sm text-[#5c4e4d] leading-relaxed list-none">
            <li className="before:content-['•'] before:text-[var(--maroon)] before:mr-2.5 before:font-bold">
              {attendee.notes}
            </li>
          </ul>
        </div>
      )}
    </>
  );
}

function DetailItem({
  label,
  value,
  odd = true,
}: {
  label: string;
  value: React.ReactNode;
  odd?: boolean;
}) {
  return (
    <div
      className={`px-10 py-6 border-b border-[#f0f0f0] ${odd ? "max-sm:border-r-0 border-r border-r-[#f0f0f0]" : ""}`}
    >
      <div className="text-[0.75rem] text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
        {label}
      </div>
      <div className="text-base text-gray-800 font-medium">{value}</div>
    </div>
  );
}

export default function Home() {
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const [foundAttendee, setFoundAttendee] = useState<Attendee | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const lookupAttendee = useCallback(async (id: string) => {
    const normalized = id.trim().toUpperCase();
    if (!normalized) return;
    setSearchInput(normalized);
    setSearching(true);
    try {
      const attendee = await getAttendee(normalized);
      setSearchedId(normalized);
      setFoundAttendee(attendee);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      lookupAttendee(idParam);
    }
  }, [searchParams, lookupAttendee]);

  const handleSearch = async () => {
    await lookupAttendee(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <>
      {/* Top Navigation */}
      <div className="nav-bar bg-[var(--maroon)] px-6 py-4 flex items-center justify-between text-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3">
          <FaMonument className="text-2xl text-[var(--gold)]" />
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold">
              Heritage Without Borders 2026
            </h1>
            <span className="text-xs opacity-80 font-light">
              Attendee Verification System
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition-colors no-underline text-white"
          >
            <FaCog />
            Admin
          </Link>
          <div className="bg-white/15 border border-white/20 px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
            <FaUserShield className="text-[var(--gold)]" />
            Staff Portal
          </div>
        </div>
      </div>

      {/* Scanner Input */}
      <div className="scanner-section bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-[800px] mx-auto flex items-center gap-4">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Scan QR code or enter Attendee ID (e.g. HWB-2026-0042)"
            className="flex-1 px-5 py-3.5 border-2 border-gray-200 rounded-xl text-base font-[family-name:var(--font-inter)] outline-none focus:border-[var(--maroon)] transition-colors placeholder:text-[#aaa]"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-[var(--maroon)] text-white border-none px-7 py-3.5 rounded-xl text-base font-semibold cursor-pointer flex items-center gap-2 hover:bg-[var(--maroon-dark)] transition-colors font-[family-name:var(--font-inter)] disabled:opacity-50"
          >
            <FaSearch />
            {searching ? "Searching..." : "Lookup"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[900px] mx-auto my-10 px-6">
        {!hasSearched && <EmptyState />}
        {hasSearched && !foundAttendee && searchedId && (
          <NotFoundState id={searchedId} />
        )}
        {hasSearched && foundAttendee && searchedId && (
          <AttendeeProfile attendee={foundAttendee} attendeeId={searchedId} />
        )}
      </div>
    </>
  );
}
