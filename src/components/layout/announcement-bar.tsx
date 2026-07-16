import { cn } from "@/lib/utils";

/**
 * Promo/notice bar (discount codes, announcements) shown atop the landing
 * page and the in-app workspace shell. Pure CSS marquee — no client JS
 * needed since there's no interactivity beyond an optional link.
 */
export function AnnouncementBar({
  text,
  backgroundColor,
  textColor,
  animation,
  linkUrl,
}: {
  text: string;
  backgroundColor: string;
  textColor: string;
  animation: "ltr" | "rtl" | "static";
  linkUrl?: string | null;
}) {
  if (!text) return null;

  const content = linkUrl ? (
    <a href={linkUrl} className="hover:underline">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );

  if (animation === "static") {
    return (
      <div
        className="flex h-9 shrink-0 items-center justify-center px-4 text-center text-sm font-medium"
        style={{ backgroundColor, color: textColor }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="flex h-9 shrink-0 items-center overflow-hidden whitespace-nowrap text-sm font-medium"
      style={{ backgroundColor, color: textColor }}
    >
      <div
        className={cn(
          "flex w-max shrink-0 gap-16 ps-4",
          animation === "ltr" ? "announcement-marquee-ltr" : "announcement-marquee-rtl",
        )}
      >
        <span className="shrink-0">{content}</span>
        <span className="shrink-0" aria-hidden>
          {content}
        </span>
      </div>
    </div>
  );
}
