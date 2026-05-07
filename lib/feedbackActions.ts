"use server";

import { connectDB } from "@/lib/mongodb";
import { FeedbackModel } from "@/lib/models/Feedback";
import {
  SPEAKERS,
  EVENT_EXPERIENCE_ITEMS,
  SERVICE_EXPERIENCE_ITEMS,
  type FeedbackResponse,
  type SpeakerId,
  type SpeakerRating,
  type EventExperienceItemId,
  type ServiceExperienceItemId,
} from "@/lib/feedback";

export interface FeedbackStatus {
  submitted: boolean;
  submittedAt?: string; // formatted PH time
}

function fmtDate(d: Date): string {
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function getFeedbackStatus(
  attendeeId: string
): Promise<FeedbackStatus> {
  try {
    await connectDB();
    const doc = await FeedbackModel.findOne({ attendeeId })
      .select("submittedAt")
      .lean<{ submittedAt: Date } | null>();
    if (!doc) return { submitted: false };
    return {
      submitted: true,
      submittedAt: fmtDate(new Date(doc.submittedAt)),
    };
  } catch (error) {
    console.error("Failed to fetch feedback status:", error);
    return { submitted: false };
  }
}

export interface FeedbackSubmission {
  name: string;
  fieldOfWork: string;
  fieldOfWorkOther?: string;
  occupationRole: string;
  affiliation: string;
  hearAbout: string;
  hearAboutOther?: string;
  packageAvailed: string;
  speakerRatings: Record<string, string>;
  speakerComments: string;
  conferenceTopicsRating: number;
  eventExperience: Record<string, number>;
  serviceExperience: Record<string, number>;
  overallExperience: number;
  improvements: string;
  privacyConsent: boolean;
}

export async function submitFeedback(
  attendeeId: string,
  data: FeedbackSubmission
): Promise<{ success: boolean; message: string }> {
  // Validate required fields
  if (!data.name?.trim()) {
    return { success: false, message: "Name is required." };
  }
  if (!data.fieldOfWork) {
    return { success: false, message: "Field of work is required." };
  }
  if (data.fieldOfWork === "Other" && !data.fieldOfWorkOther?.trim()) {
    return { success: false, message: "Please specify your field of work." };
  }
  if (!data.occupationRole?.trim()) {
    return { success: false, message: "Occupation/role is required." };
  }
  if (!data.affiliation?.trim()) {
    return { success: false, message: "Affiliation is required." };
  }
  if (!data.hearAbout) {
    return { success: false, message: "Please answer how you heard about the event." };
  }
  if (data.hearAbout === "Other" && !data.hearAboutOther?.trim()) {
    return { success: false, message: "Please specify how you heard about the event." };
  }
  if (!data.packageAvailed) {
    return { success: false, message: "Please select your package." };
  }

  // Speaker ratings: every speaker required
  for (const s of SPEAKERS) {
    const v = data.speakerRatings?.[s.id];
    if (!v || !["good", "very_good", "excellent"].includes(v)) {
      return { success: false, message: `Please rate ${s.name}.` };
    }
  }
  if (!data.speakerComments?.trim()) {
    return { success: false, message: "Please share what you appreciated about the speakers." };
  }
  if (!Number.isInteger(data.conferenceTopicsRating) || data.conferenceTopicsRating < 1 || data.conferenceTopicsRating > 5) {
    return { success: false, message: "Please rate the conference topics (1-5)." };
  }

  for (const item of EVENT_EXPERIENCE_ITEMS) {
    const v = data.eventExperience?.[item.id];
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return { success: false, message: `Please rate ${item.label}.` };
    }
  }
  for (const item of SERVICE_EXPERIENCE_ITEMS) {
    const v = data.serviceExperience?.[item.id];
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return { success: false, message: `Please rate ${item.label}.` };
    }
  }
  if (!Number.isInteger(data.overallExperience) || data.overallExperience < 1 || data.overallExperience > 5) {
    return { success: false, message: "Please rate the overall conference experience." };
  }
  if (!data.improvements?.trim()) {
    return { success: false, message: "Please share at least one suggested improvement." };
  }
  if (data.privacyConsent !== true) {
    return {
      success: false,
      message: "You must agree to the Data Privacy Notice before submitting.",
    };
  }

  try {
    await connectDB();
    await FeedbackModel.findOneAndUpdate(
      { attendeeId },
      {
        attendeeId,
        submittedAt: new Date(),
        name: data.name.trim(),
        fieldOfWork: data.fieldOfWork,
        fieldOfWorkOther: (data.fieldOfWorkOther ?? "").trim(),
        occupationRole: data.occupationRole.trim(),
        affiliation: data.affiliation.trim(),
        hearAbout: data.hearAbout,
        hearAboutOther: (data.hearAboutOther ?? "").trim(),
        packageAvailed: data.packageAvailed,
        speakerRatings: data.speakerRatings,
        speakerComments: data.speakerComments.trim(),
        conferenceTopicsRating: data.conferenceTopicsRating,
        eventExperience: data.eventExperience,
        serviceExperience: data.serviceExperience,
        overallExperience: data.overallExperience,
        improvements: data.improvements.trim(),
        privacyConsent: data.privacyConsent,
      },
      { upsert: true, new: true }
    );

    return { success: true, message: "Feedback submitted. Thank you!" };
  } catch (error) {
    console.error("Failed to save feedback:", error);
    return { success: false, message: "Failed to save feedback." };
  }
}

