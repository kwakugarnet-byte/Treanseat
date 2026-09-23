---
name: Imported backup workflows
description: Imported projects can retain managed backup artifacts whose workflows fail after the new workspace is installed.
---

Treat the newly created artifact and its managed workflow as the live app; old `.migration-backup` services may still appear as failed workflow entries.

**Why:** The imported backup retained a separate managed web workflow without installed dependencies, while the active Replit artifact was healthy and served the app correctly.

**How to apply:** Check the active artifact's workflow, proxy URL, and screenshot before debugging a stale backup failure; do not modify the backup copy unless explicitly requested.