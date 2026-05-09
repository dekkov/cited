-- Bootstrap SQL for Cited compose stack.
-- Runs once on first container start (docker-entrypoint-initdb.d).
-- Creates the auth schema and roles GoTrue (supabase/gotrue) requires,
-- plus the Postgres extensions used by the application.

create schema if not exists auth;

-- Supabase role set required by GoTrue and RLS policies.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login password 'authenticator';
grant anon, authenticated, service_role to authenticator;

-- GoTrue connects as supabase_auth_admin (see GOTRUE_DB_DATABASE_URL in docker-compose.yml).
-- Without this role GoTrue fails to start ("role does not exist").
create role supabase_auth_admin login password 'postgres';
grant all on schema auth to supabase_auth_admin;
grant connect on database postgres to supabase_auth_admin;

alter database postgres set search_path to public, extensions;

-- Extensions required by the application.
create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
