"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { FieldError } from "@/components/ui/field-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import type {
  PlanTranslation,
  PricingPlanInput,
} from "@/engines/platform-admin/pricing-service";
import {
  createPricingPlanAction,
  updatePricingPlanAction,
  deletePricingPlanAction,
} from "./actions";
import { cn } from "@/lib/utils";

interface AdminPlan {
  id: string;
  key: string;
  order: number;
  recommended: boolean;
  isCustom: boolean;
  translations: Record<string, PlanTranslation>;
}

const emptyTranslation: PlanTranslation = {
  name: "",
  desc: "",
  priceMonthly: "",
  priceAnnual: "",
  cta: "",
  features: [],
};

function toFormTranslations(
  source?: Record<string, PlanTranslation>,
): Record<AppLocale, PlanTranslation> {
  const out = {} as Record<AppLocale, PlanTranslation>;
  for (const l of routing.locales) {
    out[l] = source?.[l] ? { ...source[l] } : { ...emptyTranslation };
  }
  return out;
}

export function PricingAdminClient({
  initialPlans,
}: {
  initialPlans: AdminPlan[];
}) {
  const t = useTranslations("platformAdmin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const plans = [...initialPlans].sort((a, b) => a.order - b.order);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [formKey, setFormKey] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formRecommended, setFormRecommended] = useState(false);
  const [formIsCustom, setFormIsCustom] = useState(false);
  const [formTranslations, setFormTranslations] = useState<
    Record<AppLocale, PlanTranslation>
  >(toFormTranslations());
  const [activeLocale, setActiveLocale] = useState<AppLocale>("en");

  function openNew() {
    setEditing(null);
    setFormKey("");
    setFormOrder(plans.length);
    setFormRecommended(false);
    setFormIsCustom(false);
    setFormTranslations(toFormTranslations());
    setActiveLocale("en");
    setError(undefined);
    setDialogOpen(true);
  }

  function openEdit(plan: AdminPlan) {
    setEditing(plan);
    setFormKey(plan.key);
    setFormOrder(plan.order);
    setFormRecommended(plan.recommended);
    setFormIsCustom(plan.isCustom);
    setFormTranslations(toFormTranslations(plan.translations));
    setActiveLocale("en");
    setError(undefined);
    setDialogOpen(true);
  }

  function updateTranslationField(
    field: "name" | "desc" | "priceMonthly" | "priceAnnual" | "cta",
    value: string,
  ) {
    setFormTranslations((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], [field]: value },
    }));
  }

  function updateFeatures(raw: string) {
    setFormTranslations((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], features: raw.split("\n") },
    }));
  }

  function submit() {
    const key = formKey.trim();
    if (!key) {
      setError(t("planKey"));
      return;
    }
    const translations: Record<string, PlanTranslation> = {};
    for (const l of routing.locales) {
      const tr = formTranslations[l];
      translations[l] = {
        ...tr,
        features: tr.features.map((f) => f.trim()).filter(Boolean),
      };
    }
    const input: PricingPlanInput = {
      key,
      order: formOrder,
      recommended: formRecommended,
      isCustom: formIsCustom,
      translations,
    };
    setError(undefined);
    startTransition(async () => {
      const res = editing
        ? await updatePricingPlanAction(editing.id, input)
        : await createPricingPlanAction(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDialogOpen(false);
      router.refresh();
    });
  }

  function onDelete(plan: AdminPlan) {
    if (!window.confirm(t("deletePlanConfirm"))) return;
    startTransition(async () => {
      const res = await deletePricingPlanAction(plan.id);
      if (res.ok) router.refresh();
    });
  }

  const activeTranslation = formTranslations[activeLocale];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={openNew}>
          <Plus className="h-4 w-4" />
          {t("newPlan")}
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-muted">
          {t("noPlans")}
        </p>
      ) : (
        <div className="space-y-2.5">
          {plans.map((plan) => {
            const en = plan.translations.en ?? emptyTranslation;
            return (
              <div
                key={plan.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {en.name || plan.key}
                    </h3>
                    <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-ink-faint">
                      {plan.key}
                    </code>
                    {plan.recommended && (
                      <Chip tone="brand">
                        <Star className="h-3 w-3" /> {t("recommended")}
                      </Chip>
                    )}
                    {plan.isCustom && <Chip tone="neutral">{t("custom")}</Chip>}
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {en.desc}
                  </p>
                </div>
                <div className="shrink-0 text-end text-sm text-ink-muted">
                  {en.priceMonthly} / {en.priceAnnual}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tCommon("edit")}
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tCommon("delete")}
                    disabled={pending}
                    onClick={() => onDelete(plan)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("editPlan") : t("newPlan")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>{t("planKey")}</Label>
                <Input
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="pro"
                  dir="ltr"
                />
                <p className="mt-1 text-xs text-ink-faint">{t("planKeyHint")}</p>
              </div>
              <div>
                <Label>{t("order")}</Label>
                <Input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
              <span className="text-sm text-ink">{t("recommended")}</span>
              <Switch
                checked={formRecommended}
                onCheckedChange={setFormRecommended}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
              <span className="text-sm text-ink">{t("custom")}</span>
              <Switch checked={formIsCustom} onCheckedChange={setFormIsCustom} />
            </div>

            {/* Locale tabs */}
            <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
              {routing.locales.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setActiveLocale(l)}
                  className={cn(
                    "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                    activeLocale === l
                      ? "bg-surface-raised text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {localeMeta[l].label}
                </button>
              ))}
            </div>

            <div
              className="space-y-3"
              dir={localeMeta[activeLocale].dir}
            >
              <div>
                <Label>{t("name")}</Label>
                <Input
                  value={activeTranslation.name}
                  onChange={(e) => updateTranslationField("name", e.target.value)}
                />
              </div>
              <div>
                <Label>{t("desc")}</Label>
                <Textarea
                  value={activeTranslation.desc}
                  onChange={(e) => updateTranslationField("desc", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("priceMonthly")}</Label>
                  <Input
                    value={activeTranslation.priceMonthly}
                    onChange={(e) =>
                      updateTranslationField("priceMonthly", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>{t("priceAnnual")}</Label>
                  <Input
                    value={activeTranslation.priceAnnual}
                    onChange={(e) =>
                      updateTranslationField("priceAnnual", e.target.value)
                    }
                  />
                </div>
              </div>
              <div>
                <Label>{t("cta")}</Label>
                <Input
                  value={activeTranslation.cta}
                  onChange={(e) => updateTranslationField("cta", e.target.value)}
                />
              </div>
              <div>
                <Label>{t("features")}</Label>
                <Textarea
                  value={activeTranslation.features.join("\n")}
                  onChange={(e) => updateFeatures(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <FieldError>{error}</FieldError>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
            <Button variant="primary" onClick={submit} disabled={pending}>
              {pending ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
