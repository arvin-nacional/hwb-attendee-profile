"use server";

import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { encryptId, decryptId } from "@/lib/crypto";
import { connectDB } from "@/lib/mongodb";
import { AttendeeModel } from "@/lib/models/Attendee";
import {
  type Attendee,
  type AttendeePackage,
  type PaymentStatus,
  type ScheduleOption,
  type DiscountType,
  packageLabels,
  packagePrices,
  getDiscountPercent,
  attendees as fallbackAttendees,
} from "@/lib/data";

export async function verifyAdmin(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return false;
  }
  return password === adminPassword;
}

const SESSION_COOKIE = "hwb_admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function computeSessionToken(password: string): string {
  return createHmac("sha256", password)
    .update("hwb-admin-session-v1")
    .digest("hex");
}

export async function createAdminSession(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) return false;
  const token = computeSessionToken(adminPassword);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}

export async function checkAdminSession(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return false;
  const expected = computeSessionToken(adminPassword);
  return cookie.value === expected;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function encryptAttendeeId(id: string): Promise<string> {
  return encryptId(id);
}

export async function getAttendeeByToken(
  token: string
): Promise<{ id: string; attendee: Attendee } | null> {
  const decrypted = decryptId(token);
  const id = decrypted || token.trim().toUpperCase();
  const attendee = await getAttendee(id);
  if (!attendee) return null;
  return { id, attendee };
}

function generateId(counter: number): string {
  return `HWB-2026-${String(counter).padStart(4, "0")}`;
}

export async function addAttendee(formData: FormData): Promise<{
  success: boolean;
  message: string;
  id?: string;
}> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const pkg = formData.get("package") as AttendeePackage;
  const selectedSchedule = formData.get("selectedSchedule") as ScheduleOption | null;
  const paymentStatus = formData.get("paymentStatus") as PaymentStatus;
  const discountType = (formData.get("discountType") as DiscountType) || "none";
  const balanceRaw = formData.get("balance") as string;
  const notes = formData.get("notes") as string;

  if (!name || !email || !pkg) {
    return { success: false, message: "Name, email, and package are required." };
  }

  if (pkg !== "guest" && !paymentStatus) {
    return { success: false, message: "Payment status is required." };
  }

  if (pkg === "3lectures" && !selectedSchedule) {
    return { success: false, message: "Please select a lecture schedule for Package B." };
  }

  const effectivePaymentStatus: PaymentStatus = pkg === "guest" ? "fully_paid" : paymentStatus;
  const discountPercent = pkg === "guest" ? 0 : getDiscountPercent(discountType, pkg);
  const originalAmount = pkg === "guest" ? 0 : packagePrices[pkg];
  const finalAmount = pkg === "guest" ? 0 : Math.round(originalAmount * (1 - discountPercent / 100));
  const balance =
    pkg === "guest" ? 0 :
    effectivePaymentStatus === "fully_paid" ? 0 :
    effectivePaymentStatus === "downpayment_50" ? Math.round(finalAmount / 2) :
    (parseFloat(balanceRaw) || 0);

  try {
    await connectDB();

    const last = await AttendeeModel.findOne().sort({ attendeeId: -1 }).select("attendeeId").lean();
    const lastNum = last ? parseInt((last as { attendeeId: string }).attendeeId.split("-")[2], 10) : 0;
    const id = generateId(lastNum + 1);

    await AttendeeModel.create({
      attendeeId: id,
      name: name.trim(),
      email: email.trim(),
      phone: (phone || "").trim(),
      package: pkg,
      packageLabel: packageLabels[pkg],
      selectedSchedule: pkg === "3lectures" ? selectedSchedule : null,
      registrationDate: new Date().toISOString().split("T")[0],
      paymentStatus: effectivePaymentStatus,
      discountType,
      discountPercent,
      originalAmount,
      finalAmount,
      balance,
      notes: (notes || "").trim(),
    });

    return { success: true, message: `Attendee added successfully.`, id };
  } catch (error) {
    console.error("Failed to add attendee:", error);
    const msg = error instanceof Error ? error.message : "Failed to add attendee.";
    return { success: false, message: msg };
  }
}

