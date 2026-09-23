---
name: Artifact path prefixes
description: Mounted web artifact URLs need their base path preserved in browser-visible links and assets.
---

Use `import.meta.env.BASE_URL` for browser-visible asset URLs and other app-owned paths in mounted Vite artifacts.

**Why:** The Bike Manager preview is mounted below a path prefix, so `/logo.jpg` requested the workspace root and returned 404 even though the asset existed in the artifact's public directory.

**How to apply:** When migrating an app to a non-root preview path, replace root-absolute public asset references with `${import.meta.env.BASE_URL}asset-name`.