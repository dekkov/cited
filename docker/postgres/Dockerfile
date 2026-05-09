# Pinned: pgvector 0.8.2 on Postgres 17 per CLAUDE.md
# CLAUDE.md forbids Postgres 17.0–17.2 due to pgvector linker bug.
# The floating `pg17` tag may resolve to a forbidden minor; pin the exact tag.
FROM pgvector/pgvector:0.8.2-pg17
COPY init.sql /docker-entrypoint-initdb.d/00_init.sql
