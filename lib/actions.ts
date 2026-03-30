"use server";

import { connectDB } from "@/lib/mongodb";
import { AttendeeModel } from "@/lib/models/Attendee";
import {
  type Attendee,
  type AttendeePackage,
  type PaymentStatus,
  type ScheduleOption,
  packageLabels,
  attendees as fallbackAttendees,
} from "@/lib/data";

export async function verifyAdmin(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return false;
  }
  return password === adminPassword;
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
  const notes = formData.get("notes") as string;

  if (!name || !email || !pkg || !paymentStatus) {
    return { success: false, message: "Name, email, package, and payment status are required." };
  }

  if (pkg === "3lectures" && !selectedSchedule) {
    return { success: false, message: "Please select a lecture schedule for Package B." };
  }

  try {
    await connectDB();

    const count = await AttendeeModel.countDocuments();
    const id = generateId(count + 1);

    await AttendeeModel.create({
      attendeeId: id,
      name: name.trim(),
      email: email.trim(),
      phone: (phone || "").trim(),
      package: pkg,
      packageLabel: packageLabels[pkg],
      selectedSchedule: pkg === "3lectures" ? selectedSchedule : null,
      registrationDate: new Date().toISOString().split("T")[0],
      paymentStatus,
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
        notes: doc.notes,
      };
    }
  } catch (error) {
    console.error("MongoDB lookup failed, falling back to static data:", error);
  }

  return fallbackAttendees[normalized] || null;
}

export async function getAllAttendees(): Promise<
  { id: string; attendee: Attendee }[]
> {
  const results: { id: string; attendee: Attendee }[] = [];

  try {
    await connectDB();
    const docs = await AttendeeModel.find().sort({ attendeeId: 1 }).lean();

    for (const doc of docs) {
      results.push({
        id: doc.attendeeId,
        attendee: {
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          package: doc.package as AttendeePackage,
          packageLabel: doc.packageLabel,
          selectedSchedule: (doc.selectedSchedule as ScheduleOption) || null,
          registrationDate: doc.registrationDate,
          paymentStatus: doc.paymentStatus as PaymentStatus,
          notes: doc.notes,
        },
      });
    }

    if (results.length > 0) return results;
  } catch (error) {
    console.error("MongoDB fetch failed, falling back to static data:", error);
  }

  for (const [id, attendee] of Object.entries(fallbackAttendees)) {
    results.push({ id, attendee });
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
  const notes = formData.get("notes") as string;

  if (!name || !email || !pkg || !paymentStatus) {
    return { success: false, message: "Name, email, package, and payment status are required." };
  }

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
        paymentStatus,
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
