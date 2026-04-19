"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { getInitials } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaCheck,
  FaTimes,
  FaKey,
  FaUserSlash,
  FaTicketAlt,
  FaStarHalfAlt,
  FaStar,
  FaCrown,
  FaExclamationCircle,
  FaCalendarAlt,
  FaPassport,
} from "react-icons/fa";
import { getAttendeeByToken } from "@/lib/actions";
import { events, paymentStatusLabels, discountTypeLabels, scheduleOptions, getAccessibleEventIds, type Attendee, type AttendeePackage, type PaymentStatus, type DiscountType } from "@/lib/data";

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
  guest: {
    className: "bg-white/20 text-white",
    icon: <FaPassport />,
  },
  custom: {
    className: "bg-purple-100 text-purple-800",
    icon: <FaCalendarAlt />,
  },
};

function WelcomeState() {
  return (
    <div className="text-center py-20 px-10">
      <FaCalendarAlt className="text-6xl text-[var(--maroon)] mx-auto mb-6 opacity-30" />
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[var(--maroon)] mb-3">
        Welcome to HWB 2026
      </h2>
      <p className="text-base text-[var(--gray)] max-w-md mx-auto leading-relaxed">
        To view your attendee profile and event access, please use the link or QR code provided in your registration confirmation email.
      </p>
    </div>
  );
}

