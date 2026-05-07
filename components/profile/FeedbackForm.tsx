"use client";

import { useState } from "react";
import { FaTimes, FaCheckCircle, FaSpinner, FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { submitFeedback, type FeedbackSubmission } from "@/lib/feedbackActions";
import {
  SPEAKERS,
  SPEAKER_RATINGS,
  EVENT_EXPERIENCE_ITEMS,
  SERVICE_EXPERIENCE_ITEMS,
  FIELD_OF_WORK_OPTIONS,
  HEAR_ABOUT_OPTIONS,
  PACKAGE_OPTIONS,
  FIVE_POINT_LABELS,
  type SpeakerId,
  type SpeakerRating,
  type EventExperienceItemId,
  type ServiceExperienceItemId,
  type FeedbackResponse,
} from "@/lib/feedback";
import type { AttendeePackage } from "@/lib/data";

const TOTAL_STEPS = 3;

const PACKAGE_TO_FORM: Partial<Record<AttendeePackage, string>> = {
  conference: PACKAGE_OPTIONS[0],
  "3lectures": PACKAGE_OPTIONS[1],
  "5lectures": PACKAGE_OPTIONS[2],
  full: PACKAGE_OPTIONS[3],
};

interface Answers {
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

interface Props {
  attendeeId: string;
  prefillName: string;
  prefillPackage: AttendeePackage;
  existingResponse?: FeedbackResponse | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function buildInitialAnswers(
  prefillName: string,
  prefillPackage: AttendeePackage,
  existing?: FeedbackResponse | null
): Answers {
  if (existing) {
    return {
      name: existing.name,
      fieldOfWork: existing.fieldOfWork,
      fieldOfWorkOther: existing.fieldOfWorkOther,
      occupationRole: existing.occupationRole,
      affiliation: existing.affiliation,
      hearAbout: existing.hearAbout,
      hearAboutOther: existing.hearAboutOther,
      packageAvailed: existing.packageAvailed,
      speakerRatings: { ...existing.speakerRatings },
      speakerComments: existing.speakerComments,
      conferenceTopicsRating: existing.conferenceTopicsRating,
      eventExperience: { ...existing.eventExperience },
      serviceExperience: { ...existing.serviceExperience },
      overallExperience: existing.overallExperience,
      improvements: existing.improvements,
      privacyConsent: existing.privacyConsent,
    };
  }
  return {
    name: prefillName,
    fieldOfWork: "",
    fieldOfWorkOther: "",
    occupationRole: "",
    affiliation: "",
    hearAbout: "",
    hearAboutOther: "",
    packageAvailed: PACKAGE_TO_FORM[prefillPackage] ?? "",
    speakerRatings: {},
    speakerComments: "",
    conferenceTopicsRating: 0,
    eventExperience: {},
    serviceExperience: {},
    overallExperience: 0,
    improvements: "",
    privacyConsent: false,
  };
}

export function FeedbackForm({
  attendeeId,
  prefillName,
  prefillPackage,
  existingResponse,
  onClose,
  onSubmitted,
}: Props) {
  const isEditing = !!existingResponse;
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>(() =>
    buildInitialAnswers(prefillName, prefillPackage, existingResponse)
  );

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function setSpeakerRating(id: SpeakerId, value: SpeakerRating) {
    setAnswers((prev) => ({
      ...prev,
      speakerRatings: { ...prev.speakerRatings, [id]: value },
    }));
  }

  function setEventRating(id: EventExperienceItemId, value: number) {
    setAnswers((prev) => ({
      ...prev,
      eventExperience: { ...prev.eventExperience, [id]: value },
    }));
  }

  function setServiceRating(id: ServiceExperienceItemId, value: number) {
    setAnswers((prev) => ({
      ...prev,
      serviceExperience: { ...prev.serviceExperience, [id]: value },
    }));
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!answers.privacyConsent)
        return "Please read and agree to the Data Privacy Notice to continue.";
      if (!answers.name.trim()) return "Please enter your name.";
      if (!answers.fieldOfWork) return "Please select your field of work.";
      if (answers.fieldOfWork === "Other" && !answers.fieldOfWorkOther.trim())
        return "Please specify your field of work.";
      if (!answers.occupationRole.trim()) return "Please enter your occupation/role.";
      if (!answers.affiliation.trim()) return "Please enter your affiliation.";
      if (!answers.hearAbout) return "Please answer how you heard about the event.";
      if (answers.hearAbout === "Other" && !answers.hearAboutOther.trim())
        return "Please specify how you heard about the event.";
      if (!answers.packageAvailed) return "Please select your package.";
    }
    if (s === 2) {
      for (const sp of SPEAKERS) {
        if (!answers.speakerRatings[sp.id]) return `Please rate ${sp.name}.`;
      }
      if (!answers.speakerComments.trim())
        return "Please share what you appreciated about the speakers.";
      if (!answers.conferenceTopicsRating) return "Please rate the conference topics.";
      for (const item of EVENT_EXPERIENCE_ITEMS) {
        if (!answers.eventExperience[item.id]) return `Please rate ${item.label}.`;
      }
      for (const item of SERVICE_EXPERIENCE_ITEMS) {
        if (!answers.serviceExperience[item.id]) return `Please rate ${item.label}.`;
      }
      if (!answers.overallExperience)
        return "Please rate the overall conference experience.";
    }
    if (s === 3) {
      if (!answers.improvements.trim())
        return "Please share at least one suggested improvement.";
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  async function handleSubmit() {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: FeedbackSubmission = { ...answers };
      const result = await submitFeedback(attendeeId, payload);
      if (result.success) {
        onSubmitted();
      } else {
        setError(result.message);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-6 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--maroon)] to-[var(--maroon-dark)] px-8 py-6 text-white flex items-center justify-between max-sm:px-5 max-sm:py-5">
          <div className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold max-sm:text-lg">
              Heritage Without Borders 2026 — Evaluation Form
            </h2>
            <p className="text-xs opacity-80 mt-1">
              Step {step} of {TOTAL_STEPS} ·{" "}
              {isEditing ? "Editing your previous responses" : "Required to unlock your certificate"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-lg ml-4 flex-shrink-0"
            title="Close"
            disabled={submitting}
          >
            <FaTimes />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-[var(--gold)] transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-8 py-6 max-sm:px-5 max-sm:py-5">
          {step === 1 && (
            <Step1
              answers={answers}
              update={update}
            />
          )}
          {step === 2 && (
            <Step2
              answers={answers}
              update={update}
              setSpeakerRating={setSpeakerRating}
              setEventRating={setEventRating}
              setServiceRating={setServiceRating}
            />
          )}
          {step === 3 && (
            <Step3 answers={answers} update={update} isEditing={isEditing} />
          )}

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--red-bg)] text-[var(--red)] text-sm font-medium border-2 border-red-200 flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between gap-3 max-sm:px-5">
          <button
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FaArrowLeft className="text-xs" />
            Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-[var(--maroon)] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[var(--maroon-dark)] transition-colors"
            >
              Next
              <FaArrowRight className="text-xs" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-[var(--maroon)] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[var(--maroon-dark)] transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" />
                  {isEditing ? "Updating..." : "Submitting..."}
                </>
              ) : (
                <>
                  <FaCheckCircle className="text-sm" />
                  {isEditing ? "Update Feedback" : "Submit Feedback"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="bg-[var(--maroon)] text-white px-4 py-3 rounded-lg mb-5">
      <h3 className="font-bold text-sm">{title}</h3>
      {subtitle && <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Label({ children, required = true }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-800 mb-2">
      {children}
      {required && <span className="text-[var(--red)] ml-1">*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--maroon)] transition-colors"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--maroon)] transition-colors resize-y"
    />
  );
}

function RadioList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 px-4 py-2.5 border-2 rounded-lg cursor-pointer transition-colors text-sm ${
            value === opt
              ? "border-[var(--maroon)] bg-[var(--cream-light)]"
              : "border-gray-200 hover:border-[var(--maroon-light)]"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-[var(--maroon)] w-4 h-4"
          />
          <span className="text-gray-800">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function PrivacyNotice({
  consent,
  onChange,
}: {
  consent: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="border-2 border-[var(--maroon)]/15 rounded-xl bg-[var(--cream-light)] overflow-hidden">
      <div className="bg-[var(--maroon)] text-white px-4 py-2.5">
        <h3 className="font-bold text-sm tracking-wide">
          DATA PRIVACY CONSENT FORM
          <span className="text-[var(--gold)] ml-1">*</span>
        </h3>
      </div>

      <div className="px-5 py-4 space-y-3 text-sm text-gray-800 leading-relaxed">
        <p>
          By signing this form/clicking &ldquo;Submit,&rdquo; I hereby grant{" "}
          <strong>Sanfo101</strong> the right to collect, process, store, and share my personal
          data (name, email, address, etc.) in accordance with the Data Privacy Act of 2012.
        </p>

        <p>I understand that the information I provide is necessary for the following purposes:</p>

        <ul className="list-disc pl-6 space-y-1.5">
          <li>Processing my registration and account creation</li>
          <li>Verifying my identity</li>
          <li>Sending updates, marketing, or information regarding services</li>
          <li>
            I am aware that I have the right to be informed, to object to processing, to access,
            to rectify, or to erase my personal data, as provided under the Data Privacy Act of
            2012.
          </li>
        </ul>

        <p>
          I understand that <strong>the Company</strong> will retain my data only for as long as
          necessary for the purpose indicated above, or as required by law.
        </p>
      </div>

      <label
        className={`flex items-start gap-3 px-5 py-4 border-t-2 cursor-pointer transition-colors ${
          consent
            ? "bg-[var(--green-bg)] border-[var(--green)]/30"
            : "bg-white border-[var(--maroon)]/15 hover:bg-gray-50"
        }`}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--maroon)] w-5 h-5 mt-0.5 flex-shrink-0"
        />
        <span className="text-sm font-semibold text-gray-800">
          I have read and agree to the Data Privacy Notice.
          <span className="text-[var(--red)] ml-1">*</span>
        </span>
      </label>
    </div>
  );
}

function FivePointScale({
  value,
  onChange,
  leftLabel = "Poor",
  rightLabel = "Excellent",
}: {
  value: number;
  onChange: (n: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      <span className="text-xs font-semibold text-[var(--gray)] flex-shrink-0">{leftLabel}</span>
      <div className="flex items-center gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-xs text-[var(--gray)]">{n}</span>
            <input
              type="radio"
              checked={value === n}
              onChange={() => onChange(n)}
              className="accent-[var(--maroon)] w-5 h-5"
            />
          </label>
        ))}
      </div>
      <span className="text-xs font-semibold text-[var(--gray)] flex-shrink-0">{rightLabel}</span>
    </div>
  );
}

