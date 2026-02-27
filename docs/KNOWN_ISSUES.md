# Known Issues

## Active Bugs

### Explorer `available = true` requirement
Product nodes must have `available = true` boolean property or explorer Cypher returns 0 results. New products loaded without this property are invisible to search.

### Enrichment too aggressive
Interest assignment by expand-*.ts scripts is too broad. Manual cleanup needed after every enrichment run. See cleanup log in `docs/CHANGELOG.md`.

### bar_raiser.py cypher-shell parsing bug
The pipeline quality gate `scripts/pipeline/bar_raiser.py` has a cypher-shell output parsing bug that gives false negatives (reports 20% when actual is 100%).

### 287 pre-existing TS errors
TypeScript errors exist in scripts/, tests, dialogue-presenter, and answer-merger. These predate the current codebase and do not block runtime.

## Fixed Issues (recent)

### Interest deduplication (fixed v3.5.0)
112 duplicate Interest nodes (70 yoga, 41 skateboarding, 4 coffee) merged down to 113 unique.

### Bar Raiser stochasticity (fixed v3.3.1)
Scores were highly stochastic (teen nephew swung 72->34). Deterministic overrides now keep scores stable within +/-2 points. Need 3+ run averages only for edge cases.

### Age-inappropriate products (fixed v3.4.0)
Explorer now filters baby/toddler products for age >= 13 and kids products for age >= 18.
