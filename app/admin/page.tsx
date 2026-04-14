"use client";

import { useState, useEffect, useCallback } from "react";
import { getInitials } from "@/lib/utils";
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
  FaQrcode,
  FaSearch,
  FaLock,
  FaEdit,
  FaTimes,
  FaDownload,
  FaSpinner,
} from "react-icons/fa";
import {
  addAttendee,
  getAllAttendees,
  deleteAttendee,
  updateAttendee,
  createAdminSession,
  checkAdminSession,
  clearAdminSession,
} from "@/lib/actions";
import { downloadSingleQR, downloadAllQRs } from "@/lib/qrDownload";
import {
  type Attendee,
  type AttendeePackage,
  type PaymentStatus,
  type DiscountType,
  packageLabels,
  packageShortNames,
  packagePrices,
  paymentStatusLabels,
  discountTypeLabels,
  getDiscountPercent,
  scheduleOptions,
} from "@/lib/data";
import Link from "next/link";

const packageIcons: Record<AttendeePackage, React.ReactNode> = {
  conference: <FaTicketAlt className="text-xs" />,
  "3lectures": <FaStarHalfAlt className="text-xs" />,
  "5lectures": <FaStar className="text-xs" />,
  full: <FaCrown className="text-xs" />,
};

function QRDownloadButton({ id, name, token }: { id: string; name: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    await downloadSingleQR(name, id, token);
    setBusy(false);
  };
  return (
    <button
      onClick={handle}
      disabled={busy}
      className="text-gray-300 hover:text-[var(--maroon)] transition-colors p-2 cursor-pointer rounded-lg hover:bg-gray-50 disabled:opacity-50"
      title="Download QR code"
    >
      {busy ? <FaSpinner className="text-sm animate-spin" /> : <FaQrcode className="text-sm" />}
    </button>
  );
}

