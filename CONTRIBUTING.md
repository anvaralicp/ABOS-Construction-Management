# Contributing to ABOS Construction Management Platform

## Module Ownership
* Each module strictly owns its database tables, data models, and business logic.
* Do not bypass module APIs to read/write data owned by another module.

## Dependency Direction
* Applications depend on modules and packages.
* Modules depend on shared packages.
* Modules interact with other modules ONLY via explicitly defined public interfaces/APIs or asynchronous events.

## Change Discipline
* Create an implementation plan before making modifications.
* Ensure tests are run and pass for any modified component.
* Keep changes minimal and focused.

## Testing Expectations
* Unit, integration, API, and end-to-end tests are expected.
* Shared component changes require full regression testing.

## Documentation Expectations
* Update relevant module documentation when making architectural or public interface changes.

## AI Agent Rule
* AI agents must NOT modify unrelated modules during tasks. Scope changes exclusively to the required domains.
