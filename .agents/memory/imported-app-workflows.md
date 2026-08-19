---
name: Imported app workflow routing
description: Port and workflow considerations when an imported project has both generated artifacts and migration-backup copies.
---

When an imported project has both generated starter artifacts and preserved `.migration-backup` artifacts, the preserved app may be the user-facing implementation while the generated service still owns the same port. Stop the starter service before starting the preserved service for verification.

**Why:** Both API services can bind the same configured port, causing the preserved app to fail with `EADDRINUSE` or causing requests to reach the empty starter API.

**How to apply:** Inspect both artifact trees and workflow logs before testing; route requests through the shared proxy only after the intended API workflow is running.