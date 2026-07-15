---
name: auditing-rules-of-life
description: Use when auditing The Child or another Rules-of-Life simulator for compliance, regression confidence, browser behavior, rule-by-rule verdicts, or a verified Evidence ZIP handoff.
---

# Auditing Rules of Life

## Overview

Run a strict, repeatable audit against the versioned canonical rules. Treat lack of proof as failure to verify; never infer a YES from old evidence.

## Workflow

1. Run `npm run audit:rules`. This creates an isolated runtime, hashes app files, runs install/lint/tests/build, snapshots source, and scaffolds `Evidence/rules_of_life_audit_work/verdicts.csv`.
2. Inspect current source and tests. Read the active `references/rules-of-life-v2.csv`; keep v1 immutable.
3. Use **REQUIRED SUB-SKILL:** `browser:control-in-app-browser`. Follow `references/browser-verification.md` before any browser interaction.
4. Fill every verdict row with exactly `YES`, `NO`, `PARTIAL`, or `NOT TESTED`, plus concise evidence and verification method.
5. Complete the work-folder audit notes and browser observations. Put only audit-specific PNG files in its `screenshots` folder.
6. Stop the audit-owned server with the harness. Never stop a pre-existing listener.
7. Run `npm run audit:rules:finalize`. Do not report completion unless it validates and extract-tests the final ZIP.

## Verdict Standard

| Status | Use only when |
|---|---|
| YES | Current source plus tests or browser proof fully establish the rule. |
| NO | Current behavior directly contradicts the rule. |
| PARTIAL | The rule is incomplete, implicit, fragile, or only partly demonstrated. |
| NOT TESTED | Safe verification was unavailable. |

Place every non-YES rule under the generated "Rules not being obeyed / not fully verified" heading.

## Safety Invariants

- Never edit `src`, Mother rules, learned memories, or persistent localStorage during an audit.
- Never invoke Clear Brain or Factory Reset.
- Run npm gates in the Evidence-contained isolated runtime, not against locked live dependencies.
- Block storage writes before mounting an interactive browser session and byte-compare storage afterward.
- Write audit artifacts only under `Evidence`; the harness rejects escaping paths.
- Preserve exact canonical rule wording and ordering. Rule 58 remains emergent and must not be failed merely because convergence is unforced.

## Commands

```powershell
npm run audit:rules
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/auditing-rules-of-life/scripts/audit-harness.ps1 -Phase StartBrowser -Port 4175
powershell -NoProfile -ExecutionPolicy Bypass -File .agents/skills/auditing-rules-of-life/scripts/audit-harness.ps1 -Phase StopBrowser
npm run audit:rules:finalize
npm run audit:rules:self-test
```

## Failure Handling

- Command failure: preserve logs and classify affected rules strictly.
- Storage suppression unavailable: skip state-changing browser flows and mark them NOT TESTED.
- Source hash drift: stop; an audit cannot finalize after app changes.
- ZIP validation failure: fix the evidence pipeline and rerun Finalize.

The active v2 ruleset adds run-wide no-repeat behavior and replaces own-memory recycling with exhaustion/waiting. Future changes require another versioned file; never mutate `rules-of-life-v1.csv`.

Phase 5 UI explainability is audited as visible proof of the existing v2 rules, not as a new brain ruleset. Verify Current Run Summary, the pinned current source and complete vertical timeline, Last Run Report, event filters, compact rule/memory disclosures, and the read-only Dry Run: Memory Search Plan against the actual engine source order.
