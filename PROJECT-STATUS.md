# Project Status

## Current Phase
Phase 0 - Foundation

## Completed
* Git repository initialization
* Architecture documentation defined
* Approved technology baseline established

## Current Task
Repository/application skeleton creation

## Next Planned Phase
Platform foundation

## Architecture Rules That Must Not Be Violated
1. No cross-tenant data access (Multi-tenant isolation is mandatory).
2. Modules must communicate via interfaces/events, not direct DB access.
3. No blanket last-write-wins for offline sync; optimistic concurrency must be used.
4. Secrets must never be hardcoded.