function DownloadAllButton({ attendees }: { attendees: { id: string; attendee: Attendee; token: string }[] }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    await downloadAllQRs(attendees.map(({ id, attendee, token }) => ({ id, name: attendee.name, token })));
    setBusy(false);
  };
  return (
    <button
      onClick={handle}
      disabled={busy}
      className="flex items-center gap-2 bg-[var(--maroon)] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
    >
      {busy ? <FaSpinner className="animate-spin" /> : <FaDownload />}
      {busy ? "Generating..." : "Download All QR Codes"}
    </button>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [attendeeList, setAttendeeList] = useState<
    { id: string; attendee: Attendee; token: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [submitting, setSubmitting] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDiscount, setSelectedDiscount] = useState<string>("none");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    package: "" as string,
    selectedSchedule: "" as string,
    paymentStatus: "" as string,
    discountType: "none" as string,
    notes: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

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
    checkAdminSession().then((valid) => {
      if (valid) setAuthenticated(true);
      setSessionChecking(false);
    });
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
      const valid = await createAdminSession(password);
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

  async function handleLogout() {
    await clearAdminSession();
    setAuthenticated(false);
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
        setSelectedDiscount("none");
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

  function openEditModal(id: string, attendee: Attendee) {
    setEditingId(id);
    setEditForm({
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      package: attendee.package,
      selectedSchedule: attendee.selectedSchedule || "",
      paymentStatus: attendee.paymentStatus,
      discountType: attendee.discountType || "none",
      notes: attendee.notes,
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", editForm.name);
      formData.set("email", editForm.email);
      formData.set("phone", editForm.phone);
      formData.set("package", editForm.package);
      if (editForm.package === "3lectures" && editForm.selectedSchedule) {
        formData.set("selectedSchedule", editForm.selectedSchedule);
      }
      formData.set("paymentStatus", editForm.paymentStatus);
      formData.set("discountType", editForm.discountType);
      formData.set("notes", editForm.notes);

      const result = await updateAttendee(editingId, formData);
      if (result.success) {
        setMessage({ type: "success", text: `${editForm.name} updated successfully.` });
        setEditingId(null);
        fetchAttendees();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update attendee." });
    } finally {
      setEditSubmitting(false);
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

  if (sessionChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--gray)] text-sm">Loading...</div>
      </div>
    );
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
      <div className="bg-[var(--maroon)] px-4 sm:px-6 py-3 flex items-center justify-between text-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.2)] gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FaMonument className="text-lg text-[var(--gold)] flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-playfair)] text-base font-bold leading-tight truncate">
              <span className="hidden sm:inline">Heritage Without Borders 2026</span>
              <span className="sm:hidden">HWB 2026</span>
            </h1>
            <span className="text-xs opacity-70 font-light hidden sm:block">Admin — Attendee Management</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/scan"
            className="bg-white/10 border border-white/20 p-2 sm:px-4 sm:py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition-colors no-underline text-white"
            title="Check-In"
          >
            <FaQrcode />
            <span className="hidden sm:inline">Check-In</span>
          </Link>
          <Link
            href="/lookup"
            className="bg-white/10 border border-white/20 p-2 sm:px-4 sm:py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition-colors no-underline text-white"
            title="Lookup"
          >
            <FaSearch />
            <span className="hidden sm:inline">Lookup</span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-white/10 border border-white/20 p-2 sm:px-4 sm:py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition-colors cursor-pointer"
            title="Logout"
          >
            <FaUserShield className="text-[var(--gold)]" />
            <span className="hidden sm:inline">Logout</span>
          </button>
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

              {/* Discount Type */}
              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                  Discount
                </label>
                <select
                  name="discountType"
                  value={selectedDiscount}
                  onChange={(e) => setSelectedDiscount(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors bg-white"
                >
                  {(Object.entries(discountTypeLabels) as [DiscountType, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Price Preview */}
              {selectedPackage && (() => {
                const pct = getDiscountPercent(selectedDiscount as DiscountType, selectedPackage as AttendeePackage);
                const original = packagePrices[selectedPackage as AttendeePackage];
                const final = Math.round(original * (1 - pct / 100));
                return (
                  <div className="col-span-2 max-sm:col-span-1 bg-[var(--cream-light)] border-2 border-[var(--cream)] rounded-xl px-6 py-4">
                    <div className="text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                      Payment Summary
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                      <span>Original Price</span>
                      <span>₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {pct > 0 && (
                      <div className="flex items-center justify-between text-sm text-[var(--green)] mb-1">
                        <span>Discount ({pct}%)</span>
                        <span>-₱{(original * pct / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-bold text-[var(--maroon)] border-t border-[var(--cream)] pt-2 mt-2">
                      <span>Total</span>
                      <span>₱{final.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}

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
        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = q
            ? attendeeList.filter(
                ({ id, attendee }) =>
                  attendee.name.toLowerCase().includes(q) ||
                  id.toLowerCase().includes(q) ||
                  attendee.email.toLowerCase().includes(q)
              )
            : attendeeList;
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const safePage = Math.min(page, totalPages);
          const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
          return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-8">
          <div className="px-6 sm:px-10 py-5 border-b border-[#f0f0f0] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <FaUsers className="text-[var(--maroon)] text-xl" />
              <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] font-bold">
                All Attendees
              </h2>
              <span className="text-sm text-[var(--gray)] font-medium">
                {q ? `${filtered.length} of ${attendeeList.length}` : `${attendeeList.length} registered`}
              </span>
            </div>
            {attendeeList.length > 0 && (
              <DownloadAllButton attendees={attendeeList} />
            )}
          </div>

          {/* Search bar */}
          {!loading && attendeeList.length > 0 && (
            <div className="px-6 sm:px-10 py-3 border-b border-[#f0f0f0]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name, ID, or email..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl outline-none focus:border-[var(--maroon)] transition-colors bg-[#fafafa] placeholder:text-gray-300"
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

          {loading ? (
            <div className="px-10 py-12 text-center text-[var(--gray)]">
              Loading attendees...
            </div>
          ) : attendeeList.length === 0 ? (
            <div className="px-10 py-12 text-center text-[var(--gray)]">
              No attendees yet. Add one using the form above.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-10 py-12 text-center text-[var(--gray)]">
              No attendees match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div>
              {paged.map(({ id, attendee, token }) => (
                <div
                  key={id}
                  className="flex items-center px-4 sm:px-8 py-4 border-b border-[#f5f5f5] last:border-b-0 hover:bg-[#fafafa] transition-colors gap-3"
                >
                  {/* Avatar */}
                  <Link
                    href={`/?id=${encodeURIComponent(token)}`}
                    className="w-10 h-10 bg-[var(--maroon)] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 font-[family-name:var(--font-playfair)] no-underline"
                  >
                    {getInitials(attendee.name)}
                  </Link>

                  {/* Info — clickable */}
                  <Link
                    href={`/?id=${encodeURIComponent(token)}`}
                    className="flex-1 min-w-0 no-underline"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{attendee.name}</span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--cream)] text-[var(--maroon)]">
                        {packageIcons[attendee.package]}
                        {packageShortNames[attendee.package]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-[var(--gray)] truncate max-w-[130px] sm:max-w-none">{id}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          attendee.paymentStatus === "fully_paid"
                            ? "bg-[var(--green-bg)] text-[var(--green)]"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {paymentStatusLabels[attendee.paymentStatus]}
                      </span>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <QRDownloadButton id={id} name={attendee.name} token={token} />
                    <button
                      onClick={() => openEditModal(id, attendee)}
                      className="text-gray-300 hover:text-[var(--maroon)] transition-colors p-2 cursor-pointer rounded-lg hover:bg-gray-50"
                      title="Edit attendee"
                    >
                      <FaEdit className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleDelete(id, attendee.name)}
                      className="text-gray-300 hover:text-[var(--red)] transition-colors p-2 cursor-pointer rounded-lg hover:bg-red-50"
                      title="Delete attendee"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-6 sm:px-10 py-4 border-t border-[#f0f0f0] flex items-center justify-between gap-4">
              <span className="text-xs text-[var(--gray)]">
                Page {safePage} of {totalPages} &mdash; showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
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
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-300 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
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
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
          );
        })()}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-[#f0f0f0] flex items-center justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] font-bold">
                  Edit Attendee
                </h2>
                <span className="text-xs text-[var(--gray)]">{editingId}</span>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-8">
              <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                {/* Name */}
                <div className="col-span-2 max-sm:col-span-1">
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors"
                  />
                </div>

                {/* Package */}
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                    Package *
                  </label>
                  <select
                    value={editForm.package}
                    onChange={(e) => setEditForm({ ...editForm, package: e.target.value, selectedSchedule: e.target.value !== "3lectures" ? "" : editForm.selectedSchedule })}
                    required
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

                {/* Schedule Picker */}
                {editForm.package === "3lectures" && (
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
                            name="editSelectedSchedule"
                            value={option.value}
                            checked={editForm.selectedSchedule === option.value}
                            onChange={(e) => setEditForm({ ...editForm, selectedSchedule: e.target.value })}
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
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
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

                {/* Discount Type */}
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                    Discount
                  </label>
                  <select
                    value={editForm.discountType}
                    onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors bg-white"
                  >
                    {(Object.entries(discountTypeLabels) as [DiscountType, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Price Preview */}
                {editForm.package && (() => {
                  const pct = getDiscountPercent(editForm.discountType as DiscountType, editForm.package as AttendeePackage);
                  const original = packagePrices[editForm.package as AttendeePackage];
                  const finalAmt = Math.round(original * (1 - pct / 100));
                  return (
                    <div className="col-span-2 max-sm:col-span-1 bg-[var(--cream-light)] border-2 border-[var(--cream)] rounded-xl px-6 py-4">
                      <div className="text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                        Payment Summary
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                        <span>Original Price</span>
                        <span>₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                      {pct > 0 && (
                        <div className="flex items-center justify-between text-sm text-[var(--green)] mb-1">
                          <span>Discount ({pct}%)</span>
                          <span>-₱{(original * pct / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-base font-bold text-[var(--maroon)] border-t border-[var(--cream)] pt-2 mt-2">
                        <span>Total</span>
                        <span>₱{finalAmt.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Notes */}
                <div className="col-span-2 max-sm:col-span-1">
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">
                    Staff Notes
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors resize-y"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-6 py-3 rounded-xl text-base font-semibold cursor-pointer border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="bg-[var(--maroon)] text-white px-8 py-3 rounded-xl text-base font-semibold cursor-pointer flex items-center gap-2 hover:bg-[var(--maroon-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
