import type { EntityMetadata, FieldOption } from "@/core/metadata/types";
import { registerBuiltinEntity } from "@/core/metadata/registry";

const l = (en: string, fa: string, de: string) => ({ en, fa, de });
const o = (value: string, en: string, fa: string, de: string, tone?: string): FieldOption => ({ value, label: l(en, fa, de), tone });

export const contactEntity: EntityMetadata = {
  key: "contact", nameSingular: "Contact", namePlural: "Contacts", icon: "user", source: "builtin", module: "crm", titleField: "fullName",
  fields: [
    { key: "firstName", label: l("First name", "نام", "Vorname"), type: "text", required: true, searchable: true },
    { key: "lastName", label: l("Last name", "نام خانوادگی", "Nachname"), type: "text", required: true, searchable: true },
    { key: "email", label: l("Email", "ایمیل", "E-Mail"), type: "email", searchable: true },
    { key: "phone", label: l("Phone", "تلفن", "Telefon"), type: "phone" },
    { key: "jobTitle", label: l("Job title", "سمت شغلی", "Position"), type: "text" },
    { key: "lifecycle", label: l("Lifecycle", "چرخه ارتباط", "Lebenszyklus"), type: "select", default: "lead", options: [o("lead", "Lead", "سرنخ", "Lead", "info"), o("prospect", "Prospect", "مشتری بالقوه", "Interessent", "warning"), o("customer", "Customer", "مشتری", "Kunde", "positive"), o("inactive", "Inactive", "غیرفعال", "Inaktiv", "neutral")] },
    { key: "source", label: l("Source", "منبع", "Quelle"), type: "text" },
  ],
};

export const companyEntity: EntityMetadata = {
  key: "company", nameSingular: "Company", namePlural: "Companies", icon: "building-2", source: "builtin", module: "crm", titleField: "name",
  fields: [
    { key: "name", label: l("Name", "نام", "Name"), type: "text", required: true, searchable: true },
    { key: "domain", label: l("Domain", "دامنه", "Domain"), type: "text", searchable: true },
    { key: "industry", label: l("Industry", "صنعت", "Branche"), type: "text" },
    { key: "size", label: l("Size", "اندازه شرکت", "Größe"), type: "select", options: [o("1-10", "1–10", "۱ تا ۱۰", "1–10"), o("11-50", "11–50", "۱۱ تا ۵۰", "11–50"), o("51-200", "51–200", "۵۱ تا ۲۰۰", "51–200"), o("201-1000", "201–1000", "۲۰۱ تا ۱۰۰۰", "201–1000"), o("1000+", "1000+", "بیش از ۱۰۰۰", "1000+")] },
    { key: "phone", label: l("Phone", "تلفن", "Telefon"), type: "phone" },
    { key: "website", label: l("Website", "وب‌سایت", "Website"), type: "url" },
  ],
};

export const leadEntity: EntityMetadata = {
  key: "lead", nameSingular: "Lead", namePlural: "Leads", icon: "sparkle", source: "builtin", module: "crm", titleField: "title",
  fields: [
    { key: "title", label: l("Title", "عنوان", "Titel"), type: "text", required: true, searchable: true },
    { key: "companyName", label: l("Company", "شرکت", "Unternehmen"), type: "text", searchable: true },
    { key: "email", label: l("Email", "ایمیل", "E-Mail"), type: "email", searchable: true }, { key: "phone", label: l("Phone", "تلفن", "Telefon"), type: "phone" },
    { key: "status", label: l("Status", "وضعیت", "Status"), type: "select", default: "new", options: [o("new", "New", "جدید", "Neu", "info"), o("working", "Working", "در حال پیگیری", "In Bearbeitung", "warning"), o("qualified", "Qualified", "واجد شرایط", "Qualifiziert", "positive"), o("unqualified", "Unqualified", "نامناسب", "Nicht qualifiziert", "neutral"), o("converted", "Converted", "تبدیل‌شده", "Konvertiert", "brand")] },
    { key: "score", label: l("Score", "امتیاز", "Bewertung"), type: "number", min: 0, max: 100, default: 0 },
    { key: "estimatedValue", label: l("Estimated value", "ارزش تخمینی", "Schätzwert"), type: "currency" }, { key: "source", label: l("Source", "منبع", "Quelle"), type: "text" },
  ],
};

