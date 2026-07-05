import {
  ShieldCheck,
  Landmark,
  Home,
  Plane,
  Scissors,
  Sparkles,
  UtensilsCrossed,
  Megaphone,
} from "lucide-react";
import { registerModule } from "./manifest";

/**
 * Client-safe module manifests for the first-build business modules. Registered
 * on import so both the client (workspace rail) and any server composition see
 * the same set. Icons/nav only — no server logic — so this stays serialization-
 * and boundary-safe.
 */

registerModule({
  key: "insurance",
  workspace: {
    labelKey: "insurance",
    icon: ShieldCheck,
    href: "/m/insurance",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/insurance" },
      { key: "policies", labelKey: "policies", href: "/m/insurance/policies" },
      { key: "claims", labelKey: "claims", href: "/m/insurance/claims" },
    ],
  },
  permissions: ["insurance.policy.read", "insurance.policy.update", "insurance.claim.read"],
  relationshipKinds: ["insured_by", "policy_of"],
});

registerModule({
  key: "loans",
  workspace: {
    labelKey: "loans",
    icon: Landmark,
    href: "/m/loans",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/loans" },
      { key: "applications", labelKey: "applications", href: "/m/loans/applications" },
    ],
  },
  permissions: ["loans.application.read", "loans.application.update"],
});

registerModule({
  key: "realestate",
  workspace: {
    labelKey: "realestate",
    icon: Home,
    href: "/m/realestate",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/realestate" },
      { key: "properties", labelKey: "properties", href: "/m/realestate/properties" },
    ],
  },
  permissions: ["realestate.property.read", "realestate.property.update"],
});

registerModule({
  key: "sales",
  workspace: {
    labelKey: "sales",
    icon: Megaphone,
    href: "/m/sales",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/sales" },
      { key: "campaigns", labelKey: "campaigns", href: "/m/sales/campaigns" },
    ],
  },
  permissions: ["sales.campaign.read"],
});

registerModule({
  key: "immigration",
  workspace: {
    labelKey: "immigration",
    icon: Plane,
    href: "/m/immigration",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/immigration" },
      { key: "cases", labelKey: "cases", href: "/m/immigration/cases" },
    ],
  },
  permissions: ["immigration.case.read", "immigration.case.update"],
});

registerModule({
  key: "barber",
  workspace: {
    labelKey: "barber",
    icon: Scissors,
    href: "/m/barber",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/barber" },
      { key: "appointments", labelKey: "appointments", href: "/m/barber/appointments" },
      { key: "services", labelKey: "services", href: "/m/barber/services" },
    ],
  },
  permissions: ["barber.appointment.read", "barber.appointment.update"],
});

registerModule({
  key: "salon",
  workspace: {
    labelKey: "salon",
    icon: Sparkles,
    href: "/m/salon",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/salon" },
      { key: "appointments", labelKey: "appointments", href: "/m/salon/appointments" },
      { key: "services", labelKey: "services", href: "/m/salon/services" },
    ],
  },
  permissions: ["salon.appointment.read", "salon.appointment.update"],
});

registerModule({
  key: "restaurant",
  workspace: {
    labelKey: "restaurant",
    icon: UtensilsCrossed,
    href: "/m/restaurant",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/m/restaurant" },
      { key: "reservations", labelKey: "reservations", href: "/m/restaurant/reservations" },
    ],
  },
  permissions: ["restaurant.reservation.read", "restaurant.reservation.update"],
});
