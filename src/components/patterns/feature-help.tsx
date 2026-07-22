"use client";

import { useTranslations } from "next-intl";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Per-feature help button. Every workspace section gets one of these (wired
 * through `PageHeader`'s `helpTopic` prop) so a user can always answer "how
 * does this work and why would I use it?" without leaving the page — in
 * whatever locale the workspace is set to.
 *
 * Content lives in the `helpTopics.<topicKey>` i18n namespace as:
 *   { title: "...", body: "..." }
 * `body` is plain text with two conventions, parsed client-side:
 *   - a blank line starts a new paragraph
 *   - a line starting with "- " becomes a bullet list item
 * This keeps translation files simple JSON (no nested arrays) while still
 * allowing structured, readable help content.
 */
export function FeatureHelp({ topicKey }: { topicKey: string }) {
  const t = useTranslations("helpTopics");
  const tCommon = useTranslations("common");

  const title = t(`${topicKey}.title` as never);
  const body = t(`${topicKey}.body` as never);
  const blocks = parseHelpBody(body);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={title} title={title}>
          <CircleHelp className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <FeatureHelpDialogBody title={title} blocks={blocks} closeLabel={tCommon("close")} />
    </Dialog>
  );
}

type HelpBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

/**
 * Turns plain text into paragraph/list blocks. A blank line separates blocks;
 * a run of "- " lines becomes a bullet list even when preceded, in the same
 * paragraph, by a non-list lead-in line (that line becomes its own short
 * paragraph right before the list).
 */
function parseHelpBody(body: string): HelpBlock[] {
  const blocks: HelpBlock[] = [];
  let paraLines: string[] = [];
  let listItems: string[] = [];

  const flushPara = () => {
    if (paraLines.length) {
      blocks.push({ type: "p", text: paraLines.join(" ") });
      paraLines = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "ul", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      listItems.push(line.slice(2));
    } else {
      flushList();
      paraLines.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function FeatureHelpDialogBody({
  title,
  blocks,
  closeLabel,
}: {
  title: string;
  blocks: HelpBlock[];
  closeLabel: string;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CircleHelp className="h-4.5 w-4.5 text-brand" aria-hidden="true" />
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-3 text-sm leading-relaxed text-ink-muted">
        {blocks.map((block, i) =>
          block.type === "ul" ? (
            <ul key={i} className="list-disc space-y-1.5 ps-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{block.text}</p>
          ),
        )}
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" type="button">
            {closeLabel}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
