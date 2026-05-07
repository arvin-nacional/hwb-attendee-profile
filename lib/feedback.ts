// ─── Feedback question constants & types ──────────────────────────────────

export const SPEAKERS = [
  { id: "kate_seymour", name: "Ms. Kate Seymour" },
  { id: "gemma_cruz_araneta", name: "Ms. Gemma Cruz Araneta" },
  { id: "cecille_torrevillas_goticame", name: "Ms. Cecille Torrevillas Goticame" },
  { id: "yna_penas", name: "Arch. Yna Peñas" },
  { id: "evecar_cruz_ferrer", name: "Atty. Evecar Cruz Ferrer" },
] as const;

export type SpeakerId = (typeof SPEAKERS)[number]["id"];

export const SPEAKER_RATINGS = [
  { value: "good", label: "Good" },
  { value: "very_good", label: "Very Good" },
  { value: "excellent", label: "Excellent" },
] as const;

export type SpeakerRating = (typeof SPEAKER_RATINGS)[number]["value"];

export const FIVE_POINT_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Mediocre",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};

export const EVENT_EXPERIENCE_ITEMS = [
  { id: "venue", label: "Venue" },
  { id: "sounds_visuals", label: "Sounds & Visuals" },
  { id: "value_for_money", label: "Value for Money" },
  { id: "food", label: "Food" },
  { id: "overall_service", label: "Overall Service" },
] as const;

export type EventExperienceItemId = (typeof EVENT_EXPERIENCE_ITEMS)[number]["id"];

export const SERVICE_EXPERIENCE_ITEMS = [
  { id: "website", label: "Website" },
  { id: "registration_process", label: "Registration Process" },
  { id: "onsite_assistance", label: "On-site Assistance" },
] as const;

export type ServiceExperienceItemId = (typeof SERVICE_EXPERIENCE_ITEMS)[number]["id"];

export const FIELD_OF_WORK_OPTIONS = [
  "Art Conservation / Restoration",
  "Museum / Gallery",
  "Academe / Education",
  "Cultural Heritage / Government",
  "Architecture / Design",
  "Student",
  "Independent / Freelancer",
  "Other",
] as const;

export const HEAR_ABOUT_OPTIONS = [
  "Social Media",
  "Website",
  "Direct / Email Invitation",
  "Colleague / Referral",
  "Organization / Institution",
  "Other",
] as const;

export const PACKAGE_OPTIONS = [
  "Package A: Conference Only",
  "Package B: Conference + Three (3) Lecture Days",
  "Package C: Conference + Five (5) Lecture Days",
  "Package D: Full (Conference, Lectures and Workshop)",
] as const;

export interface FeedbackResponse {
  attendeeId: string;
  submittedAt: string; // ISO string
  name: string;
  fieldOfWork: string;
  fieldOfWorkOther: string;
  occupationRole: string;
  affiliation: string;
  hearAbout: string;
  hearAboutOther: string;
  packageAvailed: string;
  speakerRatings: Record<SpeakerId, SpeakerRating>;
  speakerComments: string;
  conferenceTopicsRating: number;
  eventExperience: Record<EventExperienceItemId, number>;
  serviceExperience: Record<ServiceExperienceItemId, number>;
  overallExperience: number;
  improvements: string;
  privacyConsent: boolean;
}
