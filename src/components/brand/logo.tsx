import Image from "next/image";
import { cn } from "@/lib/utils";

/** Real dimensions of /Sobi-CRM-LOGO.png, used to keep the aspect ratio correct at any size. */
const LOGO_ASPECT = 663 / 283;

/** The icon-only mark (from /Favicon.png). */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/Favicon.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}

/**
 * Full "Sobi CRM" logo lockup. The source image bakes in dark pine text, so
 * on dark backgrounds (`tone="on-dark"`) it's set inside a light chip rather
 * than recolored — keeps the exact brand asset legible everywhere.
 */
export function Logo({
  size = 28,
  tone = "default",
  className,
}: {
  size?: number;
  tone?: "default" | "on-dark";
  className?: string;
}) {
  const image = (
    <Image
      src="/Sobi-CRM-LOGO.png"
      alt="SOBI CRM"
      width={Math.round(size * LOGO_ASPECT)}
      height={size}
      priority
    />
  );

  if (tone === "on-dark") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-white/95 px-2.5 py-1.5",
          className,
        )}
      >
        {image}
      </span>
    );
  }

  return <span className={cn("inline-flex items-center", className)}>{image}</span>;
}
