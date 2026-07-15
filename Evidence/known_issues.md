# Known Issues

No known functional failure remains in Phase 5 scope.

- Rule 58 remains `PARTIAL`: bounded tests cannot prove long-horizon emergent convergence without rigging it.
- Dry-run source order is exact, but word chips are stored pre-shuffle order; live word order is shuffled once per source.
- Last Run Report keeps only the most recent completed run, not a report archive.
- Pure UI decisions are unit-tested and the components are Browser-tested, but the repo has no DOM component-test environment.
- A fully exhausted Child deliberately stays running so dissatisfaction can rise; this is required behavior.
- `npm ci` reports upstream `node-domexception@1.0.0` deprecation; zero vulnerabilities were reported.
- No Git metadata exists; SHA-256 baselines replace Git diff.
