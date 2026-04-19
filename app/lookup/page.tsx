"use client";

import { useState, useEffect, useMemo } from "react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import {
  FaMonument,
  FaArrowLeft,
  FaSearch,
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaTicketAlt,
  FaStarHalfAlt,
  FaStar,
  FaCrown,
  FaLock,
  FaTimes,
  FaPassport,
} from "react-icons/fa";
import {
  checkAdminSession,
  createAdminSession,
  getAllAttendees,
} from "@/lib/actions";
import {
  events,
  getAccessibleEventIds,
  packageShortNames,
  packageLabels,
  paymentStatusLabels,
  discountTypeLabels,
  type AttendeePackage,
  type Attendee,
} from "@/lib/data";

type AttendeeEntry = { id: string; attendee: Attendee; token: string };

const packageIcons: Record<AttendeePackage, React.ReactNode> = {
  conference: <FaTicketAlt />,
  "3lectures": <FaStarHalfAlt />,
  "5lectures": <FaStar />,
  full: <FaCrown />,
  guest: <FaPassport />,
  custom: <FaCalendarAlt />,
};

const packageColors: Record<AttendeePackage, string> = {
  conference: "bg-gray-100 text-gray-700",
  "3lectures": "bg-amber-50 text-amber-800",
  "5lectures": "bg-yellow-50 text-yellow-800",
  full: "bg-[var(--cream)] text-[var(--maroon)]",
  guest: "bg-gray-100 text-gray-700",
  custom: "bg-purple-50 text-purple-800",
};

function AttendeeCard({ entry, onClose }: { entry: AttendeeEntry; onClose: () => void }) {
  const { id, attendee } = entry;
  const accessibleIds = getAccessibleEventIds(attendee);
  const initials = getInitials(attendee.name);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto max-h-[92dvh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="bg-[var(--maroon)] px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold font-[family-name:var(--font-playfair)] flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-lg leading-tight">{attendee.name}</div>
            <div className="text-white/70 text-xs mt-0.5">{id}</div>
            <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${packageColors[attendee.package]}`}>
              {packageIcons[attendee.package]}
              {packageShortNames[attendee.package]}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
          >
            <FaTimes />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Contact */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-gray-700">
              <FaEnvelope className="text-[var(--gray)] flex-shrink-0 text-xs" />
              {attendee.email || <span className="text-[var(--gray)] italic">No email</span>}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-700">
              <FaPhone className="text-[var(--gray)] flex-shrink-0 text-xs" />
              {attendee.phone || <span className="text-[var(--gray)] italic">No phone</span>}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-700">
              <FaCalendarAlt className="text-[var(--gray)] flex-shrink-0 text-xs" />
              Registered {attendee.registrationDate}
            </div>
          </div>

          {/* Package */}
          <div className="bg-[var(--cream)] rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed">
            {packageLabels[attendee.package]}
          </div>

          {/* Payment */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Status</span>
              <span className={`font-semibold ${attendee.paymentStatus === "fully_paid" ? "text-[var(--green)]" : "text-amber-600"}`}>
                {paymentStatusLabels[attendee.paymentStatus]}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Original</span>
              <span>₱{attendee.originalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            {attendee.discountPercent > 0 && (
              <div className="flex justify-between text-[var(--green)]">
                <span>{discountTypeLabels[attendee.discountType]} ({attendee.discountPercent}%)</span>
                <span>-₱{(attendee.originalAmount * attendee.discountPercent / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[var(--maroon)] border-t border-gray-200 pt-1.5 mt-1">
              <span>Total</span>
              <span>₱{attendee.finalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Event Access */}
          <div>
            <div className="text-xs text-[var(--gray)] uppercase tracking-wider font-semibold mb-2">
              Event Access
            </div>
            <div className="space-y-2">
              {events.map((ev) => {
                const hasAccess = accessibleIds.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm ${
                      hasAccess ? "bg-green-50 text-gray-800" : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {hasAccess ? (
                      <FaCheckCircle className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                    ) : (
                      <FaTimesCircle className="text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold leading-tight">{ev.name}</div>
                      <div className="text-xs opacity-70 mt-0.5">{ev.date} · {ev.venue}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {attendee.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <div className="font-semibold text-xs uppercase tracking-wider mb-1 opacity-70">Staff Notes</div>
              {attendee.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LookupPage() {
  const [sessionChecking, setSessionChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [allAttendees, setAllAttendees] = useState<AttendeeEntry[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AttendeeEntry | null>(null);

  useEffect(() => {
    checkAdminSession().then((valid) => {
      setAuthenticated(valid);
      setSessionChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    getAllAttendees().then((data) => {
      setAllAttendees(data);
      setLoadingAttendees(false);
    });
  }, [authenticated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allAttendees;
    return allAttendees.filter(
      ({ id, attendee }) =>
        id.toLowerCase().includes(q) ||
        attendee.name.toLowerCase().includes(q) ||
        attendee.email.toLowerCase().includes(q)
    );
  }, [query, allAttendees]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError("");
    const ok = await createAdminSession(password);
    if (ok) {
      setAuthenticated(true);
    } else {
      setLoginError("Incorrect password.");
    }
    setLoginSubmitting(false);
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]">
        <FaSpinner className="animate-spin text-[var(--maroon)] text-3xl" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <FaLock className="text-[var(--maroon)] text-xl" />
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--maroon)]">
              Staff Access
            </h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter staff password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors"
              autoFocus
            />
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={loginSubmitting || !password}
              className="w-full bg-[var(--maroon)] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loginSubmitting ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {/* Nav */}
      <div className="bg-[var(--maroon)] px-6 py-4 flex items-center gap-4 text-white sticky top-0 z-40 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <Link
          href="/admin"
          className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <FaArrowLeft className="text-sm" />
        </Link>
        <FaMonument className="text-xl text-[var(--gold)]" />
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-lg font-bold leading-tight">
            Attendee Look-Up
          </h1>
          <span className="text-xs opacity-70">
            {loadingAttendees ? "Loading..." : `${allAttendees.length} registered`}
          </span>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto px-4 py-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray)] text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or email…"
            className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-transparent rounded-2xl text-sm outline-none focus:border-[var(--maroon)] transition-colors shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--gray)] hover:text-[var(--maroon)]"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>

        {/* Results count */}
        {query && (
          <p className="text-xs text-[var(--gray)] px-1">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}

        {/* List */}
        {loadingAttendees ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-[var(--maroon)] text-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--gray)] text-sm">
            No attendees found.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4 text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-[var(--maroon)]/20 active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--maroon)] text-white flex items-center justify-center text-sm font-bold font-[family-name:var(--font-playfair)] flex-shrink-0">
                  {getInitials(entry.attendee.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm">{entry.attendee.name}</div>
                  <div className="text-xs text-[var(--gray)] mt-0.5">{entry.id}</div>
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${packageColors[entry.attendee.package]}`}>
                  {packageIcons[entry.attendee.package]}
                  {packageShortNames[entry.attendee.package]}
                </div>
                <FaUser className="text-gray-300 text-xs flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selected && (
        <AttendeeCard entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
