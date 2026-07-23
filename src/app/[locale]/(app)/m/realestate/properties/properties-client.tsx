"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createPropertyAction } from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export function NewPropertyButton() {
  const t = useTranslations("moduleRealestate");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPropertyAction({
        title: form.get("title"),
        propertyType: form.get("propertyType"),
        price: form.get("price"),
        bedrooms: form.get("bedrooms"),
        address: form.get("address"),
        customFields,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("newProperty")}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{t("newProperty")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="title" required>{t("titleLabel")}</Label>
              <Input id="title" name="title" required autoFocus />
            </div>
            <div>
              <Label htmlFor="address">{t("addressLabel")}</Label>
              <Input id="address" name="address" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="propertyType" required>{t("typeLabel")}</Label>
                <NativeSelect id="propertyType" name="propertyType" defaultValue="apartment">
                  <option value="apartment">{t("typeApartment")}</option>
                  <option value="house">{t("typeHouse")}</option>
                  <option value="commercial">{t("typeCommercial")}</option>
                  <option value="land">{t("typeLand")}</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="bedrooms">{t("bedroomsLabel")}</Label>
                <Input id="bedrooms" name="bedrooms" type="number" min={0} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="price">{t("priceLabel")}</Label>
                <Input id="price" name="price" type="number" min={0} defaultValue={0} dir="ltr" />
              </div>
            </div>
            <BusinessCustomFields entityKey="property" onChange={setCustomFields} />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("createProperty")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
