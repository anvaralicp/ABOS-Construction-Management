# ABOS-DEVELOPMENT-RULES

## 1. REPOSITORY ISOLATION
* Work only inside this repository.
* Never modify another project.
* Never copy or import files from another project unless explicitly instructed.
* Never create project files outside this repository.

## 2. MODULAR DEVELOPMENT
* The platform will be developed as independent modules.
* Every module must have a clearly defined responsibility.
* Modules must expose documented interfaces/contracts.
* Avoid hidden coupling.
* Shared functionality belongs in shared packages.
* Do not duplicate common functionality unnecessarily.

## 3. CHANGE DISCIPLINE
Before modifying existing code:
* Inspect the relevant code.
* Identify dependencies.
* Understand existing interfaces.
* Create an implementation plan.
* Make the smallest appropriate change.
* Run relevant tests.
* Report what changed.

## 4. NO UNNECESSARY REWRITES
* Do not rewrite working code without a documented reason.
* Do not replace frameworks or libraries without justification.
* Do not make architectural changes without documentation.

## 5. SECURITY
* Multi-tenant data isolation is mandatory.
* Authorization must be enforced server-side.
* Never expose one organization's data to another organization.
* Never hard-code secrets.
* Use environment variables for credentials and secrets.

## 6. DATABASE DISCIPLINE
* Database schema changes must be controlled and documented.
* Migrations must be version controlled.
* Each business module must have clear ownership of its data.
* Do not directly modify another module's data without an explicitly defined relationship.

## 7. API DISCIPLINE
* APIs must use documented contracts.
* Validate requests at the API boundary.
* Authentication and authorization must be enforced server-side.
* Avoid undocumented breaking changes.

## 8. TESTING
* New functionality requires appropriate tests.
* Shared component changes require regression testing.
* Do not claim unfinished functionality is complete.
* Fix failing tests before declaring a task complete.

## 9. DOCUMENTATION
* Important architectural decisions must be documented.
* Major modules must eventually contain their own documentation.
* Update documentation when architecture or public interfaces change.

## 10. AI CODING RULE
* Do not make assumptions when requirements are ambiguous.
* Inspect the repository and relevant documentation before implementing.
* If a requirement is unclear and could materially affect architecture or data, stop and ask for clarification rather than inventing a design.
