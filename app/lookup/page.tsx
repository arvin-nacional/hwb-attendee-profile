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
  FaEdit,
  FaTools,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  checkAdminSession,
  createAdminSession,
  getAllAttendees,
  updateAttendee,
} from "@/lib/actions";
import {
  events,
  getAccessibleEventIds,
  packageShortNames,
  packageLabels,
  packagePrices,
  paymentStatusLabels,
  discountTypeLabels,
  scheduleOptions,
  getDiscountPercent,
  type AttendeePackage,
  type Attendee,
  type DiscountType,
  type PaymentStatus,
} from "@/lib/data";

type AttendeeEntry = { id: string; attendee: Attendee; token: string };

const packageIcons: Record<AttendeePackage, React.ReactNode> = {
  conference: <FaTicketAlt />,
  "3lectures": <FaStarHalfAlt />,
  "5lectures": <FaStar />,
  full: <FaCrown />,
  custom: <FaTools />,
};

const packageColors: Record<AttendeePackage, string> = {
  conference: "bg-gray-100 text-gray-700",
  "3lectures": "bg-amber-50 text-amber-800",
  "5lectures": "bg-yellow-50 text-yellow-800",
  full: "bg-[var(--cream)] text-[var(--maroon)]",
  custom: "bg-gray-100 text-gray-700",
};

