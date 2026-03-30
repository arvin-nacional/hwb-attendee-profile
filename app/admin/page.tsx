"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaMonument,
  FaUserShield,
  FaPlus,
  FaUsers,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
  FaCrown,
  FaStar,
  FaStarHalfAlt,
  FaTicketAlt,
  FaArrowLeft,
  FaLock,
  FaMoneyCheckAlt,
} from "react-icons/fa";
import {
  addAttendee,
  getAllAttendees,
  deleteAttendee,
  updateAttendee,
  verifyAdmin,
} from "@/lib/actions";
import {
  type Attendee,
  type AttendeePackage,
  type PaymentStatus,
  packageLabels,
  paymentStatusLabels,
  scheduleOptions,
} from "@/lib/data";
import Link from "next/link";

const packageIcons: Record<AttendeePackage, React.ReactNode> = {
  conference: <FaTicketAlt className="text-xs" />,
  "3lectures": <FaStarHalfAlt className="text-xs" />,
  "5lectures": <FaStar className="text-xs" />,
  full: <FaCrown className="text-xs" />,
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [attendeeList, setAttendeeList] = useState<
    { id: string; attendee: Attendee }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllAttendees();
      setAttendeeList(list);
    } catch {
      console.error("Failed to fetch attendees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchAttendees();
    }
  }, [fetchAttendees, authenticated]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const valid = await verifyAdmin(password);
      if (valid) {
        setAuthenticated(true);
      } else {
        setAuthError("Incorrect password.");
        setPassword("");
      }
    } catch {
      setAuthError("Something went wrong.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await addAttendee(formData);
      if (result.success) {
        setMessage({
          type: "success",
          text: `${result.message} ID: ${result.id}`,
        });
        form.reset();
        setSelectedPackage("");
        fetchAttendees();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkPaid(id: string, attendee: Attendee) {
    if (!confirm(`Mark ${attendee.name} (${id}) as Fully Paid?`)) return;

    try {
      const formData = new FormData();
      formData.set("name", attendee.name);
      formData.set("email", attendee.email);
      formData.set("phone", attendee.phone);
      formData.set("package", attendee.package);
      if (attendee.selectedSchedule) {
        formData.set("selectedSchedule", attendee.selectedSchedule);
      }
      formData.set("paymentStatus", "fully_paid");
      formData.set("notes", attendee.notes);

      const result = await updateAttendee(id, formData);
      if (result.success) {
        setMessage({ type: "success", text: `${attendee.name} marked as Fully Paid.` });
        fetchAttendees();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update payment status." });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete attendee ${name} (${id})?`)) return;

    try {
      const result = await deleteAttendee(id);
      if (result.success) {
        setMessage({ type: "success", text: result.message });
        fetchAttendees();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete." });
    }
  }

  if (!authenticated) {
    return (
      <>
        {/* Top Navigation */}
        <div className="bg-[var(--maroon)] px-6 py-4 flex items-center justify-between text-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <FaMonument className="text-2xl text-[var(--gold)]" />
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold">
                Heritage Without Borders 2026
              </h1>
              <span className="text-xs opacity-80 font-light">
                Admin — Attendee Management
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition-colors no-underline text-white"
          >
            <FaArrowLeft />
            Back to Lookup
          </Link>
        </div>

        {/* Login Gate */}
        <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-10 w-full max-w-md mx-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[var(--maroon)] rounded-full flex items-center justify-center mx-auto mb-4">
                <FaLock className="text-2xl text-[var(--gold)]" />
              </div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[var(--maroon)] font-bold mb-2">
                Admin Access
              </h2>
              <p className="text-sm text-[var(--gray)]">
                Enter the admin password to manage attendees.
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors placeholder:text-[#bbb] mb-4"
              />
              {authError && (
                <div className="flex items-center gap-2 text-[var(--red)] text-sm font-medium mb-4">
                  <FaExclamationCircle />
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[var(--maroon)] text-white px-6 py-3.5 rounded-xl text-base font-semibold cursor-pointer flex items-center justify-center gap-2 hover:bg-[var(--maroon-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaLock className="text-sm" />
                {authLoading ? "Verifying..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Top Navigation */}
      <div className="bg-[var(--maroon)] px-6 py-4 flex items-center justify-between text-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3">
          <FaMonument className="text-2xl text-[var(--gold)]" />
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold">
              Heritage Without Borders 2026
            </h1>
            <span className="text-xs opacity-80 font-light">
              Admin — Attendee Management
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition-colors no-underline text-white"
          >
            <FaArrowLeft />
            Lookup
          </Link>
          <div className="bg-white/15 border border-white/20 px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
            <FaUserShield className="text-[var(--gold)]" />
            Admin
          </div>
        </div>
      </div>

      <div className="w-full max-w-[960px] mx-auto my-10 px-6">
        {/* Message Banner */}
        {message && (
          <div
            className={`rounded-xl px-6 py-4 flex items-center gap-3 mb-8 font-semibold text-base border-2 ${
              message.type === "success"
                ? "bg-[var(--green-bg)] text-[var(--green)] border-green-200"
                : "bg-[var(--red-bg)] text-[var(--red)] border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <FaCheckCircle className="flex-shrink-0" />
            ) : (
              <FaExclamationCircle className="flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Add Attendee Form */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
          <div className="px-10 py-7 border-b border-[#f0f0f0] flex items-center gap-3">
            <FaPlus className="text-[var(--maroon)] text-lg" />
            <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] font-bold">
              Add New Attendee
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-10">
            <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
              {/* Name */}
              <div className="col-span-2 max-sm:col-span-1">
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Maria Santos"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors placeholder:text-[#bbb]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="e.g. maria@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors placeholder:text-[#bbb]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="e.g. +63 917 123 4567"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors placeholder:text-[#bbb]"
                />
              </div>

              {/* Package */}
              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Package *
                </label>
                <select
                  name="package"
                  required
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors bg-white"
                >
                  <option value="">Select package...</option>
                  {(
                    Object.entries(packageLabels) as [
                      AttendeePackage,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule Picker — only for Package B (3 Lectures) */}
              {selectedPackage === "3lectures" && (
                <div className="col-span-2 max-sm:col-span-1">
                  <label className="block text-xs text-[var(--maroon)] uppercase tracking-[1px] mb-3 font-semibold">
                    For Package B — Select Desired Schedule *
                  </label>
                  <div className="space-y-2">
                    {scheduleOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-[var(--maroon-light)] transition-colors has-[:checked]:border-[var(--maroon)] has-[:checked]:bg-[var(--cream-light)]"
                      >
                        <input
                          type="radio"
                          name="selectedSchedule"
                          value={option.value}
                          required
                          className="accent-[var(--maroon)] w-4 h-4"
                        />
                        <span className="text-base text-gray-800 font-medium">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Status */}
              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Payment Status *
                </label>
                <select
                  name="paymentStatus"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors bg-white"
                >
                  <option value="">Select status...</option>
                  {(
                    Object.entries(paymentStatusLabels) as [
                      PaymentStatus,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="col-span-2 max-sm:col-span-1">
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Staff Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="e.g. VIP Guest, Group registration, Special requirements..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors placeholder:text-[#bbb] resize-y"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--maroon)] text-white px-8 py-3.5 rounded-xl text-base font-semibold cursor-pointer flex items-center gap-2 hover:bg-[var(--maroon-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlus />
                {submitting ? "Adding..." : "Add Attendee"}
              </button>
            </div>
          </form>
        </div>

        {/* Attendee List */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
          <div className="px-10 py-7 border-b border-[#f0f0f0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaUsers className="text-[var(--maroon)] text-xl" />
              <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] font-bold">
                All Attendees
              </h2>
            </div>
            <span className="text-sm text-[var(--gray)] font-medium">
              {attendeeList.length} registered
            </span>
          </div>

          {loading ? (
            <div className="px-10 py-12 text-center text-[var(--gray)]">
              Loading attendees...
            </div>
          ) : attendeeList.length === 0 ? (
            <div className="px-10 py-12 text-center text-[var(--gray)]">
              No attendees yet. Add one using the form above.
            </div>
          ) : (
            <div>
              {attendeeList.map(({ id, attendee }) => (
                <div
                  key={id}
                  className="flex items-center px-10 py-5 border-b border-[#f5f5f5] last:border-b-0 hover:bg-[#fafafa] transition-colors gap-4"
                >
                  {/* Clickable area linking to profile */}
                  <Link
                    href={`/?id=${encodeURIComponent(id)}`}
                    className="flex items-center gap-4 flex-1 min-w-0 no-underline"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 bg-[var(--maroon)] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 font-[family-name:var(--font-playfair)]">
                      {attendee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-[0.95rem]">
                        {attendee.name}
                      </div>
                      <div className="text-xs text-[var(--gray)] truncate">
                        {id} · {attendee.email}
                      </div>
                    </div>
                  </Link>

                  {/* Package Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--cream)] text-[var(--maroon)] flex-shrink-0">
                    {packageIcons[attendee.package]}
                    {attendee.packageLabel}
                  </div>

                  {/* Payment Status */}
                  {attendee.paymentStatus === "fully_paid" ? (
                    <div className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 bg-[var(--green-bg)] text-[var(--green)]">
                      {paymentStatusLabels[attendee.paymentStatus]}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkPaid(id, attendee)}
                      className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 bg-amber-50 text-amber-600 border border-amber-200 cursor-pointer hover:bg-green-50 hover:text-[var(--green)] hover:border-green-200 transition-colors flex items-center gap-1.5"
                      title="Click to mark as Fully Paid"
                    >
                      <FaMoneyCheckAlt />
                      {paymentStatusLabels[attendee.paymentStatus]}
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(id, attendee.name)}
                    className="text-gray-300 hover:text-[var(--red)] transition-colors p-2 flex-shrink-0 cursor-pointer"
                    title="Delete attendee"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
