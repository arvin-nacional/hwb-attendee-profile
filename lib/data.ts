export interface Attendee {
  name: string;
  email: string;
  phone: string;
  package: AttendeePackage;
  packageLabel: string;
  selectedSchedule: ScheduleOption | null;
  registrationDate: string;
  paymentStatus: PaymentStatus;
  discountType: DiscountType;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
  balance: number;
  notes: string;
  customEventIds?: string[];
}

export type AttendeePackage = "conference" | "3lectures" | "5lectures" | "full" | "guest" | "custom";
export type PaymentStatus = "fully_paid" | "downpayment_50" | "partial";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  fully_paid: "Fully Paid",
  downpayment_50: "50% Downpayment",
  partial: "Partial Payment",
};

export const packageLabels: Record<AttendeePackage, string> = {
  conference: "HWB Package A — Conference Only",
  "3lectures": "HWB Package B — Conference and Choice of 3 Lectures",
  "5lectures": "HWB Package C — Conference and 5 Lectures",
  full: "HWB Full Package — Conference, 5 Lectures and Workshop",
  guest: "Guest Pass — All Events",
  custom: "Custom Pass — Selected Events",
};

export const packageShortNames: Record<AttendeePackage, string> = {
  conference: "Package A",
  "3lectures": "Package B",
  "5lectures": "Package C",
  full: "Full Package",
  guest: "Guest Pass",
  custom: "Custom Pass",
};

export const packagePrices: Record<AttendeePackage, number> = {
  conference: 3000,
  "3lectures": 4500,
  "5lectures": 5000,
  full: 35000,
  guest: 0,
  custom: 0,
};

export type DiscountType = "none" | "senior_pwd_student" | "bulk_5" | "bulk_10";

export const discountTypeLabels: Record<DiscountType, string> = {
  none: "No Discount",
  senior_pwd_student: "Senior / PWD / Student",
  bulk_5: "Bulk (5-9 participants)",
  bulk_10: "Bulk (10+ participants)",
};

export function getDiscountPercent(
  discountType: DiscountType,
  pkg: AttendeePackage
): number {
  if (discountType === "none") return 0;
  if (pkg === "guest" || pkg === "custom") return 0;
  if (pkg === "full") return 5;
  switch (discountType) {
    case "senior_pwd_student":
      return 20;
    case "bulk_5":
      return 10;
    case "bulk_10":
      return 15;
    default:
      return 0;
  }
}

export type ScheduleOption =
  | "1,2,3" | "1,2,4" | "1,2,5"
  | "1,3,4" | "1,3,5"
  | "1,4,5"
  | "2,3,4" | "2,3,5"
  | "2,4,5"
  | "3,4,5";

export const scheduleOptions: { value: ScheduleOption; label: string; eventIds: string[] }[] = [
  { value: "1,2,3", label: "Lecture Days 1, 2, and 3", eventIds: ["lec1", "lec2", "lec3"] },
  { value: "1,2,4", label: "Lecture Days 1, 2, and 4", eventIds: ["lec1", "lec2", "lec4"] },
  { value: "1,2,5", label: "Lecture Days 1, 2, and 5", eventIds: ["lec1", "lec2", "closing"] },
  { value: "1,3,4", label: "Lecture Days 1, 3, and 4", eventIds: ["lec1", "lec3", "lec4"] },
  { value: "1,3,5", label: "Lecture Days 1, 3, and 5", eventIds: ["lec1", "lec3", "closing"] },
  { value: "1,4,5", label: "Lecture Days 1, 4, and 5", eventIds: ["lec1", "lec4", "closing"] },
  { value: "2,3,4", label: "Lecture Days 2, 3, and 4", eventIds: ["lec2", "lec3", "lec4"] },
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
    case "guest":
      return ["conf", "lec1", "lec2", "lec3", "lec4", "closing", "workshop"];
    case "custom":
      return attendee.customEventIds || [];
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
    discountType: "none",
    discountPercent: 0,
    originalAmount: 35000,
    finalAmount: 35000,
    balance: 0,
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
    discountType: "none",
    discountPercent: 0,
    originalAmount: 5000,
    finalAmount: 5000,
    balance: 0,
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
    discountType: "bulk_10",
    discountPercent: 15,
    originalAmount: 4500,
    finalAmount: 3825,
    balance: 1912.50,
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
    discountType: "senior_pwd_student",
    discountPercent: 20,
    originalAmount: 3000,
    finalAmount: 2400,
    balance: 1200,
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
    name: "15-Session Conservation Workshop",
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
  guest: "bg-white/20 text-white",
  custom: "bg-purple-100 text-purple-800",
};