export const dealEntity: EntityMetadata = { key: "deal", nameSingular: "Deal", namePlural: "Deals", icon: "handshake", source: "builtin", module: "crm", titleField: "title", fields: [
  { key: "title", label: l("Title", "عنوان", "Titel"), type: "text", required: true, searchable: true }, { key: "value", label: l("Value", "ارزش", "Wert"), type: "currency", default: 0 }, { key: "expectedCloseAt", label: l("Expected close", "تاریخ احتمالی بستن", "Erwarteter Abschluss"), type: "date" },
] };
const taskEntity: EntityMetadata = { key: "task", nameSingular: "Task", namePlural: "Tasks", icon: "check-square", source: "builtin", module: "ops", titleField: "title", fields: [
  { key: "title", label: l("Title", "عنوان", "Titel"), type: "text", required: true, searchable: true }, { key: "priority", label: l("Priority", "اولویت", "Priorität"), type: "select", options: [o("low", "Low", "کم", "Niedrig"), o("normal", "Normal", "عادی", "Normal"), o("high", "High", "زیاد", "Hoch")] }, { key: "dueAt", label: l("Due date", "مهلت انجام", "Fälligkeit"), type: "datetime" },
] };
const eventEntity: EntityMetadata = { key: "event", nameSingular: "Event", namePlural: "Events", icon: "calendar", source: "builtin", module: "ops", titleField: "title", fields: [
  { key: "title", label: l("Title", "عنوان", "Titel"), type: "text", required: true, searchable: true }, { key: "startAt", label: l("Start", "شروع", "Beginn"), type: "datetime", required: true }, { key: "endAt", label: l("End", "پایان", "Ende"), type: "datetime", required: true }, { key: "location", label: l("Location", "مکان", "Ort"), type: "text" },
] };
const campaignEntity: EntityMetadata = { key: "campaign", nameSingular: "Campaign", namePlural: "Campaigns", icon: "megaphone", source: "builtin", module: "crm", titleField: "name", fields: [
  { key: "name", label: l("Name", "نام", "Name"), type: "text", required: true, searchable: true }, { key: "scheduledStartAt", label: l("Scheduled start", "شروع برنامه‌ریزی‌شده", "Geplanter Beginn"), type: "datetime" }, { key: "scheduledEndAt", label: l("Scheduled end", "پایان برنامه‌ریزی‌شده", "Geplantes Ende"), type: "datetime" },
] };
const contractEntity: EntityMetadata = { key: "contract", nameSingular: "Contract", namePlural: "Contracts", icon: "file-signature", source: "builtin", module: "crm", titleField: "title", fields: [
  { key: "title", label: l("Title", "عنوان", "Titel"), type: "text", required: true, searchable: true }, { key: "startDate", label: l("Start date", "تاریخ شروع", "Startdatum"), type: "date" }, { key: "expiresAt", label: l("Expiry", "تاریخ انقضا", "Ablaufdatum"), type: "date" },
] };
const policyEntity: EntityMetadata = { key: "policy", nameSingular: "Policy", namePlural: "Policies", icon: "shield-check", source: "builtin", module: "insurance", titleField: "policyNumber", fields: [
  { key: "policyNumber", label: l("Policy number", "شماره بیمه‌نامه", "Policennummer"), type: "text", required: true, searchable: true }, { key: "startDate", label: l("Start date", "تاریخ شروع", "Startdatum"), type: "date" }, { key: "endDate", label: l("End date", "تاریخ پایان", "Enddatum"), type: "date" },
] };

let registered = false;
export function registerCrmEntities(): void {
  if (registered) return; registered = true;
  [contactEntity, companyEntity, leadEntity, dealEntity, taskEntity, eventEntity, campaignEntity, contractEntity, policyEntity].forEach(registerBuiltinEntity);
}
registerCrmEntities();
