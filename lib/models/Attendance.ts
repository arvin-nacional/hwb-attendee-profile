import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  attendeeId: string;
  attendeeName: string;
  eventId: string;
  checkedInAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    attendeeId: { type: String, required: true },
    attendeeName: { type: String, required: true },
    eventId: { type: String, required: true },
    checkedInAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AttendanceSchema.index({ attendeeId: 1, eventId: 1 }, { unique: true });

export const AttendanceModel =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
