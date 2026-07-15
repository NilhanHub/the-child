# Rules being obeyed

## Rule 1

- **Rule text:** There is a Mother and a Child.
- **Status:** YES
- **Evidence:** Rendered UI has distinct “The Child” and “The Mother” panels.

## Rule 2

- **Rule text:** The Child can have one active Need at a time.
- **Status:** YES
- **Evidence:** SimulationState has one currentNeed field; CREATE_NEED replaces it and UI states “one at a time”.

## Rule 3

- **Rule text:** The user creates or triggers a Need.
- **Status:** YES
- **Evidence:** NeedControl form and quick buttons dispatch CREATE_NEED; Browser verified Begin Need.

## Rule 4

- **Rule text:** A Need has a name.
- **Status:** YES
- **Evidence:** Need.needName is required runtime state and is shown in the UI.

## Rule 5

- **Rule text:** Example Need names include milk, water, food, toy, sleep.
- **Status:** YES
- **Evidence:** Quick controls and default rules include milk, water, food, toy, and sleep.

## Rule 6

- **Rule text:** The Need name matters.
- **Status:** YES
- **Evidence:** Normalized Need name keys Mother matching and per-Need memory selection.

## Rule 7

- **Rule text:** Mother can only satisfy a Need if she has a matching rule for it.
- **Status:** YES
- **Evidence:** childSpoke schedules delivery only when an enabled rule matches the active Need and spoken trigger.

## Rule 8

- **Rule text:** Every Need has a dissatisfaction variable.
- **Status:** YES
- **Evidence:** Need includes dissatisfaction; createNeed initializes it to exactly 0.

## Rule 9

- **Rule text:** Dissatisfaction starts at 0 when the Need begins.
- **Status:** YES
- **Evidence:** Need includes dissatisfaction; createNeed initializes it to exactly 0.

## Rule 10

- **Rule text:** Dissatisfaction rises slowly over time.
- **Status:** YES
- **Evidence:** tickState increases dissatisfaction from elapsed time while the active simulation runs.

## Rule 11

- **Rule text:** The rise speed is programmable per Need.
- **Status:** YES
- **Evidence:** dissatisfactionRisePerMinute is stored per Need and editable before Need creation.

## Rule 12

- **Rule text:** Default rise speed should be 1 point per minute.
- **Status:** YES
- **Evidence:** DEFAULT_NEED sets 1 point/minute; Browser showed “1 point/min”.

## Rule 13

- **Rule text:** The Need has an action threshold.
- **Status:** YES
- **Evidence:** actionThreshold is per Need and editable through the labeled Threshold control.

## Rule 14

- **Rule text:** The threshold is programmable.
- **Status:** YES
- **Evidence:** actionThreshold is per Need and editable through the labeled Threshold control.

## Rule 15

- **Rule text:** When dissatisfaction is below the threshold, the Child waits.
- **Status:** YES
- **Evidence:** tickState returns without speech while dissatisfaction is at or below threshold.

## Rule 16

- **Rule text:** When dissatisfaction rises above the threshold, the Child must act.
- **Status:** YES
- **Evidence:** When dissatisfaction exceeds threshold, tickState selects words and childSpoke emits them.

## Rule 17

- **Rule text:** The Child’s only action is to say/print words to the screen.
- **Status:** YES
- **Evidence:** The implemented Child action path only creates speech events; no pointing, movement, grabbing, or gesture action exists.

## Rule 18

- **Rule text:** The Child does not point, move, grab, or gesture yet.
- **Status:** YES
- **Evidence:** The implemented Child action path only creates speech events; no pointing, movement, grabbing, or gesture action exists.

## Rule 19

- **Rule text:** The Child says words from a selected word list.
- **Status:** YES
- **Evidence:** Speech is drawn from traversal.remainingWords belonging to the selected fallback source.

## Rule 20

- **Rule text:** Words are said at random gaps between 0 and 3 seconds.
- **Status:** YES
- **Evidence:** After speech, nextWordInMs is random() × 3,000, producing a 0–3 second gap.

