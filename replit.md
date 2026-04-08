# Workspace

## Overview

Full-stack Rental Management System (B2B SaaS) built on a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/rental-mgmt), served at /
- **API framework**: Express 5 (artifacts/api-server), served at /api
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Charts**: Recharts
- **Styling**: Tailwind CSS v4

## Application Modules

- **Dashboard**: KPI cards (revenue, occupancy, maintenance, overdue), top debtors list, monthly revenue chart, recent activity feed
- **Properties**: CRUD for properties and nested units with occupancy tracking
- **Tenants**: Tenant database with search, contact info, emergency contacts
- **Leases**: Lease tracking with dates, status, auto-linked tenants/units
- **Payments**: Transaction log with inline status toggle (Paid/Pending/Overdue), manual entry form
- **Maintenance**: Ticket system with priority (Low/Medium/High/Urgent), status workflow, category filters
- **Reports**: Monthly P&L chart + table, Arrears report
- **Users**: Role-based access control (Admin/Staff)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/rental-mgmt run dev` — run frontend locally

## DB Schema

Tables: properties, units, tenants, leases, payments, maintenance_tickets, system_users

## API Routes

All routes under /api prefix:
- GET/POST /api/properties, /api/properties/:id (PUT/DELETE)
- GET/POST /api/units, /api/units/:id (PUT/DELETE), /api/properties/:id/units
- GET/POST /api/tenants, /api/tenants/:id (GET/PUT/DELETE)
- GET/POST /api/leases, /api/leases/:id (GET/PUT/DELETE)
- GET/POST /api/payments, /api/payments/:id (GET/PUT/DELETE)
- GET/POST /api/maintenance, /api/maintenance/:id (GET/PUT/DELETE)
- GET/POST /api/users, /api/users/:id (PUT/DELETE)
- GET /api/dashboard/summary, /api/dashboard/top-debtors, /api/dashboard/recent-activity, /api/dashboard/monthly-revenue
- GET /api/reports/profit-loss, /api/reports/arrears

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
