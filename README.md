# Orin Automations

Orin Automations compiles an input/output request into a reviewable pipeline
manifest, binds approval to the exact manifest hash, runs a deliberately small
side-effect-free local transform, and writes Logseq-compatible Markdown.

## Current release

The v1 local preview in `index.html` is a real compiler/runtime boundary:

- `lib/compiler.mjs` creates a versioned manifest with input/output contracts,
  generated code, integration policy, a readable diff, and a manifest hash.
- Approval is short-lived and exact-hash bound. Changing any manifest field
  invalidates the approval.
- `runSafePipeline` executes only the built-in text normalization. It never
  evaluates generated code and never performs network requests.
- `lib/notes.mjs` parses and serializes Logseq-compatible Markdown with page
  properties, tags, nested blocks, and stable `{{id:: ...}}` block IDs. The
  versioned consumer contract is recorded in `shared-notes-contract.json` and
  tracks the shared `@orin/notes` platform package.
- The local preview can copy or download the resulting Markdown.

This is intentionally a safe local preview, not a claim that arbitrary remote
integrations or untrusted generated code are production-ready. Adding those
requires a separate runtime, secret broker, egress policy, durable quotas,
retry/idempotency, and an independent security review.

## Run locally

Serve the directory with any static HTTP server (ES modules are used):

```bash
npx serve .
npm test
npm run check
```

## Product contract

Input: bounded text and a requested output description.
Output: a reviewable manifest, exact-hash approval, bounded local result, and
Logseq-compatible notes Markdown.

The roadmap for remote execution, generated integrations, and shared Orin
Code integration remains tracked in the ecosystem master roadmap.