## Rule 21

- **Rule text:** The Child starts with a base list of 70 early-child words.
- **Status:** YES
- **Evidence:** BASE_WORDS contains exactly 70 entries.

## Rule 22

- **Rule text:** The 70-word base list includes words like mama, dada, milk, more, water, food, toy, sleep.
- **Status:** YES
- **Evidence:** BASE_WORDS includes mama, dada, milk, more, water, food, toy, and sleep.

## Rule 23

- **Rule text:** The base 70-word list is not always used first.
- **Status:** YES
- **Evidence:** Known/new Needs with available memories select memory sources before Base.

## Rule 24

- **Rule text:** The base 70-word list is the final fallback.
- **Status:** YES
- **Evidence:** Fallback plans append Base last; known-own-memory behavior never activates its queued Base entry.

## Rule 25

- **Rule text:** The Mother has her own rules.
- **Status:** YES
- **Evidence:** MotherRule records and the editable Mother Rules panel are present.

## Rule 26

- **Rule text:** A Mother rule says: for this Need, if the Child says this word, give this thing.
- **Status:** YES
- **Evidence:** MotherRule contains needName, triggerWord, and itemGiven, plus delay and enabled state.

## Rule 27

- **Rule text:** Example rule: Need milk, trigger word milk, give item milk.
- **Status:** YES
- **Evidence:** The seeded milk rule maps Need milk + word milk to item milk.

## Rule 28

- **Rule text:** Mother listens automatically.
- **Status:** YES
- **Evidence:** Mother matching runs automatically from every childSpoke event.

## Rule 29

- **Rule text:** If the Child says the correct trigger word for the active Need, Mother detects it.
- **Status:** YES
- **Evidence:** Browser log showed automatic detection of “milk” for active milk.

## Rule 30

- **Rule text:** The correct word does not instantly satisfy the Need.
- **Status:** YES
- **Evidence:** Detection creates pendingDelivery; it does not reset or learn immediately.

## Rule 31

- **Rule text:** Mother waits a random delay.
- **Status:** YES
- **Evidence:** Delay is randomly interpolated between each rule minimum and maximum.

## Rule 32

- **Rule text:** Default delay is 9 to 12 seconds.
- **Status:** YES
- **Evidence:** All five default rules use 9–12 seconds; tests verify an in-range 10.5-second delay.

## Rule 33

- **Rule text:** During this delay, Mother is in a pending/preparing state.
- **Status:** YES
- **Evidence:** Browser captured Mother phase “preparing” with a live pending countdown.

## Rule 34

- **Rule text:** Mother must not schedule duplicate deliveries for the same Need.
- **Status:** YES
- **Evidence:** childSpoke returns after recording speech when pendingDelivery exists; duplicate-delay test passes.

## Rule 35

- **Rule text:** After the delay, Mother says “ok”.
- **Status:** YES
- **Evidence:** completeDelivery logs and displays Mother saying “ok” only when the timer expires.

## Rule 36

- **Rule text:** Mother then gives the requested item.
- **Status:** YES
- **Evidence:** completeDelivery records and displays the configured item given.

## Rule 37

- **Rule text:** Only after Mother says “ok” and gives the item does dissatisfaction reset.
- **Status:** YES
- **Evidence:** Only completeDelivery performs the success reset after ok/item events.

## Rule 38

- **Rule text:** Dissatisfaction resets immediately to 0.
- **Status:** YES
- **Evidence:** completeDelivery sets dissatisfaction to exactly 0 in the same state transition.

## Rule 39

- **Rule text:** The reset is the Child’s proof that something worked.
- **Status:** YES
- **Evidence:** Learning is triggered by the delivery/reset transition, providing the success signal.

## Rule 40

- **Rule text:** The Child is not directly told which exact word worked.
- **Status:** YES
- **Evidence:** Learning saves the recent stream as a group and never passes the trigger word separately to memory.

## Rule 41

- **Rule text:** The Child only knows that the recent words before “ok” may have worked.
- **Status:** YES
- **Evidence:** The algorithm treats the latest speech window—not one identified word—as the plausible cause.