export async function getAttendee(id: string): Promise<Attendee | null> {
  const normalized = id.trim().toUpperCase();

  try {
    await connectDB();
    const doc = await AttendeeModel.findOne({ attendeeId: normalized }).lean();
    if (doc) {
      return {
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        package: doc.package as AttendeePackage,
        packageLabel: doc.packageLabel,
        selectedSchedule: (doc.selectedSchedule as ScheduleOption) || null,
        registrationDate: doc.registrationDate,
        paymentStatus: doc.paymentStatus as PaymentStatus,
        discountType: (doc.discountType as DiscountType) || "none",
        discountPercent: doc.discountPercent ?? 0,
        originalAmount: doc.originalAmount ?? packagePrices[doc.package as AttendeePackage] ?? 0,
        finalAmount: doc.finalAmount ?? packagePrices[doc.package as AttendeePackage] ?? 0,
        balance: doc.balance ?? 0,
        notes: doc.notes,
      };
    }
  } catch (error) {
    console.error("MongoDB lookup failed, falling back to static data:", error);
  }

  return fallbackAttendees[normalized] || null;
}

export async function getAllAttendees(): Promise<
  { id: string; attendee: Attendee; token: string }[]
> {
  const results: { id: string; attendee: Attendee; token: string }[] = [];

  try {
    await connectDB();
    const docs = await AttendeeModel.find().sort({ attendeeId: -1 }).lean();

    for (const doc of docs) {
      results.push({
        id: doc.attendeeId,
        token: encryptId(doc.attendeeId),
        attendee: {
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          package: doc.package as AttendeePackage,
          packageLabel: doc.packageLabel,
          selectedSchedule: (doc.selectedSchedule as ScheduleOption) || null,
          registrationDate: doc.registrationDate,
          paymentStatus: doc.paymentStatus as PaymentStatus,
          discountType: (doc.discountType as DiscountType) || "none",
          discountPercent: doc.discountPercent ?? 0,
          originalAmount: doc.originalAmount ?? packagePrices[doc.package as AttendeePackage] ?? 0,
          finalAmount: doc.finalAmount ?? packagePrices[doc.package as AttendeePackage] ?? 0,
          balance: doc.balance ?? 0,
          notes: doc.notes,
        },
      });
    }

    if (results.length > 0) return results;
  } catch (error) {
    console.error("MongoDB fetch failed, falling back to static data:", error);
  }

  for (const [id, attendee] of Object.entries(fallbackAttendees)) {
    results.push({ id, attendee, token: encryptId(id) });
  }
  return results;
}

export async function deleteAttendee(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await connectDB();
    const result = await AttendeeModel.deleteOne({ attendeeId: id });
    if (result.deletedCount === 0) {
      return { success: false, message: `Attendee ${id} not found.` };
    }
    return { success: true, message: `Attendee ${id} deleted.` };
  } catch (error) {
    console.error("Failed to delete attendee:", error);
    return { success: false, message: "Failed to delete attendee." };
  }
}

export async function updateAttendee(
  id: string,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const pkg = formData.get("package") as AttendeePackage;
  const selectedSchedule = formData.get("selectedSchedule") as ScheduleOption | null;
  const paymentStatus = formData.get("paymentStatus") as PaymentStatus;
  const discountType = (formData.get("discountType") as DiscountType) || "none";
  const balanceRaw = formData.get("balance") as string;
  const notes = formData.get("notes") as string;

  if (!name || !email || !pkg) {
    return { success: false, message: "Name, email, and package are required." };
  }

  if (pkg !== "guest" && !paymentStatus) {
    return { success: false, message: "Payment status is required." };
  }

  const effectivePaymentStatus: PaymentStatus = pkg === "guest" ? "fully_paid" : paymentStatus;
  const discountPercent = pkg === "guest" ? 0 : getDiscountPercent(discountType, pkg);
  const originalAmount = pkg === "guest" ? 0 : packagePrices[pkg];
  const finalAmount = pkg === "guest" ? 0 : Math.round(originalAmount * (1 - discountPercent / 100));
  const balance =
    pkg === "guest" ? 0 :
    effectivePaymentStatus === "fully_paid" ? 0 :
    effectivePaymentStatus === "downpayment_50" ? Math.round(finalAmount / 2) :
    (parseFloat(balanceRaw) || 0);

  try {
    await connectDB();

    const result = await AttendeeModel.findOneAndUpdate(
      { attendeeId: id },
      {
        name: name.trim(),
        email: email.trim(),
        phone: (phone || "").trim(),
        package: pkg,
        packageLabel: packageLabels[pkg],
        selectedSchedule: pkg === "3lectures" ? selectedSchedule : null,
        paymentStatus: effectivePaymentStatus,
        discountType,
        discountPercent,
        originalAmount,
        finalAmount,
        balance,
        notes: (notes || "").trim(),
      },
      { new: true }
    );

    if (!result) {
      return { success: false, message: `Attendee ${id} not found.` };
    }

    return { success: true, message: `Attendee ${id} updated.` };
  } catch (error) {
    console.error("Failed to update attendee:", error);
    return { success: false, message: "Failed to update attendee." };
  }
}
