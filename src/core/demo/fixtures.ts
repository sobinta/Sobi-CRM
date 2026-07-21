export const DEMO_READ_PERMISSIONS = [
  "crm.*.read",
  "ops.*.read",
  "mgmt.*.read",
  "finance.*.read",
  "studio.*.read",
  "ai.*.read",
  "insurance.*.read",
  "loans.*.read",
  "realestate.*.read",
  "immigration.*.read",
  "barber.*.read",
  "salon.*.read",
  "restaurant.*.read",
  "sales.*.read",
] as const;

export const DEMO_MODULE_KEYS = [
  "sales",
  "insurance",
  "realestate",
  "loans",
  "immigration",
  "barber",
  "salon",
  "restaurant",
] as const;

export const DEMO_STAGE_FIXTURES = [
  { id: "demo-stage-new", key: "new", name: "New", position: 0, tone: "neutral", probability: 10, isWon: false, isLost: false },
  { id: "demo-stage-qualified", key: "qualified", name: "Qualified", position: 1, tone: "info", probability: 25, isWon: false, isLost: false },
  { id: "demo-stage-proposal", key: "proposal", name: "Proposal", position: 2, tone: "warning", probability: 50, isWon: false, isLost: false },
  { id: "demo-stage-negotiation", key: "negotiation", name: "Negotiation", position: 3, tone: "accent", probability: 75, isWon: false, isLost: false },
  { id: "demo-stage-won", key: "won", name: "Won", position: 4, tone: "positive", probability: 100, isWon: true, isLost: false },
  { id: "demo-stage-lost", key: "lost", name: "Lost", position: 5, tone: "danger", probability: 0, isWon: false, isLost: true },
] as const;