## Rule 42

- **Rule text:** When dissatisfaction resets, the Child saves the words spoken in that round.
- **Status:** YES
- **Evidence:** createNeed clears the round stream; completeDelivery saves from that round speechStream.

## Rule 43

- **Rule text:** It saves up to the last 20 words.
- **Status:** YES
- **Evidence:** completeDelivery uses speechStream.slice(-20); automated last-20 tests pass.

## Rule 44

- **Rule text:** If fewer than 20 words were spoken, it saves all of them.
- **Status:** YES
- **Evidence:** slice(-20) preserves all events when the round contains fewer than 20; Browser saved 12/12 on repeat.

## Rule 45

- **Rule text:** The saved words become a plausible approach for that Need.
- **Status:** YES
- **Evidence:** The saved list becomes the NeedMemory activeMemoryWords used on the next matching Need.

## Rule 46

- **Rule text:** Each Need has its own active memory.
- **Status:** YES
- **Evidence:** needMemories is keyed by normalized Need name and each record owns activeMemoryWords.

## Rule 47

- **Rule text:** milk has its own active memory.
- **Status:** YES
- **Evidence:** The generic per-name memory map supports an independent active memory for this seeded Need without shared storage.

## Rule 48

- **Rule text:** water has its own active memory.
- **Status:** YES
- **Evidence:** The generic per-name memory map supports an independent active memory for this seeded Need without shared storage.

## Rule 49

- **Rule text:** food has its own active memory.
- **Status:** YES
- **Evidence:** The generic per-name memory map supports an independent active memory for this seeded Need without shared storage.

## Rule 50

- **Rule text:** toy has its own active memory.
- **Status:** YES
- **Evidence:** The generic per-name memory map supports an independent active memory for this seeded Need without shared storage.

## Rule 51

- **Rule text:** A Need’s active memory is the newest successful word list for that Need.
- **Status:** YES
- **Evidence:** Every success replaces activeMemoryWords with the newest learned list.

## Rule 52

- **Rule text:** Every successful saved list is also kept in history.
- **Status:** YES
- **Evidence:** Every success appends its list to savedLists while incrementing successCount.

## Rule 53

- **Rule text:** Saved lists are kept chronologically.
- **Status:** YES
- **Evidence:** savedLists is append-only in success order; UI labels and renders it chronologically.

## Rule 54

- **Rule text:** Older lists are not deleted.
- **Status:** YES
- **Evidence:** Normal learning never removes prior savedLists; reset behavior is separately user-controlled.

## Rule 55

- **Rule text:** Re-triggering the same Need uses that Need’s active memory first.
- **Status:** YES
- **Evidence:** buildFallbackPlan returns own_active first when the target Need has active memory.

## Rule 56

- **Rule text:** Example: if milk has learned milk, then next time milk is needed, Child uses milk memory first.
- **Status:** YES
- **Evidence:** Browser repeated milk and visibly selected “milk own active memory”.

## Rule 57

- **Rule text:** Each successful round may shrink the active memory.
- **Status:** YES
- **Evidence:** Browser demonstrated active milk memory shrinking naturally from 20 words to 12 after the next success.

## Rule 59

- **Rule text:** If a Need is new and has no active memory, the Child must not jump straight to the base 70-word list.
- **Status:** YES
- **Evidence:** A new Need uses known memories first when any exist; Base is immediate only when no known memory exists.

## Rule 60

- **Rule text:** For a new Need, the Child first tries other known Needs’ active memories.
- **Status:** YES
- **Evidence:** Depth 0 is built from all other known Needs activeMemoryWords before archived sources.

## Rule 61

- **Rule text:** Example: new Need juice may first try the active memory for milk.
- **Status:** YES
- **Evidence:** The generic depth-0 iteration includes this known Need active memory in creation-time order when available.

## Rule 62

- **Rule text:** Then it may try the active memory for water.
- **Status:** YES
- **Evidence:** The generic depth-0 iteration includes this known Need active memory in creation-time order when available.

