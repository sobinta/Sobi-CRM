# AI Operating System

Coreline's AI is an enterprise assistant, not a chatbot. The pipeline is:

```
Providers → Prompt Library → Skills → Tools → Action Center → Human Approval → AI Audit
```

## Providers (`engines/ai/provider.ts`)
A provider turns messages into text. Adapters: **OpenAI**, **OpenRouter**, and a
**local** OpenAI-compatible endpoint, selected per tenant (`AiSetting`). With no
key configured, a **mock** provider yields useful heuristic output — so every AI
feature is demonstrable offline and degrades gracefully instead of erroring.

## Skills (`engines/ai/skills.ts`)
Four ship working:
- **record summary** — summarizes a contact from its record + timeline.
- **next-step suggestion** — proposes a follow-up **as a pending action**.
- **email draft** — drafts an email for a given intent.
- **missing-document detection** — pure checklist analysis, no LLM needed.

Every skill builds a **permission-scoped context** (the AI only sees what the
requesting user can see) and writes an `AiLog` entry (provider, tokens, actor).

## Action Center (`engines/ai/action-center.ts`)
Skills never mutate data directly. Write-proposing skills create a pending
`AiAction`; a human **approves** (which executes the proposal, e.g. creating a
task) or **rejects** it. Approvals emit `ai.action_approved` and are audited
under the AI category. This is the safety guarantee: **AI proposes, humans
approve.**

## Roadmap (architecture in place)
Knowledge Base + RAG (pgvector interface), AI Memory, multi-step tool-calling
agents, and per-module **AI Employees** (`AiEmployee` schema) such as an AI
Sales Assistant or AI Insurance Advisor — each with a persona, an allowed
skill/tool set, a scope, and an approval policy.
