import {
  CalendarCheck,
  Users,
  Plane,
  ShieldCheck,
  Building2,
  Workflow,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Shown on the Home page's highlight grid — a curated subset of the full list. */
  highlight?: boolean;
};

/**
 * The single list both the Home page's highlight grid and the full
 * Features page render from — grounded in capabilities that actually
 * exist in this codebase (see PROJECT.md), not aspirational copy.
 */
export const FEATURES: FeatureItem[] = [
  {
    icon: CalendarCheck,
    title: "Bookings & quotes",
    description:
      "Build quotes from real inventory, convert them to bookings, and manage line items and statuses from one record.",
    highlight: true,
  },
  {
    icon: Plane,
    title: "Live supplier search & execution",
    description:
      "Search real flight and hotel inventory through Duffel and Hotelbeds, revalidate pricing before booking, and turn a validated line into a confirmed supplier order.",
    highlight: true,
  },
  {
    icon: Users,
    title: "CRM & lead pipeline",
    description:
      "Track customers, companies, and contacts with notes and activity timelines, and move leads through a configurable pipeline to conversion.",
    highlight: true,
  },
  {
    icon: ShieldCheck,
    title: "Role-based team access",
    description:
      "Owner, Admin, Agent, and Read-only roles with explicit, per-action permissions — invite teammates and control exactly what each role can see and do.",
  },
  {
    icon: Building2,
    title: "Multi-tenant by design",
    description:
      "Every agency's data is isolated at the database layer, not just the application layer — built for agencies that need real data separation, not a shared spreadsheet.",
  },
  {
    icon: FileText,
    title: "Agency operations",
    description:
      "Traveller and passport management, supplier confirmations, and printable service vouchers, all tied to the booking record.",
    highlight: true,
  },
  {
    icon: Workflow,
    title: "Reliable automation underneath",
    description:
      "Outbound communications and supplier follow-through run through a durable job engine with automatic retries — so a transient failure doesn't silently lose a customer notification.",
  },
];
