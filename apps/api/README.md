# ABOS API Foundation

This is the canonical NestJS API application for the ABOS Construction Management Platform.

## How to Start
1. Ensure the PostgreSQL database is running (see \`infrastructure/database/README.md\`).
2. Run \`npm install\` (Note: currently blocked by environment constraints).
3. Start the API using \`npm run start:dev\`.

## Environment Configuration
Copy \`.env.example\` to \`.env\`.
Do not hardcode secrets or credentials in the source code.
The API depends on the \`DATABASE_URL\` pointing to the PostgreSQL instance established in the database foundation.

## API Versioning
The API follows REST versioning via URI. The current default is \`/api/v1\`.

## OpenAPI (Swagger) Access
When running in development, OpenAPI documentation is automatically generated and served at:
\`http://localhost:3000/api/docs\`
The contract is generated from decorators on the controllers/DTOs, establishing a single source of truth.

## Identity & Authentication
Authentication is implemented via a JWT Bearer strategy.
* Passwords are securely hashed using Argon2id.
* The `/api/v1/auth/login` endpoint returns a short-lived \`accessToken\` and a long-lived \`refreshToken\`.
* Refresh tokens are stored securely as hashed values in the database (via \`refresh_token_hash\`) to permit instant revocation.
* Passwords and tokens are never logged or stored in plaintext.

## Tenant Context & Authorization
* **Strict Tenant Rule**: Every tenant-aware request must execute within an explicit \`TenantContext\`.
* **Flow**: Authentication verifies JWT -> The \`TenantGuard\` reads the \`x-organization-id\` header -> Looks up active \`OrganizationMembership\` in the database -> Populates \`TenantContext\` on the Request.
* The \`@CurrentTenant()\` decorator injects this validated context into controllers. Never accept \`organization_id\` directly from a user request body.
* The \`@RequirePermissions()\` decorator validates route access against the user's role-based permissions array in their TenantContext.

## Error Format
All API errors follow a structured format processed by the \`GlobalExceptionFilter\`:
\`\`\`json
{
  "statusCode": 400,
  "type": "ValidationError",
  "message": "Validation failed",
  "details": ["field must be a string"],
  "timestamp": "2023-10-01T12:00:00Z",
  "path": "/api/v1/resource"
}
\`\`\`
Raw database errors (Prisma) are sanitized to prevent leakage of database internals.

## Development & Testing Commands
* Build: \`npm run build\`
* Format: \`npm run format\`
* Lint: \`npm run lint\`
* Unit Tests: \`npm run test\`
* E2E Tests: \`npm run test:e2e\`