function AttendeeCard({ entry, onClose, onEdit }: { entry: AttendeeEntry; onClose: () => void; onEdit: (id: string, attendee: Attendee) => void }) {
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
            onClick={() => onEdit(id, attendee)}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
            title="Edit attendee"
          >
            <FaEdit />
          </button>
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    package: "" as string,
    selectedSchedule: "" as string,
    paymentStatus: "" as string,
    discountType: "none" as string,
    balance: "" as string,
    customEventIds: [] as string[],
    customAmount: "" as string,
    notes: "",
  });

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

  function openEdit(id: string, attendee: Attendee) {
    setEditingId(id);
    setEditMessage(null);
    setEditForm({
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      package: attendee.package,
      selectedSchedule: attendee.selectedSchedule || "",
      paymentStatus: attendee.paymentStatus,
      discountType: attendee.discountType || "none",
      balance: attendee.paymentStatus === "partial" ? String(attendee.balance ?? "") : "",
      customEventIds: attendee.package === "custom" ? (attendee.customEventIds ?? []) : [],
      customAmount: attendee.package === "custom" ? String(attendee.originalAmount ?? "") : "",
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
      formData.set("balance", editForm.balance);
      if (editForm.package === "custom") {
        editForm.customEventIds.forEach((eid) => formData.append("customEventIds", eid));
        formData.set("customAmount", editForm.customAmount);
      }
      formData.set("notes", editForm.notes);
      const result = await updateAttendee(editingId, formData);
      if (result.success) {
        setEditMessage({ type: "success", text: `${editForm.name} updated successfully.` });
        const refreshed = await getAllAttendees();
        setAllAttendees(refreshed);
        const updatedEntry = refreshed.find((e) => e.id === editingId);
        if (updatedEntry) setSelected(updatedEntry);
        setTimeout(() => { setEditingId(null); setEditMessage(null); }, 800);
      } else {
        setEditMessage({ type: "error", text: result.message });
      }
    } catch {
      setEditMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setEditSubmitting(false);
    }
  }

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
        <AttendeeCard entry={selected} onClose={() => setSelected(null)} onEdit={openEdit} />
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto max-h-[92dvh] sm:max-h-[85vh]">
            <div className="bg-[var(--maroon)] px-6 py-4 flex items-center gap-3">
              <FaEdit className="text-white/70" />
              <span className="text-white font-bold flex-1">Edit Attendee</span>
              <button
                type="button"
                onClick={() => { setEditingId(null); setEditMessage(null); }}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
              {editMessage && (
                <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
                  editMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {editMessage.type === "error" && <FaExclamationCircle className="flex-shrink-0" />}
                  {editMessage.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Full Name *</label>
                  <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Email *</label>
                  <input required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Package *</label>
                  <select required value={editForm.package} onChange={(e) => setEditForm({ ...editForm, package: e.target.value, selectedSchedule: e.target.value !== "3lectures" ? "" : editForm.selectedSchedule, customEventIds: e.target.value === "custom" ? editForm.customEventIds : [], customAmount: e.target.value === "custom" ? editForm.customAmount : "" })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors bg-white">
                    <option value="">Select package...</option>
                    {(Object.entries(packageLabels) as [AttendeePackage, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Payment Status *</label>
                  <select required value={editForm.paymentStatus} onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value, balance: e.target.value === "partial" ? editForm.balance : "" })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors bg-white">
                    <option value="">Select status...</option>
                    {(Object.entries(paymentStatusLabels) as [PaymentStatus, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editForm.paymentStatus === "partial" && (
                <div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Balance Due (₱)</label>
                  <input type="number" min="0" step="0.01" value={editForm.balance} onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })} placeholder="Enter remaining balance..." className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors" />
                </div>
              )}

              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Discount</label>
                <select value={editForm.discountType} onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors bg-white">
                  {(Object.entries(discountTypeLabels) as [DiscountType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {editForm.package === "3lectures" && (
                <div>
                  <label className="block text-xs text-[var(--maroon)] uppercase tracking-[1px] mb-2 font-semibold">Select Lecture Schedule *</label>
                  <div className="space-y-1.5">
                    {scheduleOptions.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-3 px-3 py-2.5 border-2 border-gray-200 rounded-xl cursor-pointer has-[:checked]:border-[var(--maroon)] has-[:checked]:bg-[var(--cream-light)] transition-colors">
                        <input type="radio" name="editSchedule" value={opt.value} checked={editForm.selectedSchedule === opt.value} onChange={() => setEditForm({ ...editForm, selectedSchedule: opt.value })} className="accent-[var(--maroon)] w-4 h-4" />
                        <span className="text-sm text-gray-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {editForm.package === "custom" && (
                <div>
                  <label className="block text-xs text-[var(--maroon)] uppercase tracking-[1px] mb-2 font-semibold">Select Accessible Events *</label>
                  <div className="space-y-1.5 mb-3">
                    {events.map((ev) => (
                      <label key={ev.id} className="flex items-center gap-3 px-3 py-2.5 border-2 border-gray-200 rounded-xl cursor-pointer has-[:checked]:border-[var(--maroon)] has-[:checked]:bg-[var(--cream-light)] transition-colors">
                        <input type="checkbox" checked={editForm.customEventIds.includes(ev.id)} onChange={(e) => { const updated = e.target.checked ? [...editForm.customEventIds, ev.id] : editForm.customEventIds.filter((id) => id !== ev.id); setEditForm({ ...editForm, customEventIds: updated }); }} className="accent-[var(--maroon)] w-4 h-4" />
                        <span className="flex-1 text-sm text-gray-800">{ev.name}</span>
                        <span className="text-xs text-[var(--gray)]">{ev.date}</span>
                      </label>
                    ))}
                  </div>
                  <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Custom Amount (₱)</label>
                  <input type="number" min="0" step="0.01" value={editForm.customAmount} onChange={(e) => setEditForm({ ...editForm, customAmount: e.target.value })} placeholder="Enter total amount..." className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors" />
                </div>
              )}

              {editForm.package && editForm.package !== "custom" && (() => {
                const pct = getDiscountPercent(editForm.discountType as DiscountType, editForm.package as AttendeePackage);
                const original = packagePrices[editForm.package as AttendeePackage];
                const finalAmt = Math.round(original * (1 - pct / 100));
                return (
                  <div className="bg-[var(--cream-light)] border-2 border-[var(--cream)] rounded-xl px-4 py-3">
                    <div className="text-xs text-[var(--gray)] uppercase tracking-[1px] mb-2 font-semibold">Payment Summary</div>
                    <div className="flex justify-between text-sm text-gray-700 mb-1">
                      <span>Original</span><span>₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {pct > 0 && (
                      <div className="flex justify-between text-sm text-[var(--green)] mb-1">
                        <span>Discount ({pct}%)</span><span>-₱{(original * pct / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-[var(--maroon)] border-t border-[var(--cream)] pt-2 mt-1">
                      <span>Total</span><span>₱{finalAmt.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs text-[var(--gray)] uppercase tracking-[1px] mb-1.5 font-semibold">Staff Notes</label>
                <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors resize-none" />
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                className="w-full bg-[var(--maroon)] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
