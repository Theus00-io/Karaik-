---
name: Password hashing approach
description: Use Node.js crypto instead of bcrypt in this project to avoid build script approval issues.
---

In this monorepo, installing bcrypt triggers a build script approval prompt that blocks the shell. Use Node.js built-in `crypto.pbkdf2Sync` instead.

Format: `salt:hash` where salt is 16 random bytes (hex) and hash is pbkdf2Sync with 100000 iterations, 64 bytes, sha512.

**Why:** bcrypt requires native build scripts; Replit's `pnpm approve-builds` command requires interactive terminal input, which blocks automated shell commands.

**How to apply:** Any time a new route or service needs password hashing, import `crypto` from Node.js and use pbkdf2Sync. The helper functions `createPasswordHash` and `verifyPassword` are in `artifacts/api-server/src/routes/operators.ts`.
