# The Child

The Child is an explainable rules-of-life simulation that makes internal reasoning, state transitions, needs, learned associations, and graph traversal visible to a human operator.

> [!TIP]
> Start with [ENGINEERING_OVERVIEW.md](ENGINEERING_OVERVIEW.md) for the architecture, code tour, audit evidence, and implementation boundaries.

## What it demonstrates

- A React visualization of an evolving rule-and-state “brain”.
- Auditable traversal paths rather than opaque final answers.
- Dry-run explanations showing which rules were considered and why transitions occurred.
- Needs, observations, speech, memory, and learned behavior represented as inspectable state.
- A structured rules-of-life audit with retained evidence and a reproducible harness.

## Local development

```powershell
npm ci
npm run lint
npm test
npm run build
npm run dev
```

Open `http://localhost:3000`. A Gemini key is optional and belongs only in a local ignored environment file.

## Verification snapshot

The curated public snapshot passes TypeScript checking, 29 Vitest tests, and the Vite production build. The retained Phase 5 evidence bundle records the explainability/traversal audit checkpoint; it is evidence for that checkpoint, not a substitute for rerunning the current code.

## Evidence

Selected public-safe evidence is retained under `Evidence/`, including the rules audit, matrix, traversal explanation, implementation report, verification log, known issues, and the Phase 5 evidence bundle. Duplicate source snapshots, dependencies, and build output are intentionally excluded.

## Scope

This is an experimental explainable simulation, not a psychological model, medical system, autonomous authority, or claim of human-equivalent cognition.
