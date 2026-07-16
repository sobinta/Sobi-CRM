import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes super-admin-authored rich text (from the TipTap editor) before it
 * is persisted or rendered with `dangerouslySetInnerHTML`. Only the tags the
 * editor itself can produce are allowed — this is not a general-purpose HTML
 * sanitizer for arbitrary user input.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