export async function getFeedbackForAttendee(
  attendeeId: string
): Promise<FeedbackResponse | null> {
  try {
    await connectDB();
    const doc = await FeedbackModel.findOne({ attendeeId }).lean<
      Record<string, unknown> & { submittedAt: Date }
    >();
    if (!doc) return null;
    return {
      attendeeId: doc.attendeeId as string,
      submittedAt: new Date(doc.submittedAt).toISOString(),
      name: (doc.name as string) ?? "",
      fieldOfWork: (doc.fieldOfWork as string) ?? "",
      fieldOfWorkOther: (doc.fieldOfWorkOther as string) ?? "",
      occupationRole: (doc.occupationRole as string) ?? "",
      affiliation: (doc.affiliation as string) ?? "",
      hearAbout: (doc.hearAbout as string) ?? "",
      hearAboutOther: (doc.hearAboutOther as string) ?? "",
      packageAvailed: (doc.packageAvailed as string) ?? "",
      speakerRatings: (doc.speakerRatings as Record<SpeakerId, SpeakerRating>) ?? {} as Record<SpeakerId, SpeakerRating>,
      speakerComments: (doc.speakerComments as string) ?? "",
      conferenceTopicsRating: (doc.conferenceTopicsRating as number) ?? 0,
      eventExperience: (doc.eventExperience as Record<EventExperienceItemId, number>) ?? {} as Record<EventExperienceItemId, number>,
      serviceExperience: (doc.serviceExperience as Record<ServiceExperienceItemId, number>) ?? {} as Record<ServiceExperienceItemId, number>,
      overallExperience: (doc.overallExperience as number) ?? 0,
      improvements: (doc.improvements as string) ?? "",
      privacyConsent: (doc.privacyConsent as boolean) ?? true,
    };
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    return null;
  }
}

export async function getAllFeedback(): Promise<FeedbackResponse[]> {
  try {
    await connectDB();
    const docs = await FeedbackModel.find().sort({ submittedAt: -1 }).lean<
      (Record<string, unknown> & { submittedAt: Date })[]
    >();
    return docs.map((doc) => ({
      attendeeId: doc.attendeeId as string,
      submittedAt: new Date(doc.submittedAt).toISOString(),
      name: (doc.name as string) ?? "",
      fieldOfWork: (doc.fieldOfWork as string) ?? "",
      fieldOfWorkOther: (doc.fieldOfWorkOther as string) ?? "",
      occupationRole: (doc.occupationRole as string) ?? "",
      affiliation: (doc.affiliation as string) ?? "",
      hearAbout: (doc.hearAbout as string) ?? "",
      hearAboutOther: (doc.hearAboutOther as string) ?? "",
      packageAvailed: (doc.packageAvailed as string) ?? "",
      speakerRatings: (doc.speakerRatings as Record<SpeakerId, SpeakerRating>) ?? {} as Record<SpeakerId, SpeakerRating>,
      speakerComments: (doc.speakerComments as string) ?? "",
      conferenceTopicsRating: (doc.conferenceTopicsRating as number) ?? 0,
      eventExperience: (doc.eventExperience as Record<EventExperienceItemId, number>) ?? {} as Record<EventExperienceItemId, number>,
      serviceExperience: (doc.serviceExperience as Record<ServiceExperienceItemId, number>) ?? {} as Record<ServiceExperienceItemId, number>,
      overallExperience: (doc.overallExperience as number) ?? 0,
      improvements: (doc.improvements as string) ?? "",
      privacyConsent: (doc.privacyConsent as boolean) ?? true,
    }));
  } catch (error) {
    console.error("Failed to fetch all feedback:", error);
    return [];
  }
}

export async function resetFeedback(
  attendeeId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await connectDB();
    const result = await FeedbackModel.deleteOne({ attendeeId });
    if (result.deletedCount === 0) {
      return { success: false, message: "No feedback found for this attendee." };
    }
    return { success: true, message: "Feedback reset. Attendee can submit again." };
  } catch (error) {
    console.error("Failed to reset feedback:", error);
    return { success: false, message: "Failed to reset feedback." };
  }
}
