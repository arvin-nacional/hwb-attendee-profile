import mongoose, { Schema, Document } from "mongoose";
import type { AttendeePackage, PaymentStatus, ScheduleOption } from "@/lib/data";

export interface IAttendee extends Document {
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  package: AttendeePackage;
  selectedSchedule: ScheduleOption | null;
  packageLabel: string;
  registrationDate: string;
  paymentStatus: PaymentStatus;
  notes: string;
}

const AttendeeSchema = new Schema<IAttendee>(
  {
    attendeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    package: {
      type: String,
      required: true,
      enum: ["conference", "3lectures", "5lectures", "full"],
    },
    packageLabel: { type: String, required: true },
    selectedSchedule: { type: String, default: null },
    registrationDate: { type: String, required: true },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["fully_paid", "downpayment_50"],
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AttendeeModel =
  mongoose.models.Attendee ||
  mongoose.model<IAttendee>("Attendee", AttendeeSchema);
