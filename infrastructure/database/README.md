# Database Infrastructure

## Configuration
* Configure your PostgreSQL instance by copying `.env.example` to `.env` and setting `DATABASE_URL`.
* RLS (Row-Level Security) is planned. Application-level tenant enforcement (via `organization_id`) must always be combined with RLS in production.

## Running Prisma
* To format the schema: `npx prisma format`
* To validate the schema: `npx prisma validate`
* To generate the Prisma Client: `npx prisma generate`

## Migrations
* To generate a new migration: `npx prisma migrate dev --name <migration_name>`
* To apply migrations to a production database: `npx prisma migrate deploy`

## Seeding
* Run `npx prisma db seed` (configured in `package.json` to execute `seed.ts`) to populate development constants.

## Conventions
* UUID primary keys (`id`).
* `organization_id` strictly isolates tenant data.
* `project_id` further isolates project data.
* Soft-deletion relies on `deleted_at`, but cascading soft-deletes for financial entities are forbidden (we use explicit restrictive rules).
