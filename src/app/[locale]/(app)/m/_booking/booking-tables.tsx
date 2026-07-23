"use client";

import { useTranslations } from "next-intl";
import { Chip, type ChipProps } from "@/components/ui/chip";

const statusTone: Record<string, ChipProps["tone"]> = {
  booked: "info",
  walk_in: "brand",
  completed: "positive",
  no_show: "warning",
  cancelled: "danger",
};

const statusKey: Record<string, string> = {
  booked: "statusBooked",
  walk_in: "statusWalkIn",
  completed: "statusCompleted",
  no_show: "statusNoShow",
  cancelled: "statusCancelled",
};

export interface AppointmentRow {
  id: string;
  customerName: string;
  startAt: Date;
  status: string;
  partySize: number | null;
  service: { name: string } | null;
  staff: { name: string } | null;
}

/** Shared appointment/reservation table for the booking modules. */
export function AppointmentsTable({
  rows,
  showParty = false,
}: {
  rows: AppointmentRow[];
  showParty?: boolean;
}) {
  const t = useTranslations("bookingModules");
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-xs text-ink-faint">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium">{t("colCustomer")}</th>
            <th className="px-4 py-2.5 text-start font-medium">
              {showParty ? t("colParty") : t("colService")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">{t("colWhen")}</th>
            <th className="px-4 py-2.5 text-start font-medium">{t("colStatus")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((a) => (
            <tr key={a.id} className="bg-surface-raised">
              <td className="px-4 py-3 font-medium text-ink">{a.customerName}</td>
              <td className="px-4 py-3 text-ink-muted">
                {showParty ? (a.partySize ?? "—") : (a.service?.name ?? "—")}
              </td>
              <td className="px-4 py-3 tabular text-ink-muted">
                {new Date(a.startAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Chip tone={statusTone[a.status] ?? "neutral"}>
                  {statusKey[a.status] ? t(statusKey[a.status] as never) : a.status.replace(/_/g, " ")}
                </Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface ServiceRow {
  id: string;
  name: string;
  durationMin: number;
  price: unknown;
  active: boolean;
}

function money(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Shared service catalog table for the booking modules. */
export function ServicesTable({ rows }: { rows: ServiceRow[] }) {
  const t = useTranslations("bookingModules");
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-xs text-ink-faint">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium">{t("colService")}</th>
            <th className="px-4 py-2.5 text-start font-medium">{t("colDuration")}</th>
            <th className="px-4 py-2.5 text-start font-medium">{t("colPrice")}</th>
            <th className="px-4 py-2.5 text-start font-medium">{t("colStatus")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => (
            <tr key={s.id} className="bg-surface-raised">
              <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
              <td className="px-4 py-3 tabular text-ink-muted">
                {t("durationValue", { minutes: s.durationMin })}
              </td>
              <td className="px-4 py-3 tabular text-ink-muted">{money(Number(s.price))}</td>
              <td className="px-4 py-3">
                <Chip tone={s.active ? "positive" : "neutral"}>
                  {s.active ? t("active") : t("inactive")}
                </Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
