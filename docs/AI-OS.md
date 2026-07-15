# AI Operating System

SOBI CRM's AI is an enterprise assistant, not a chatbot. The pipeline is:

```
Providers → Prompt Library → Skills → Tools → Agent Loop → Action Center → Human Approval → AI Audit
```

## Providers (`engines/ai/provider.ts`)
A provider turns messages into text. Adapters: **OpenAI**, **OpenRouter**, and a
**local** OpenAI-compatible endpoint, selected per tenant (`AiSetting`). With no
key configured, a **mock** provider yields useful heuristic output — so every AI
feature is demonstrable offline and degrades gracefully instead of erroring.
Real providers also implement `completeWithTools()` (native function-calling);
the mock provider implements the same interface with keyword-based tool
selection so the tool-calling assistant works with zero API keys too.

## Skills
Record-level skills (`engines/ai/skills.ts`):
- **record summary** — summarizes a contact from its record + timeline.
- **next-step suggestion** — proposes a follow-up **as a pending action**.
- **email draft** — drafts an email for a given intent.
- **missing-document detection** — pure checklist analysis, no LLM needed.

Lead skills (`engines/ai/lead-skills.ts`):
- **lead scoring** — 0-100 score + Persian rationale; falls back to a
  transparent, explainable heuristic (email/phone/company/source/message
  completeness) when no LLM is configured.
- **conversation summarization** — summarizes a linked chatbot `Conversation`
  into 3-5 bullets on the contact's "customer knowledge" card.

Content skill (`engines/ai/content-skills.ts`):
- **content suggestion** — picks the best-matching `KnowledgeArticle` for a
  lead (keyword/tag scoring, never invents an article) and drafts a short
  follow-up message grounded only in that article's text. If the lead has
  already converted, the message is also logged to the linked contact's
  timeline as a note.

Every skill builds a **permission-scoped context** (the AI only sees what the
requesting user can see) and writes an `AiLog` entry (provider, tokens, actor).

## Tool-calling assistant (`engines/ai/agent.ts`, `engines/ai/tools.ts`)
A bounded agent loop (max 4 rounds) backs the "Chat with CRM" assistant
(`/ai/assistant`). Four read-only tools — `query_leads`, `query_deals`,
`query_activities`, `crm_stats` — are zod-validated and DB-backed; the system
prompt requires the model to call a tool rather than fabricate a number, and
the mock provider mechanically enforces this by only ever echoing real tool
JSON back. Responses stream to the client word-by-word over a Route Handler
`ReadableStream` (the underlying tool-calling round-trip isn't natively
streamable, so only the final computed answer streams).

## Action Center (`engines/ai/action-center.ts`)
Skills never mutate data directly. Write-proposing skills create a pending
`AiAction`; a human **approves** (which executes the proposal, e.g. creating a
task) or **rejects** it. Approvals emit `ai.action_approved` and are audited
under the AI category. This is the safety guarantee: **AI proposes, humans
approve.** The same human-in-the-loop principle governs campaign emails
(`engines/campaigns/campaign-service.ts`): AI drafts one recipient at a time,
a human reviews/edits every message, and nothing sends without an explicit
per-recipient approval.

## Roadmap (architecture in place)
Knowledge Base **retrieval** here is deliberately simple (keyword/tag scoring
over a small article table) rather than RAG/embeddings — the pgvector adapter
seam is still open for when the article set grows past what keyword matching
can rank well. Also planned: AI Memory and per-module **AI Employees**
(`AiEmployee` schema) such as an AI Sales Assistant or AI Insurance Advisor —
each with a persona, an allowed skill/tool set, a scope, and an approval
policy.
