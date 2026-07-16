import Image from "next/image";
import { cn } from "@/lib/utils";

/** Real dimensions of /Sobi-CRM-LOGO.png, used to keep the aspect ratio correct at any size. */
const LOGO_ASPECT = 663 / 283;

/**
 * The icon-only mark (from /Favicon.png by default). `src` lets a super
 * admin override it with an externally-hosted image (see engines/
 * platform-admin/branding-service.ts) — rendered as a plain <img> in that
 * case since next/image's optimizer requires allowlisting a fixed remote
 * host, which an admin-supplied URL can't satisfy generically.
 */
export function LogoMark({
  size = 32,
  src,
  className,
}: {
  size?: number;
  src?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
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
 * than recolored — keeps the exact brand asset legible everywhere. `src`
 * overrides the wordmark image the same way as `LogoMark`.
 */
export function Logo({
  size = 28,
  tone = "default",
  src,
  className,
}: {
  size?: number;
  tone?: "default" | "on-dark";
  src?: string;
  className?: string;
}) {
  const image = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="SOBI CRM"
      style={{ height: size, width: "auto" }}
      className="object-contain"
    />
  ) : (
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
