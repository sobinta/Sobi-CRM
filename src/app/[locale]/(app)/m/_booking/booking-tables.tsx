import { Chip, type ChipProps } from "@/components/ui/chip";

const statusTone: Record<string, ChipProps["tone"]> = {
  booked: "info",
  walk_in: "brand",
  completed: "positive",
  no_show: "warning",
  cancelled: "danger",
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
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-xs text-ink-faint">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium">Customer</th>
            <th className="px-4 py-2.5 text-start font-medium">
              {showParty ? "Party" : "Service"}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">When</th>
            <th className="px-4 py-2.5 text-start font-medium">Status</th>
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
                  {a.status.replace(/_/g, " ")}
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
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-xs text-ink-faint">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium">Service</th>
            <th className="px-4 py-2.5 text-start font-medium">Duration</th>
            <th className="px-4 py-2.5 text-start font-medium">Price</th>
            <th className="px-4 py-2.5 text-start font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => (
            <tr key={s.id} className="bg-surface-raised">
              <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
              <td className="px-4 py-3 tabular text-ink-muted">{s.durationMin} min</td>
              <td className="px-4 py-3 tabular text-ink-muted">{money(Number(s.price))}</td>
              <td className="px-4 py-3">
                <Chip tone={s.active ? "positive" : "neutral"}>
                  {s.active ? "active" : "inactive"}
                </Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
