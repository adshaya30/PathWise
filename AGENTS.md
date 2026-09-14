# AGENTS.md

## Layout

Monorepo with two independent apps (no root build orchestration):

- `frontend/` — React 19 + TypeScript + Vite + Tailwind 4. Entry: `src/main.tsx`.
- `pathwise-backend/` — Spring Boot 4 (Java 21) + PostgreSQL + JPA. Entry: `com.pathwise.PathwiseBackendApplication`.

## Commands

Frontend (`frontend/`):
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck + build: `npm run build` (runs `tsc -b && vite build`)
- No test framework/script — verify with `npm run build` + `npm run lint`.

Backend (`pathwise-backend/`):
- Compile check: `./mvnw -q compile` (Windows PowerShell: `.\mvnw.cmd -q compile`)
- Tests: `./mvnw test` (pure JUnit, no DB needed)
- Run: `./mvnw spring-boot:run` from `pathwise-backend/` (requires a live PostgreSQL DB)

## Backend config / environment

- Config is `src/main/resources/application.properties`. It loads secrets from `.env` in the backend root via `spring.config.import=optional:file:.env[.properties]` — the app must be run from `pathwise-backend/` so the `.env` resolves.
- Required `.env` vars (see `.env.example`): `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MAIL_USERNAME`, `MAIL_PASSWORD`. Optional: `SUPABASE_URL/KEY/BUCKET`, `GEMINI_API_KEY`, `PORT` (default 8080).
- `spring.jpa.hibernate.ddl-auto=update` — schema is auto-migrated from entities; SQL files under `src/main/resources/db/` are reference only, not auto-run.
- Lombok is used throughout; annotation processors are configured in `pom.xml`.

## Frontend ↔ backend wiring

- No Vite proxy. Frontend services call `http://localhost:8080/api` directly; overrides via `VITE_API_BASE_URL`, `VITE_AUTH_API_URL`, `VITE_API_URL` env vars. Backend must run on 8080 for local dev.
- Backend user-facing modules map to packages under `com.pathwise`: `course` (core eligibility engine, uni codes, cutoffs), `afteral` (A/L results + evaluation), `admin` (handbook upload/parsing + AI extraction), `authentication` (JWT + OTP), `chat` (streaming chat). Top-level `controller/TestController`/`ModelTestController` are dev/test endpoints.
- Eligibility status is a cross-stack contract: backend returns uppercase `ELIGIBLE` / `NEEDS_REVIEW` / `NOT_ELIGIBLE`, and `frontend/src/utils/eligibilityUtils.ts:mapBackendEligibilityStatus` maps them to the display strings "Eligible" / "Needs review" / "Not eligible". If you add/rename a backend status, update that map or it renders as null.
- Core eligibility decision lives in `com.pathwise.course.service.impl.EligibilityEngineServiceImpl`; the UI reads statuses from its `EligibilityResultDto`. The after-al pages group/compare via `frontend/src/utils/eligibilityUtils.ts`.