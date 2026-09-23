# Orin Automations

Describe the **input** and the **output you want**. Orin AI builds the system in between.

By **Orin AI** · Januth Nimnal · MIT · live at `automations.orinai.org` (planned)

## Thesis

No workflow builders. No node graphs. You state what goes in and what must
come out — triggers, schedules, sources, destinations — and Orin's agents
design, build and run the pipeline: code, integrations, retries, monitoring.

```
YOU                        ORIN AUTOMATIONS
─────────────────          ─────────────────────────
input + wanted output  →   plan → build → run → output
                               ↑___________|
                           self-healing runs
```

## Status

**Scaffolding.** Product scope is being defined (see open questions below).
Landing page: `index.html` (static, no build).

## Open questions (blocking v1)

1. **Runtime** — serverless functions, sandbox-backed workers, local gateway,
   or all three?
2. **Notes integration** — Obsidian's application source is proprietary (only
   the plugin API typings are public). Integration path TBD: plugin-API based,
   or an open notes core.
3. **Orin Code integration** — shared markdown engine vs. embedded notes UI
   vs. automation triggers from code events.

## License

MIT — Januth Nimnal.
