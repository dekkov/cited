---
id: SEED-001
status: dormant
planted: 2026-05-19
planted_during: v0.5 Phase 03 (user-ai-loop-the-demo, Wave 3)
trigger_when: clip corpus exceeds ~50K rows OR a non-clip evidence type lands on the roadmap OR cross-modal retrieval is required
scope: Large
---

# SEED-001: Knowledge-layer architecture re-evaluation

## Why This Matters

The current knowledge layer — **Postgres + pgvector (HNSW) + Drizzle + tsvector hybrid RRF retrieval** — is the right choice for a solo-curated, DOAC-only MVP holding <1K clips. It keeps every layer in one datastore (no second vendor, no sync layer), Drizzle exposes pgvector and tsvector as first-class SQL, and RLS authenticates every read at the DB level.

But three plausible expansions would break the assumptions that justify this stack:

1. **Corpus scale.** HNSW handles up to ~1M vectors comfortably; latency starts to matter well before that when combined with metadata filters (domain/speaker/risk_flags). 50K is when we should start measuring, not when we should panic.
2. **Schema heterogeneity.** A research paper has fields a clip does not (authors, DOI, journal, peer-review status, abstract, full-text). Cramming all of it into the existing `clips` table with 20 nullable columns is the wrong move. A `papers` (and possibly `articles`, `books`) sibling table, with chunks/embeddings of its own, and a unified `evidence_units` view that the retrieval layer queries, is the natural path.
3. **Modality.** If we ever embed audio or images (speaker fingerprinting, slide capture from video, etc.), text-only OpenAI embeddings won't cover it.

The trigger for re-evaluation is **any one** of (1), (2), (3) — not all three. Without this seed, the most likely failure mode is reaching for a heavyweight tool (someone suggested Databricks Genie in the conversation that spawned this seed) without understanding that Genie is a *natural-language-over-warehouse* BI tool, not a content classification or RAG layer. **It would solve none of (1), (2), (3) and add significant cost + lock-in.**

## When to Surface

**Trigger:** post-v1 launch, when any of these are concretely on the roadmap:

- (a) Clip count crossing ~50K (current: ~8 seeded, ~30 target at v1 launch)
- (b) A non-clip evidence type added to scope (research papers, articles, books, newsletters)
- (c) Cross-modal retrieval requirement (audio embeddings, image embeddings, speaker identification)

Surface this seed during `/gsd:new-milestone` when the milestone's scope mentions any of:

- Corpus growth / scale / performance
- Adding evidence types beyond podcast clips
- Multi-modal / audio / image / video understanding
- Vector DB / search infrastructure
- Federated search / external sources

## Scope Estimate

**Large** — likely a full milestone if it triggers. Realistic shape:

- Phase: Schema split (introduce `evidence_units` polymorphic parent or sibling tables + view)
- Phase: Retrieval refactor (hybrid retrieval query reads the view, not `clips` directly)
- Phase: Benchmark pgvector at the new scale; decide whether to stay or move to a dedicated vector store (Qdrant / Weaviate / Vespa) — most likely **stay** unless latency demands force a move
- Phase: (only if modality triggers) add audio/image embedding pipeline + per-modality indexes

If only one of the three triggers fires, scope shrinks proportionally. The corpus-scale trigger alone is often a "tune HNSW parameters and add filters earlier in the plan" exercise (Small), not a full architecture rebuild.

## Explicit Non-Goals (when this triggers)

- **Do not adopt Databricks Genie or equivalent warehouse-BI tools** as a content classification layer. They solve a different problem (natural-language SQL over BI data) and would add a per-query SKU cost on top of the existing OpenAI/Anthropic spend.
- **Do not move to a managed vector DB as a default.** Pinecone/Weaviate/Qdrant-cloud add a second vendor and a sync layer for a workload that pgvector handles at this size. The bar to move off pgvector is "we measured and it failed," not "someone wrote a blog post."
- **Do not collapse heterogeneous evidence types into one wide table.** A 30-column `documents` table with most fields nullable is the anti-pattern. Sibling tables + a view is the path.

## Breadcrumbs

Current knowledge-layer code, in priority order:

- `packages/db/src/schema/clips.ts` — canonical clip row (embedding, claim, speaker, domain, risk_flags, youtube_video_id, start_seconds, end_seconds)
- `packages/db/src/schema/transcript-chunks.ts` — per-chunk embeddings used by `groundingCheck`
- `packages/db/src/schema/habit-templates.ts` + `habit-template-clips.ts` — the curated template ↔ clip junction (the layer that would gain `paper` / `article` cousins)
- `apps/web/app/api/synthesize/route.ts` (lines ~113–198) — hybrid retrieval CTE (filtered → vec_ranked → text_ranked → fused via RRF). This is the query that would need to read from `evidence_units` view if we split schemas.
- `packages/core/src/llm/grounding/similarityCheck.ts` — grounding check against `transcript_chunks`. For non-clip evidence types (papers, articles), the equivalent grounding source needs to be defined per type.
- `CLAUDE.md` → Recommended Stack section — current Drizzle + pgvector 0.8.2 + HNSW + OpenAI text-embedding-3-small commitments and the documented "abstract embeddings behind a single function" note (Voyage was already flagged as a swap target).

## Notes

The conversation that planted this seed asked specifically whether the DB is "object storage" — it is not. It's a relational + full-text + vector layer in one Postgres instance. Object storage (R2/MinIO) is already scoped for v0.5 transcript caching only, not for the knowledge layer itself.

The user's instinct that "expanding beyond DOAC will get complicated" is correct in the abstract but premature in the current state — the current stack already handles "more podcasts" with zero schema changes. The complication only appears when a non-clip evidence type or a non-text modality lands. That's the inflection point this seed is designed to catch.
