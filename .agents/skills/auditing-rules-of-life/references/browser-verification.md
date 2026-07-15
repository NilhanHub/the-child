# Isolated Browser Verification

Use the in-app Browser only after `Prepare` and `StartBrowser` succeed.

## Storage-safe mount

1. Record the audit server port and open `http://127.0.0.1:<port>/@vite/client`, not the app root.
2. Read any current production-origin V2 state only when needed; never write, clear, restore, or migrate it.
3. In the audit tab, use the browser development/CDP runtime to:
   - Save the original `Storage.prototype` methods.
   - Serialize the underlying storage as `storageBefore`.
   - Override `getItem` to return `null` to the app.
   - Override `setItem`, `removeItem`, and `clear` with no-ops that increment `blockedWrites`.
   - Replace the document body with `<div id="root"></div>`.
   - Dynamically import `/src/main.tsx?rules-audit=<unique-run-id>`.
4. Confirm the simulator renders and `blockedWrites` increases.
5. After all scenarios, use the saved original getter to serialize underlying storage again. Require exact equality with `storageBefore`.
6. Record blocked-write count, equality result, console warnings/errors, URL, and scenarios in `Evidence/rules_of_life_audit_work/browser_observations.md`.

If pre-mount storage interception or the final equality check cannot be guaranteed, do not run interactive scenarios. Record the blocker and use `NOT TESTED`.

## Core scenarios

- First milk from Base with no repeated word through automatic detection, pending delay, ok/item, reset, and last-20 learning.
- Repeated milk from own active memory, including exhaustion/waiting without Base fallback or repetition.
- Pending speech while unused words remain, followed by waiting after exhaustion; verify dissatisfaction, countdown, and duplicate prevention.
- New juice traversal through active memories, archived generations, then Base with no repetition across sources.
- Exact save count/words, final speech visibility, no-rule warning, event ordering, and Jump to latest.

## Phase 5 explainability checks

- Confirm **Current Run Summary** names the Need, run/Child/Mother state, matching rule and trigger, current source, depth/pass, unique/unused counts, no-repeat, pending/exhaustion, Base state, and known-versus-fallback path.
- Confirm the pinned current-source summary and vertical traversal timeline keep a sixth or seventh source visible and distinguish current, queued, exhausted, parked, skipped, success, and blocked states.
- Confirm speech metadata retains the final word and identifies source, word number, remaining words, and no-repeat status.
- Confirm compact Mother-rule and Need-memory disclosures preserve edit/search/word visibility.
- Confirm **Last Run Report** appears after delivery with source, trigger position, delay, counts, saved words, Base/exhaustion/waiting, and completion time.
- Confirm event filters preserve newest-first ordering and Jump to latest.
- Confirm the no-rule state explains likely unsatisfied exhaustion and retains Create matching rule.
- Run **Dry Run: Memory Search Plan** for a known Need, a new Need, and a missing trigger. Require source order and outcome to match the current engine without changing real simulator state.

Capture screenshots at Current Run Summary, pinned known source, sixth/seventh fallback source, successful Last Run Report, dry-run known/new/missing-trigger results, Mother-rule search, and no-rule warning when possible.

## Cleanup

Close the audit tab, run `StopBrowser`, and confirm the recorded audit port has zero listeners. Do not stop port 3000 or any process not recorded by the harness.
