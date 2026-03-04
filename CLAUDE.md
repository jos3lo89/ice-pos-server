# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev       # Hot-reload dev server
npm run build           # Compile TypeScript (SWC via Nest CLI)
npm run start:prod      # Run compiled output

# Code quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format

# Tests
npm run test                                        # All unit tests
npm run test -- src/modules/auth/auth.service.spec.ts  # Single file
npm run test -- --testNamePattern="login"           # By test name
npm run test:e2e                                    # E2E tests
npm run test:cov                                    # Coverage

# Prisma
npx prisma generate          # Regenerate client after schema changes
npx prisma migrate dev       # Create + apply migration (dev)
npx prisma migrate deploy    # Apply migrations (prod)
npx prisma db seed           # Seed initial data
npx prisma studio            # GUI browser for the database
```

## Architecture

NestJS REST API backed by PostgreSQL via Prisma ORM. All routes are prefixed with `api/v1` (configurable via `API_PREFIX`). The `/health` endpoint is excluded from the prefix.

**Auth flow:** JWT stored as HTTP-only cookies. `POST /api/v1/auth/login` issues the token. Guards (`JwtAuthGuard` + `RolesGuard`) are combined in the `@Auth(...roles)` composite decorator from `src/common/decorators/auth.decorator.ts`. Use `@Auth()` (no args) to require any authenticated user, or `@Auth(RolUsuario.admin, RolUsuario.cajero)` to restrict by role.

**Cash session guard:** Some endpoints also require an active cash session. Use `@RequireCashRegister()` + `@CurrentCashSession()` from `src/common/decorators/`.

**Module structure under `src/modules/`:**
- `auth` — login/logout, JWT strategy
- `users` — employee CRUD
- `categories` / `products` — menu catalog with variants and modifiers
- `floors` / `tables` — physical floor/table layout
- `orders` — order lifecycle (pendiente → preparando → listo → servido → completado/cancelado)
- `payments` — payment processing (efectivo, tarjeta, yape, plin); links orders to cash sessions
- `cash-sessions` — cashier session open/close with saldo tracking
- `cash-movements` (`transacciones_caja`) — manual income/expense entries within a session
- `clients` — customer records for invoicing (boleta/factura)
- `reports` — aggregated reporting across sessions and payments

**Core infrastructure (`src/core/`):**
- `prisma/` — `PrismaService` (extend `PrismaClient`); import `PrismaModule` to use it
- `config/vars.config.ts` — Joi schema validates all required env vars on startup

**Prisma client** is generated to `src/generated/prisma/`. Import enums and types from `@/generated/prisma` (not from `@prisma/client`).

## Key Conventions

- **Path alias:** `@/` maps to `src/`. Prefer over relative imports.
- **DB models use snake_case** (Spanish names matching the business domain).
- **DTOs:** named `CreateXDto`, `UpdateXDto`, `FindXQueryDto`; always use `class-validator` decorators.
- **Error handling:** throw NestJS exceptions (`NotFoundException`, `ConflictException`, etc.) from services, never return error objects.
- **Env vars:** `DATABASE_URL`, `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `API_PREFIX`, `JWT_SECRET` — all validated by Joi at startup.
- **CommonJS libs** (`bcryptjs`, `cookie-parser`) must use default import syntax.
- In production, CORS is restricted to `CORS_ORIGINS`; in development all origins are allowed.