## Rule 63

- **Rule text:** Then it may try the active memory for food.
- **Status:** YES
- **Evidence:** The generic depth-0 iteration includes this known Need active memory in creation-time order when available.

## Rule 64

- **Rule text:** If active memories do not work, the Child walks backward through older saved lists.
- **Status:** YES
- **Evidence:** After active memories, the plan adds older saved lists before Base.

## Rule 65

- **Rule text:** It walks back one generation at a time.
- **Status:** YES
- **Evidence:** History index decreases one saved generation per increasing depth.

## Rule 66

- **Rule text:** Search depth 0 means current active memories.
- **Status:** YES
- **Evidence:** Plan depth 0 is explicitly assigned to borrowed active memories.

## Rule 67

- **Rule text:** Search depth 1 means previous saved lists.
- **Status:** YES
- **Evidence:** Depth 1 selects savedLists[length−2], the generation before current active memory.

## Rule 68

- **Rule text:** Search depth 2 means older saved lists.
- **Status:** YES
- **Evidence:** Depth 2 selects the next older saved generation.

## Rule 69

- **Rule text:** This continues across all known Need memories.
- **Status:** YES
- **Evidence:** Depth-major nested loops traverse each generation across all known Needs.

## Rule 70

- **Rule text:** Only after all known memories fail does the Child use the base 70-word list.
- **Status:** YES
- **Evidence:** Browser juice run parked milk active and archived sources before reaching Base FINAL.

## Rule 71

- **Rule text:** If a borrowed list works for a new Need, the new Need gets its own memory.
- **Status:** YES
- **Evidence:** completeDelivery saves under the active new Need key even when currentWordSource is borrowed.

## Rule 72

- **Rule text:** Example: if a borrowed list helps satisfy juice, then juice now gets its own active memory.
- **Status:** YES
- **Evidence:** The same generic borrowed-success path applies to juice and records its own NeedMemory.

## Rule 73

- **Rule text:** From then on, juice uses its own active memory first.
- **Status:** YES
- **Evidence:** Once created, juice own active memory satisfies the own_active-first branch.

## Rule 74

- **Rule text:** The Child’s brain workings must be visible on screen.
- **Status:** YES
- **Evidence:** Dashboard exposes Child, Mother, speech, traversal, memories, rules, and real event log panels.

## Rule 75

- **Rule text:** The UI must show the current Need.
- **Status:** YES
- **Evidence:** Current Run Summary and Child panels display the active Need prominently.

## Rule 76

- **Rule text:** The UI must show dissatisfaction level.
- **Status:** YES
- **Evidence:** Child panel shows numeric dissatisfaction and a progress bar.

## Rule 77

- **Rule text:** The UI must show rise rate.
- **Status:** YES
- **Evidence:** Need Control shows the per-Need rise rate.

## Rule 78

- **Rule text:** The UI must show action threshold.
- **Status:** YES
- **Evidence:** Child and Need Control panels show the action threshold.

## Rule 79

- **Rule text:** The UI must show Child mode: waiting, rising, speaking, pending/preparing, satisfied, learning saved.
- **Status:** YES
- **Evidence:** Current Run Summary and Child panel expose waiting, rising, speaking, pending/preparing, source-exhausted, satisfied, and learning-saved states.

## Rule 80

- **Rule text:** The UI must show the current word source.
- **Status:** YES
- **Evidence:** Pinned current-source beacon, speech metadata, Current Run Summary, and vertical timeline name the exact current source.

## Rule 81

- **Rule text:** The UI must show whether the source is own memory, borrowed memory, archived memory, or base list.
- **Status:** YES
- **Evidence:** Summary, beacon, dry run, and timeline label own active, borrowed active, archived, and Base types explicitly.

## Rule 82

- **Rule text:** The UI must show fallback depth.
- **Status:** YES
- **Evidence:** Current Run Summary and every timeline/dry-run step display depth or final fallback.

## Rule 83

- **Rule text:** The UI must show which Need memory is being borrowed.
- **Status:** YES
- **Evidence:** Pinned source and timeline display the borrowed source Need.

