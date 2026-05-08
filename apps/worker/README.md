# apps/worker — Phase 5 Stub

> **DO NOT add code here in Phase 1–4.**
> This directory is intentionally empty (documentation only) until v0.5 / Phase 5.

## What This Will Become

In Phase 5, `apps/worker` is promoted to a Python service (FastAPI + faster-whisper + pyannote) responsible for the automated clip-extraction pipeline:

1. Download YouTube audio
2. Transcribe with faster-whisper
3. Diarize speakers with pyannote
4. Extract claims via Claude Sonnet
5. Route to admin review queue (approval required before any clip is published)

## Job-Table Contract

The worker communicates with the main Postgres database via two job tables defined in `packages/api-contracts`:

### `extraction_jobs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `youtube_url` | `text` | Source video URL |
| `status` | `enum` | `pending \| running \| done \| failed` |
| `error` | `text?` | Error message if failed |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `clips_pending`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `job_id` | `uuid` | FK → `extraction_jobs.id` |
| `claim` | `text` | Extracted health claim |
| `speaker` | `text` | Attributed speaker |
| `start_sec` | `integer` | Clip start in seconds |
| `end_sec` | `integer` | Clip end in seconds |
| `status` | `enum` | `pending \| approved \| rejected` |
| `admin_notes` | `text?` | Admin review notes |

The Zod schemas for these tables are defined in `packages/api-contracts/src/index.ts` (populated in plan 01-04).

## Phase 5 Infrastructure

- **Runtime:** Python 3.12 + FastAPI + Uvicorn
- **ML models:** faster-whisper (transcription), pyannote (diarization)
- **LLM:** Claude Sonnet (claim extraction + reasoning)
- **Hosting:** Hetzner CX22 (~€4/mo)
- **Background jobs:** Trigger.dev or Inngest (replace Supabase pg_cron for durable workflows)
- **Object storage:** Cloudflare R2 (transcript cache) + MinIO (self-host path)

## Self-Host Notes

Self-hosters without a GPU can skip the worker entirely — all hand-curated clips entered via the admin UI remain fully functional. The worker is an **optional accelerator**, not a required dependency for core functionality.

## Contributor Path

When Phase 5 begins, this stub will be replaced with:
```
apps/worker/
  pyproject.toml
  Dockerfile
  src/
    main.py          # FastAPI entry point
    jobs/
      extract.py     # Extraction pipeline
      transcribe.py  # faster-whisper wrapper
      diarize.py     # pyannote wrapper
    models/
      clips.py       # Pydantic models matching api-contracts Zod schemas
```