function NotFoundState() {
  return (
    <>
      <div className="rounded-xl px-7 py-5 flex items-center gap-4 mb-6 font-semibold text-lg bg-[var(--red-bg)] text-[var(--red)] border-2 border-red-200">
        <FaTimesCircle className="text-xl flex-shrink-0" />
        Invalid or expired link. Please use the link from your confirmation email.
      </div>
      <div className="text-center py-20 px-10 text-[var(--gray)]">
        <FaUserSlash className="text-6xl text-[#ddd] mx-auto mb-6" />
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[#999] mb-2.5">
          Profile Not Found
        </h2>
        <p className="text-base">
          The link you used may be invalid or expired. Please check your
          registration confirmation email for the correct link.
        </p>
      </div>
    </>
  );
}

function AttendeeProfile({
  attendee,
  attendeeId,
  token,
}: {
  attendee: Attendee;
  attendeeId: string;
  token: string;
}) {
  const initials = getInitials(attendee.name);
  const accessibleIds = getAccessibleEventIds(attendee);

  return (
    <>
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
            {attendee.package !== "guest" && attendee.package !== "custom" && (
            <div
              className={`inline-flex items-center gap-2 px-4.5 py-2 rounded-lg text-sm font-bold tracking-wide ${badgeConfig[attendee.package].className}`}
            >
              {badgeConfig[attendee.package].icon}
              {attendee.packageLabel}
            </div>
          )}
          </div>
          <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center text-3xl font-[family-name:var(--font-playfair)] font-bold border-3 border-white/30 flex-shrink-0 max-sm:w-15 max-sm:h-15 max-sm:text-2xl max-sm:order-first">
            {initials}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 max-sm:grid-cols-1">
          <DetailItem label="Email" value={attendee.email} />
          <DetailItem label="Phone" value={attendee.phone} odd={false} />
          {attendee.package !== "guest" && attendee.package !== "custom" && (
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
          )}
          {attendee.package !== "guest" && attendee.package !== "custom" && (
            <DetailItem
              label="Package"
              value={
                <span className="text-[var(--maroon)] font-semibold">
                  {attendee.packageLabel}
                </span>
              }
            />
          )}
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
          {attendee.package !== "guest" && attendee.package !== "custom" && (
            <DetailItem
              label="Amount"
              value={
                attendee.discountPercent > 0 ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-[var(--gray)]">₱{attendee.originalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    <span className="text-[var(--maroon)] font-bold">₱{attendee.finalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    <span className="text-xs bg-[var(--green-bg)] text-[var(--green)] px-2 py-0.5 rounded-full font-bold">
                      {attendee.discountPercent}% OFF — {discountTypeLabels[attendee.discountType as DiscountType] || attendee.discountType}
                    </span>
                  </span>
                ) : (
                  <span className="font-semibold">₱{attendee.originalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                )
              }
            />
          )}
          {attendee.package !== "guest" && attendee.package !== "custom" && attendee.paymentStatus !== "fully_paid" && attendee.balance > 0 && (
            <DetailItem
              label="Balance Due"
              value={
                <span className="text-amber-600 font-bold">₱{attendee.balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
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
              className="px-10 py-5 border-b border-[#f5f5f5] last:border-b-0 hover:bg-[#fafafa] transition-colors max-sm:px-5 max-sm:py-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 mt-0.5 ${
                    hasAccess
                      ? "bg-[var(--green-bg)] text-[var(--green)] border-green-200"
                      : "bg-[var(--red-bg)] text-[var(--red)] border-red-200"
                  }`}
                >
                  {hasAccess ? <FaCheck /> : <FaTimes />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 max-sm:flex-col max-sm:gap-0.5">
                    <div className="font-semibold text-gray-800 text-[0.95rem]">
                      {event.name}
                    </div>
                    <div
                      className={`text-xs font-bold px-3 py-1 rounded-full text-center flex-shrink-0 ${
                        hasAccess
                          ? "bg-[var(--green-bg)] text-[var(--green)]"
                          : "bg-[var(--red-bg)] text-[var(--red)]"
                      }`}
                    >
                      {hasAccess ? "ACCESS" : "NO ACCESS"}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--gray)] mt-1">
                    {event.date} · {event.time}
                  </div>
                  <div className="text-xs text-[#aaa] mt-0.5">
                    {event.meta} · {event.venue}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Section */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8 p-10 flex items-center gap-10 max-sm:flex-col max-sm:text-center">
        <div className="bg-white p-4 border-2 border-[#e5e7eb] rounded-xl flex-shrink-0">
          <QRCodeSVG
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/?id=${encodeURIComponent(token)}`}
            size={140}
            fgColor="#651E1F"
            bgColor="#ffffff"
            level="H"
          />
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] mb-2">
            Your QR Code
          </h3>
          <p className="text-sm text-[var(--gray)] leading-relaxed mb-4">
            Present this QR code at any event check-in point to verify your access.
          </p>
          <span className="font-mono text-sm bg-[var(--gray-light)] px-3.5 py-2 rounded-md text-gray-700 inline-block">
            {attendeeId}
          </span>
        </div>
      </div>
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

function HomeContent() {
  const searchParams = useSearchParams();
  const [attendeeId, setAttendeeId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [foundAttendee, setFoundAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  const lookupByToken = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const result = await getAttendeeByToken(t);
      if (result) {
        setAttendeeId(result.id);
        setToken(t);
        setFoundAttendee(result.attendee);
      } else {
        setFoundAttendee(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      setHasToken(true);
      lookupByToken(idParam);
    } else {
      setHasToken(false);
      setLoading(false);
    }
  }, [searchParams, lookupByToken]);

  return (
    <>
      {/* Top Navigation */}
      <div className="nav-bar bg-[var(--maroon)] px-6 py-4 flex items-center justify-center text-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold">
            Heritage Without Borders 2026
          </h1>
          <span className="text-xs opacity-80 font-light">
            Attendee Profile
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[900px] mx-auto my-10 px-6">
        {loading && (
          <div className="text-center py-20 text-[var(--gray)]">
            Loading your profile...
          </div>
        )}
        {!loading && !hasToken && <WelcomeState />}
        {!loading && hasToken && !foundAttendee && <NotFoundState />}
        {!loading && foundAttendee && attendeeId && token && (
          <AttendeeProfile attendee={foundAttendee} attendeeId={attendeeId} token={token} />
        )}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-[var(--gray)]">
          Loading...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
