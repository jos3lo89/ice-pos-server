# Agent Guide for ice-pos-server

Purpose
- This document guides agentic coding tools working in this repo.
- It captures build, lint, test commands and local code style.

Project quick facts
- Stack: NestJS + TypeScript + Prisma + PostgreSQL.
- Runtime: Node.js 20.x, npm 10.x (see README prerequisites).
- Path alias: `@/` maps to `src/` (tsconfig + swc).
- Module system: `nodenext`, runtime CommonJS output (SWC).

Cursor/Copilot rules
- No `.cursorrules` or `.cursor/rules/` found in this repo.
- No `.github/copilot-instructions.md` found in this repo.

Core commands
- Install deps: `npm install`.
- Build (SWC via Nest): `npm run build`.
- Start dev server: `npm run start:dev`.
- Start prod server: `npm run start:prod` (after build).
- Lint (auto-fix): `npm run lint`.
- Format (Prettier): `npm run format`.

Tests
- Unit tests (Jest): `npm run test`.
- Watch mode: `npm run test:watch`.
- Coverage: `npm run test:cov`.
- Debug (Node inspector): `npm run test:debug`.
- E2E tests: `npm run test:e2e` (uses `test/jest-e2e.json`).

Run a single test
- By file (unit):
  `npm run test -- src/modules/auth/auth.service.spec.ts`
- By test name (unit):
  `npm run test -- --testNamePattern="login"`
- By file (e2e):
  `npm run test:e2e -- --runTestsByPath test/app.e2e-spec.ts`
- Tip: Jest config for unit tests lives in `package.json`.

Repository layout (high level)
- `src/` application source (Nest modules, services, controllers).
- `src/core/` infrastructure like Prisma and config.
- `src/common/` shared decorators, guards, interceptors, interfaces.
- `prisma/` schema, migrations, and seed.
- `test/` end-to-end tests.

Code style rules (enforced by config)
- Prettier: single quotes, trailing commas (see `.prettierrc`).
- ESLint: `prettier/prettier` is an error, so format matters.
- ESLint: `@typescript-eslint/no-explicit-any` is off.
- ESLint: `no-floating-promises` and `no-unsafe-argument` warn.
- TypeScript: `strictNullChecks` is on; `noImplicitAny` is off.

Imports
- Prefer absolute imports from `@/` when targeting `src/`.
- Use type-only imports where possible, e.g. `import { type X }`.
- Keep import groups tidy and remove unused imports.
- Default import CommonJS libs (`bcryptjs`, `cookie-parser`).

Formatting and language
- TypeScript files use `.ts`; tests use `.spec.ts` or `.e2e-spec.ts`.
- Keep lines formatted by Prettier; do not fight the formatter.
- Use ASCII by default; match existing Spanish messages for errors.

Naming conventions
- Files: kebab-case (e.g. `auth.controller.ts`).
- Classes: PascalCase (`AuthService`, `CreateUserDto`).
- Methods/vars: camelCase.
- DTOs: `CreateXDto`, `UpdateXDto`, `FindXQueryDto`.
- Prisma fields and DTO properties often use snake_case when required
  by database or API contract (see `CreateUserDto`).

NestJS patterns
- Controllers handle routing and delegate to services.
- Services contain business logic and data access (Prisma).
- Modules wire controllers and providers.
- Use decorators for guards/roles/auth (`@Auth()` etc.).

Validation and DTOs
- Use `class-validator` decorators on DTOs.
- ValidationPipe is global with `whitelist` and `forbidNonWhitelisted`.
- Always keep DTOs aligned with request payloads.

Error handling
- Throw Nest exceptions (`NotFoundException`, `UnauthorizedException`, etc.).
- Avoid returning error objects directly from services.
- Preserve safe error messages and avoid leaking sensitive data.

Security and data hygiene
- Never return passwords; strip sensitive fields before returning.
- Respect `NODE_ENV` for cookie security (`secure`/`sameSite`).
- Validate environment variables via `vars.config.ts` (Joi).
- Do not commit real secrets or `.env` files.

Prisma and database
- Use `PrismaService` from `@/core/prisma` for DB access.
- After schema changes, run:
  `npx prisma generate`
  `npx prisma migrate dev`
- Seed data is optional: `npx prisma db seed`.

Logging
- Use Nest `Logger` for structured logs.
- Keep logs concise in production; avoid noisy debug logs.

Testing conventions
- Unit tests are colocated with source in `src/**/*.spec.ts`.
- E2E tests live under `test/*.e2e-spec.ts`.
- Favor testing public service methods and controller routes.

When adding new code
- Mirror existing folder structure under `src/modules`.
- Keep modules focused and cohesive.
- Update or add DTOs and validators for new endpoints.
- Add or update tests when behavior changes.

File references worth knowing
- Lint config: `eslint.config.mjs`.
- Prettier config: `.prettierrc`.
- Jest config (unit): `package.json`.
- Jest config (e2e): `test/jest-e2e.json`.
- TS config: `tsconfig.json` and `tsconfig.build.json`.

Agent checklist before finishing
- Do not run tests; the user will run them.
- Do not start the server; the user will run it.
- Keep formatting clean (Prettier + ESLint).
- Ensure imports use `@/` where appropriate.
- Verify no secrets are introduced.