## Rule 84

- **Rule text:** The UI must show words spoken this round.
- **Status:** YES
- **Evidence:** Speech beacon, Current Run Summary, timeline, and Last Run Report show run word counts.

## Rule 85

- **Rule text:** The UI must show Mother status.
- **Status:** YES
- **Evidence:** Current Run Summary and Mother panel show listening/preparing/item-given status.

## Rule 86

- **Rule text:** The UI must show whether Mother has a matching rule for the active Need.
- **Status:** YES
- **Evidence:** Current Run Summary and Need Control show found/not-found Mother-rule status, trigger, item, and first enabled match.

## Rule 87

- **Rule text:** The UI must warn if no Mother rule can satisfy the current Need.
- **Status:** YES
- **Evidence:** No-rule warning explains likely unsatisfied exhaustion and offers Create matching rule; Browser action created the rule.

## Rule 88

- **Rule text:** The UI must show pending Mother delivery.
- **Status:** YES
- **Evidence:** Current Run Summary and Mother panel expose pending state and countdown.

## Rule 89

- **Rule text:** The UI must show Mother saying “ok”.
- **Status:** YES
- **Evidence:** Mother panel, event log, and Last Run Report preserve visible ok/delivery evidence.

## Rule 90

- **Rule text:** The UI must show the item given.
- **Status:** YES
- **Evidence:** Mother panel and matching-rule summary display the item to be given/given.

## Rule 91

- **Rule text:** The UI must show memory saved after reset.
- **Status:** YES
- **Evidence:** Learning-saved state, exact memory log, compact Need memory card, and Last Run Report show saved memory.

## Rule 92

- **Rule text:** The UI must show active memory for the current Need.
- **Status:** YES
- **Evidence:** Compact current Need memory disclosure shows active count and expandable words; relevant card is highlighted.

## Rule 93

- **Rule text:** The UI must show saved list history.
- **Status:** YES
- **Evidence:** Current Need History retains expandable chronological saved lists.

## Rule 94

- **Rule text:** The UI must show all Need memories.
- **Status:** YES
- **Evidence:** Need Memories lists every known Need as compact summary cards with wins and active counts.

## Rule 95

- **Rule text:** The UI must show the Brain/Event Log.
- **Status:** YES
- **Evidence:** Brain/Event Log remains visible with seven category filters, Newest first, counts, and Jump to latest.

## Rule 96

- **Rule text:** The Brain/Event Log must record real events, not fake text.
- **Status:** YES
- **Evidence:** Filters operate on real engine LogEvent records; zero-gap Browser traversal showed actual skip/depth/Base/exhaustion events.

## Rule 97

- **Rule text:** localStorage should persist the Child’s learned memory.
- **Status:** YES
- **Evidence:** SimulationContext writes the V2 envelope to localStorage and loads it paused; persistence tests pass. Audit read the current key without modifying it.

## Rule 98

- **Rule text:** There must be a way to clear/reset learned memory.
- **Status:** YES
- **Evidence:** Confirmed Clear Brain and Factory Reset controls exist; engine reset tests pass. Audit did not invoke them.

## Rule 99

- **Rule text:** Clearing memory must not delete the base 70-word list.
- **Status:** YES
- **Evidence:** BASE_WORDS is an immutable module constant and clearBrain does not touch it.

## Rule 100

- **Rule text:** Clearing memory must not delete default Mother rules.
- **Status:** YES
- **Evidence:** clearBrain retains state.motherRules; automated reset-scope test passes.

## Rule 101

- **Rule text:** Manual Mother controls may exist, but only as clearly marked test controls.
- **Status:** YES
- **Evidence:** No manual fulfil/delivery bypass exists; Mother controls are rule configuration only.

## Rule 102

- **Rule text:** Normal learning must work automatically without pressing manual fulfil.
- **Status:** YES
- **Evidence:** Browser completed milk detection, delivery, reset, and learning without manual fulfilment.

## Rule 103

