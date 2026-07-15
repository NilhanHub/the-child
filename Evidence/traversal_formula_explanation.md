# Actual Traversal Formula Explanation

This document describes the implemented Phase 5 engine, not an inferred or idealized formula.

## Normalization and run scope

- Need names and words are trimmed and compared case-insensitively.
- Each source is deduplicated before use.
- Creating a Need starts a new run and clears `speechStream`.
- Within that run, `speechStream` is the authoritative set of already-spoken words.
- A word can be spoken at most once in the run, regardless of which source contains it. A future run may speak it again.
- Each source’s unique words are shuffled once when the run plan is created. Source order is deterministic; word order within a source is randomized.

## Known Need formula

A Need is known when its normalized key has a non-empty active memory.

1. Build the own active-memory source at depth 0.
2. The planner also creates a nominal Base entry for diagnostics.
3. Live traversal never advances from own active memory to that Base entry.
4. Archived lists for the known Need are not included as active behavior.
5. When every unique own-memory word has been spoken, the source is tried, parked, and exhausted.
6. Child mode becomes `source_exhausted`; Base remains unreached and the Child waits.

If Mother is pending when own memory exhausts, the Child waits in the same source until delivery. Dissatisfaction and countdown continue.

## New Need formula

A Need with no non-empty own active memory uses fallback traversal. Known memories are ordered by Need `createdAt`, oldest first, then traversed depth-major:

1. Depth 0: every other Need’s active memory, in creation order.
2. Depth 1: each Need’s immediately previous saved generation, in that order.
3. Depth 2: each Need’s next older generation, in that order.
4. Continue until no Need has another older generation.
5. Append Base 70-word list as final fallback.

The active generation is not repeated as archived history. Archived depth `d` uses `savedLists[length - 1 - d]`; depth 1 is the generation before the active/latest list.

## No-repeat effect

Before a source runs, all words already in `speechStream` are removed.

- If unused words remain, that filtered source runs.
- If none remain, it is tried, parked, exhausted, and explicitly skipped because all words were already spoken.
- Base receives the same filter, so it contributes at most 70 words and often fewer after borrowed memories.
- `childSpoke` independently rejects duplicates as a final invariant.

## Base use and blocking

- New Need: Base is always the final live fallback.
- Known Need with own active memory: Base is blocked and never activated.
- Dry-run only: Include Base can hide it diagnostically; that switch does not change live behavior.

## Mother matching and trigger behavior

Mother selects the first enabled rule whose Need matches the active Need. Only that rule’s normalized trigger schedules delivery.

- A diagnostic trigger may exist in a source while no Mother rule exists; Mother will not schedule delivery.
- A diagnostic trigger different from the matching rule’s trigger is also non-actionable.
- When the actionable trigger is spoken, exactly one delivery is scheduled.
- During pending, the Child continues only through unused words in the current source and never advances sources.
- If that source exhausts, speech waits while dissatisfaction and countdown continue.
- At zero, Mother says “ok”, gives the item, resets dissatisfaction, and saves the latest up to 20 chronological words.

## Trigger not found

- Known Need: own memory exhausts and waits without Base/archive fallback.
- New Need: usable active/archive sources and Base exhaust; duplicate-only sources are skipped; the Child waits unsatisfied.
- Dissatisfaction continues while running. No delivery occurs without both an enabled matching rule and an available source containing its trigger.

## Differences from earlier discussion or labels

- The old UI said “depth-first.” The code is depth-major across Needs: all active memories, then all depth-1 generations, and so on. Phase 5 labels it accurately.
- The planner contains a nominal Base entry for a known Need, but live code blocks it. Phase 5 shows it as blocked.
- Phase 3 recycled known own memory. Phase 4 superseded this with run-wide no-repeat and waiting; Phase 5 preserves Phase 4.
- Source order is exact. Live word order cannot be predicted before the one-time shuffle, so dry-run chips show stored pre-shuffle order.

## Edge cases

- Empty/duplicate-only sources skip without speech.
- Multiple matching rules use the first enabled array entry.
- A source can be current and exhausted/waiting.
- Older V2 state without `lastRunReport` or `traversal.skipped` defaults to `null` and `[]`.
- The fixed 50 ms React clock preserves elapsed-time math and clamps one delayed tick to 250 ms, preventing zero-gap reducer warnings without changing brain rules.