function MatrixTable<T extends string>({
  rows,
  columns,
  values,
  onChange,
}: {
  rows: readonly { id: T; label: string }[];
  columns: readonly { value: string | number; label: string }[];
  values: Record<string, string | number>;
  onChange: (id: T, value: string | number) => void;
}) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-[var(--gray)] uppercase tracking-wide">
            <th className="text-left font-semibold pb-2 px-1"></th>
            {columns.map((col) => (
              <th
                key={String(col.value)}
                className="font-semibold pb-2 px-1 text-center min-w-[64px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={`${i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"} border-t border-gray-100`}
            >
              <td className="py-2.5 px-3 text-gray-800 text-sm font-medium">{row.label}</td>
              {columns.map((col) => (
                <td key={String(col.value)} className="py-2.5 px-1 text-center">
                  <input
                    type="radio"
                    name={`matrix-${row.id}`}
                    checked={values[row.id] === col.value}
                    onChange={() => onChange(row.id, col.value)}
                    className="accent-[var(--maroon)] w-4 h-4"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Step 1 — Personal info ───────────────────────────────────────────────

function Step1({
  answers,
  update,
}: {
  answers: Answers;
  update: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 leading-relaxed">
        Thank you for participating in Heritage Without Borders 2026! Your feedback is valuable in
        helping us improve future conferences and lecture programs.
      </p>

      <PrivacyNotice
        consent={answers.privacyConsent}
        onChange={(v) => update("privacyConsent", v)}
      />

      <div>
        <Label>Name</Label>
        <TextInput value={answers.name} onChange={(v) => update("name", v)} />
      </div>

      <div>
        <Label>Field of Work / Industry</Label>
        <RadioList
          name="fieldOfWork"
          options={FIELD_OF_WORK_OPTIONS}
          value={answers.fieldOfWork}
          onChange={(v) => update("fieldOfWork", v)}
        />
        {answers.fieldOfWork === "Other" && (
          <div className="mt-3">
            <TextInput
              value={answers.fieldOfWorkOther}
              onChange={(v) => update("fieldOfWorkOther", v)}
              placeholder="Please specify..."
            />
          </div>
        )}
      </div>

      <div>
        <Label>Current Occupation / Role</Label>
        <TextInput
          value={answers.occupationRole}
          onChange={(v) => update("occupationRole", v)}
          placeholder="e.g. Conservator, Curator, Student, Architect, Researcher, etc."
        />
      </div>

      <div>
        <Label>Company / Institution / Affiliation</Label>
        <TextInput
          value={answers.affiliation}
          onChange={(v) => update("affiliation", v)}
        />
      </div>

      <div>
        <Label>How did you hear about this event?</Label>
        <RadioList
          name="hearAbout"
          options={HEAR_ABOUT_OPTIONS}
          value={answers.hearAbout}
          onChange={(v) => update("hearAbout", v)}
        />
        {answers.hearAbout === "Other" && (
          <div className="mt-3">
            <TextInput
              value={answers.hearAboutOther}
              onChange={(v) => update("hearAboutOther", v)}
              placeholder="Please specify..."
            />
          </div>
        )}
      </div>

      <div>
        <Label>What package did you avail?</Label>
        <RadioList
          name="packageAvailed"
          options={PACKAGE_OPTIONS}
          value={answers.packageAvailed}
          onChange={(v) => update("packageAvailed", v)}
        />
      </div>
    </div>
  );
}

// ─── Step 2 — Conference Evaluation ───────────────────────────────────────

function Step2({
  answers,
  update,
  setSpeakerRating,
  setEventRating,
  setServiceRating,
}: {
  answers: Answers;
  update: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  setSpeakerRating: (id: SpeakerId, value: SpeakerRating) => void;
  setEventRating: (id: EventExperienceItemId, value: number) => void;
  setServiceRating: (id: ServiceExperienceItemId, value: number) => void;
}) {
  const fivePointColumns = [1, 2, 3, 4, 5].map((n) => ({
    value: n,
    label: FIVE_POINT_LABELS[n],
  }));

  return (
    <div className="space-y-7">
      {/* Speakers */}
      <section>
        <SectionHeader title="Conference Evaluation" />
        <Label>How would you rate the speakers during the Conference?</Label>
        <MatrixTable<SpeakerId>
          rows={SPEAKERS.map((s) => ({ id: s.id, label: s.name }))}
          columns={SPEAKER_RATINGS.map((r) => ({ value: r.value, label: r.label }))}
          values={answers.speakerRatings}
          onChange={(id, value) => setSpeakerRating(id, value as SpeakerRating)}
        />
      </section>

      <section>
        <Label>What did you appreciate most about speakers?</Label>
        <p className="text-xs text-[var(--gray)] mb-2">
          Please provide specific feedback on the speakers.
        </p>
        <TextArea
          value={answers.speakerComments}
          onChange={(v) => update("speakerComments", v)}
        />
      </section>

      <section>
        <Label>How would you rate the conference topics?</Label>
        <FivePointScale
          value={answers.conferenceTopicsRating}
          onChange={(n) => update("conferenceTopicsRating", n)}
        />
      </section>

      {/* Event experience */}
      <section>
        <SectionHeader title="Event Experience" subtitle="Please rate the following aspects." />
        <MatrixTable<EventExperienceItemId>
          rows={EVENT_EXPERIENCE_ITEMS.map((it) => ({ id: it.id, label: it.label }))}
          columns={fivePointColumns}
          values={answers.eventExperience}
          onChange={(id, value) => setEventRating(id, Number(value))}
        />
      </section>

      {/* Service experience */}
      <section>
        <SectionHeader title="Service Experience" subtitle="Please rate the following services." />
        <MatrixTable<ServiceExperienceItemId>
          rows={SERVICE_EXPERIENCE_ITEMS.map((it) => ({ id: it.id, label: it.label }))}
          columns={fivePointColumns}
          values={answers.serviceExperience}
          onChange={(id, value) => setServiceRating(id, Number(value))}
        />
      </section>

      <section>
        <Label>Overall Conference Experience</Label>
        <p className="text-xs text-[var(--gray)] mb-2">
          Overall, how would you rate your conference experience?
        </p>
        <FivePointScale
          value={answers.overallExperience}
          onChange={(n) => update("overallExperience", n)}
        />
      </section>
    </div>
  );
}

// ─── Step 3 — Improvements ────────────────────────────────────────────────

function Step3({
  answers,
  update,
  isEditing,
}: {
  answers: Answers;
  update: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Improvements" />
      <div>
        <Label>What improvements would you suggest for the next Heritage Without Borders?</Label>
        <TextArea
          value={answers.improvements}
          onChange={(v) => update("improvements", v)}
          placeholder="Your answer..."
        />
      </div>
      <p className="text-xs text-[var(--gray)] leading-relaxed">
        {isEditing
          ? "Submitting will overwrite your previously saved responses."
          : "After submitting, your Certificate of Attendance will be unlocked on your profile."}
      </p>
    </div>
  );
}