- **Rule text:** The app must make it obvious when the Child is yelling into the void because no Mother rule matches the Need.
- **Status:** YES
- **Evidence:** Unsatisfiable juice produced a prominent amber warning and continued speaking/fallback behavior.

## Rule 104

- **Rule text:** The goal is not just word guessing.
- **Status:** YES
- **Evidence:** The UI and engine center on state change and memory formation, not a standalone word-guess result.

## Rule 105

- **Rule text:** The goal is visible learning through Need → dissatisfaction → speech → Mother response → reset → memory.
- **Status:** YES
- **Evidence:** Browser visibly demonstrated Need → dissatisfaction → speech → response → reset → saved memory.

## Rule 106

- **Rule text:** For a known Need with its own active memory, exhausting that memory must not repeat words; it must wait with no unused words remaining.
- **Status:** YES
- **Evidence:** Known-Need test and Browser timeline prove own active memory exhausts without repeat and waits.

## Rule 107

- **Rule text:** For a known Need with its own active memory, exhausting the active memory must not make the Child jump to Base.
- **Status:** YES
- **Evidence:** Known-Need Current Run and timeline show Base blocked and baseReached no.

## Rule 108

- **Rule text:** For a known Need with its own active memory, exhausting the active memory must not make the Child fall back to older archived lists.
- **Status:** YES
- **Evidence:** The known-Need branch recycles before any fallback advancement and never selects archived lists.

## Rule 109

- **Rule text:** Older saved lists for a known Need are historical records, not active behavior, unless a future regression/confusion mode is explicitly introduced.
- **Status:** YES
- **Evidence:** Known-Need plans contain own active plus unreachable queued Base; own archived generations are not active sources.

## Rule 110

- **Rule text:** During Mother pending/preparing delay, the Child must keep speaking while unused words remain in the current source, then wait without repeating when exhausted.
- **Status:** YES
- **Evidence:** Engine regressions preserve pending speech only while current-source unused words remain, followed by waiting.

## Rule 111

- **Rule text:** During Mother pending/preparing delay, dissatisfaction must continue until Mother says ok and gives the item.
- **Status:** YES
- **Evidence:** Browser pending snapshot showed dissatisfaction at 18.76 and still rising before ok; regression passes.

## Rule 112

- **Rule text:** The final spoken word should remain visible in the Child Speech Stream after satisfaction.
- **Status:** YES
- **Evidence:** SpeechStream is retained by completeDelivery; Browser post-delivery view kept the final word and test asserts it.

## Rule 113

- **Rule text:** The event log should clearly show ordering, such as Newest First or Oldest First.
- **Status:** YES
- **Evidence:** Event log explicitly labels itself “Newest first”.

## Rule 114

- **Rule text:** The event log should make latest events easy to see, by auto-scroll or Jump to latest.
- **Status:** YES
- **Evidence:** Browser forced the log away from top, exposed Jump to latest, clicked it, and verified scrollTop 0.

## Rule 115

- **Rule text:** Memory-save log entries should show exact saved words and saved count.
- **Status:** YES
- **Evidence:** Memory-save event displays “saved last N of M” followed by the exact chronological word list.

## Rule 116

- **Rule text:** The current accepted UX is: user may click Begin Need first, then Start. Begin Need does not need to auto-start for now.
- **Status:** YES
- **Evidence:** Browser verified Begin Need creates a paused active Need and Start separately begins the clock.

## Rule 117

- **Rule text:** During a single Need run, the Child must not repeat a word already spoken in that run, including across fallback sources.
- **Status:** YES
- **Evidence:** Automated tests and zero-gap Browser run produced 70 spoken/70 unique across seven sources with globally-used sources skipped.

# Rules not being obeyed / not fully verified

## Rule 58

- **Rule text:** Over time, the Child should naturally whittle a broad list down toward useful word or words, but this must not be artificially forced or rigged.
- **Status:** PARTIAL
- **Evidence:** PARTIAL: last-20 replacement permits unforced emergent narrowing, but sustained long-horizon convergence cannot be deterministically proven without rigging.

