export interface Attendee {
  name: string;
  email: string;
  phone: string;
  package: AttendeePackage;
  packageLabel: string;
  selectedSchedule: ScheduleOption | null;
  registrationDate: string;
  paymentStatus: PaymentStatus;
  notes: string;
}

export type AttendeePackage = "conference" | "3lectures" | "5lectures" | "full";
export type PaymentStatus = "fully_paid" | "downpayment_50";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  fully_paid: "Fully Paid",
  downpayment_50: "50% Downpayment",
};

export const packageLabels: Record<AttendeePackage, string> = {
  conference: "HWB Package A Conference Only - ₱3,000.00",
  "3lectures": "HWB Package B (Conference and Choice of 3 Lectures) - ₱4,500.00",
  "5lectures": "HWB Package C (Conference and 5 Lectures) - ₱5,000.00",
  full: "HWB Full Package (Conference, 5 Lectures and Workshop) - ₱35,000.00",
};

export type ScheduleOption = "1,2,5" | "1,3,5" | "1,4,5" | "2,3,5" | "2,4,5" | "3,4,5";

export const scheduleOptions: { value: ScheduleOption; label: string; eventIds: string[] }[] = [
  { value: "1,2,5", label: "Lecture Days 1, 2, and 5", eventIds: ["lec1", "lec2", "closing"] },
  { value: "1,3,5", label: "Lecture Days 1, 3, and 5", eventIds: ["lec1", "lec3", "closing"] },
  { value: "1,4,5", label: "Lecture Days 1, 4, and 5", eventIds: ["lec1", "lec4", "closing"] },
  { value: "2,3,5", label: "Lecture Days 2, 3, and 5", eventIds: ["lec2", "lec3", "closing"] },
  { value: "2,4,5", label: "Lecture Days 2, 4, and 5", eventIds: ["lec2", "lec4", "closing"] },
  { value: "3,4,5", label: "Lecture Days 3, 4, and 5", eventIds: ["lec3", "lec4", "closing"] },
];

export function getAccessibleEventIds(attendee: Attendee): string[] {
  switch (attendee.package) {
    case "conference":
      return ["conf"];
    case "3lectures": {
      if (!attendee.selectedSchedule) return ["conf"];
      const schedule = scheduleOptions.find((s) => s.value === attendee.selectedSchedule);
      return ["conf", ...(schedule ? schedule.eventIds : [])];
    }
    case "5lectures":
      return ["conf", "lec1", "lec2", "lec3", "lec4", "closing"];
    case "full":
      return ["conf", "lec1", "lec2", "lec3", "lec4", "closing", "workshop"];
    default:
      return [];
  }
}

export interface HWBEvent {
  id: string;
  name: string;
  meta: string;
  venue: string;
  date: string;
  time: string;
  packages: AttendeePackage[];
}

export const attendees: Record<string, Attendee> = {
  "HWB-2026-0001": {
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "+63 917 123 4567",
    package: "full",
    selectedSchedule: null,
    packageLabel: "HWB Full Package (Conference, 5 Lectures and Workshop) - ₱35,000.00",
    registrationDate: "2026-01-15",
    paymentStatus: "fully_paid",
    notes: "VIP Guest — Senior Conservator",
  },
  "HWB-2026-0042": {
    name: "Juan Dela Cruz",
    email: "juan.delacruz@email.com",
    phone: "+63 918 987 6543",
    package: "5lectures",
    selectedSchedule: null,
    packageLabel: "HWB Package C (Conference and 5 Lectures) - ₱5,000.00",
    registrationDate: "2026-02-20",
    paymentStatus: "fully_paid",
    notes: "",
  },
  "HWB-2026-0078": {
    name: "Ana Reyes",
    email: "ana.reyes@email.com",
    phone: "+63 919 456 7890",
    package: "3lectures",
    selectedSchedule: "1,2,5",
    packageLabel: "HWB Package B (Conference and Choice of 3 Lectures) - ₱4,500.00",
    registrationDate: "2026-03-01",
    paymentStatus: "downpayment_50",
    notes: "Group registration — Heritage Conservation Society (10 pax)",
  },
  "HWB-2026-0150": {
    name: "Carlos Garcia",
    email: "carlos.garcia@email.com",
    phone: "+63 920 321 0987",
    package: "conference",
    selectedSchedule: null,
    packageLabel: "HWB Package A Conference Only - ₱3,000.00",
    registrationDate: "2026-03-10",
    paymentStatus: "downpayment_50",
    notes: "Senior/PWD discount applied",
  },
};

export const events: HWBEvent[] = [
  {
    id: "conf",
    name: "Conference Day",
    meta: "Plenary Sessions & Panel Discussion",
    venue: "QC MICE Center",
    date: "Apr 20",
    time: "9:00 AM – 4:00 PM",
    packages: ["conference", "3lectures", "5lectures", "full"],
  },
  {
    id: "lec1",
    name: "Lecture Day 1: Dry Cleaning Methods",
    meta: "Kate Seymour",
    venue: "National Library",
    date: "Apr 21",
    time: "9:00 AM – 12:00 PM",
    packages: ["3lectures", "5lectures", "full"],
  },
  {
    id: "lec2",
    name: "Lecture Day 2: Aqueous Cleaning",
    meta: "Kate Seymour",
    venue: "National Library",
    date: "Apr 22",
    time: "9:00 AM – 12:00 PM",
    packages: ["3lectures", "5lectures", "full"],
  },
  {
    id: "lec3",
    name: "Lecture Day 3: Solvent Strategies",
    meta: "Kate Seymour",
    venue: "Estuary Park",
    date: "Apr 23",
    time: "9:00 AM – 12:00 PM",
    packages: ["3lectures", "5lectures", "full"],
  },
  {
    id: "lec4",
    name: "Lecture Day 4: Gel & Emulsion Cleaning",
    meta: "Kate Seymour",
    venue: "National Library",
    date: "Apr 24",
    time: "9:00 AM – 12:00 PM",
    packages: ["5lectures", "full"],
  },
  {
    id: "closing",
    name: "Closing Session",
    meta: "Certificates & Networking",
    venue: "QCX Event Center",
    date: "Apr 25",
    time: "9:00 AM – 12:00 PM",
    packages: ["5lectures", "full"],
  },
  {
    id: "workshop",
    name: "15-Day Conservation Workshop",
    meta: "Hands-on Training",
    venue: "TBA",
    date: "June 2026",
    time: "Full Day",
    packages: ["full"],
  },
];

export const badgeClasses: Record<AttendeePackage, string> = {
  conference: "bg-white/20 text-white",
  "3lectures": "bg-gold text-maroon-dark",
  "5lectures": "bg-gradient-to-br from-gold to-gold-light text-maroon-dark",
  full: "bg-gradient-to-br from-amber-400 to-amber-500 text-maroon-dark",
};
