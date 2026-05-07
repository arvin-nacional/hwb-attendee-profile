import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  attendeeId: string;
  submittedAt: Date;

  name: string;
  fieldOfWork: string;
  fieldOfWorkOther: string;
  occupationRole: string;
  affiliation: string;
  hearAbout: string;
  hearAboutOther: string;
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

const FeedbackSchema = new Schema<IFeedback>(
  {
    attendeeId: { type: String, required: true, unique: true, index: true },
    submittedAt: { type: Date, default: Date.now },

    name: { type: String, required: true },
    fieldOfWork: { type: String, default: "" },
    fieldOfWorkOther: { type: String, default: "" },
    occupationRole: { type: String, default: "" },
    affiliation: { type: String, default: "" },
    hearAbout: { type: String, default: "" },
    hearAboutOther: { type: String, default: "" },
    packageAvailed: { type: String, default: "" },

    speakerRatings: { type: Schema.Types.Mixed, default: {} },
    speakerComments: { type: String, default: "" },
    conferenceTopicsRating: { type: Number, default: 0 },
    eventExperience: { type: Schema.Types.Mixed, default: {} },
    serviceExperience: { type: Schema.Types.Mixed, default: {} },
    overallExperience: { type: Number, default: 0 },
    improvements: { type: String, default: "" },
    privacyConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const FeedbackModel =
  mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);
