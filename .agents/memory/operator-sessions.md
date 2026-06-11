---
name: Operator session storage
description: Operator auth sessions are stored in-memory in this project, not in the database.
---

Operator sessions use a server-side `Map<token, operatorId>` and a `op_session` cookie (httpOnly, sameSite: strict, 8h TTL).

**Why:** Simple in-memory store avoids a DB sessions table for a karaoke night use case where restarts between events are acceptable.

**How to apply:** If persistence across server restarts is needed, add a `sessions` table to the DB schema and migrate the lookup. For now, operators just re-login after a restart.
