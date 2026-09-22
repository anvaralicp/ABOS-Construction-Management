# Reports Export & Document Generation

## Objective
Provides safe, tenant-isolated document generation exporting authoritative calculations directly from the `ReportsService` boundaries. It establishes reliable formula injection mitigation for CSV and XLSX streams.

## Endpoints
* `GET /api/v1/reports/project-summary/export`
* `GET /api/v1/reports/financial/export`
* `GET /api/v1/reports/expenses/export`
* `GET /api/v1/reports/budget/export`
* `GET /api/v1/reports/vendors/export`
* `GET /api/v1/reports/workforce/export`
* `GET /api/v1/reports/equipment/export`
* `GET /api/v1/reports/progress/export`

### Formats Supported
* `?format=csv` (CSV format)
* `?format=xlsx` (XLSX format generated natively using `exceljs`)

## Filters
Export APIs consume precisely the identical query/filter schemas utilized by the base reporting APIs, preventing duplicated vocabulary. These include filters for dates (`date_from`, `date_to`), project IDs, vendors, and statuses.

## Export Sizes & Buffer Limits
Exports are heavily bound by strict server-side memory enforcement. Any backend query attempting to construct and return a buffer exceeding **10,000 items** immediately halts and terminates with a `400 BadRequestException`. The limit is imposed on returned array counts intentionally bypassing implicit `LIMIT 50` API bounds without introducing uncontrolled volume overheads, ensuring true data fidelity rather than API truncation logic. We output file streams directly to the HTTP response (`Content-Disposition: attachment`) as buffers since S3 artifacts are not required in this initial bounded state.

## Security & Tenant Isolation
All reporting data strictly scopes directly into context tenant variables (`@CurrentTenant() context.organizationId`) fed natively into `ReportsService`. External overrides mapping to differing organizational trees gracefully yield empty buffers or explicitly block the request at the SQL boundary through Prisma constraint joins.

## Formula Injection Mitigation & Financial Precision
When rendering `CSV` and `XLSX` lines, the engine automatically interrogates leading sequences:
- `=, +, -, @`  
If detected on text, string literals are neutralized implicitly (e.g., `'=SUM()`). 
**Exception Strategy**: Crucially, any authentic numerical data (including negative representations natively like `-1250`) remains unscathed and unescaped. Floating point conversions are explicitly prevented. In `XLSX`, these persist as genuine Excel Number formatting types. No macro scripts or calculated business calculations are placed into generated cells (authoritative server-side values only). Dates are maintained authentically as Excel Date cells.

## Auditing
A persistent `REPORT_EXPORT` action fires to `AuditService`, locking the requested schema filter length and user ID, intentionally discarding the heavy payload or financial artifacts from tracking metadata parameters to preserve log sterility.

## Known Limitations & Runtime Status
* **RUNTIME NOT VERIFIED** — npm/Prisma processes remain blocked by the known environment limitation. Static verification of the `exceljs` library interfaces confirms workbook generation logic is correctly mapped structurally.
* True stream integration (e.g. `fast-csv` or `exceljs` Stream objects) could reduce bounded memory pressure. We currently generate buffers bounded structurally.
* Localizing raw formatting (`MM/DD/YYYY`) defaults to standard patterns.
