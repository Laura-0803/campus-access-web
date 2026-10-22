# P2 formal services — isolated course environment

This directory is separate from the unchanged React/Express application and the preserved P1 lab. It is not a production database cutover.

Modules: `eureka-server` (19761/19762), `gateway-service` (19800), `user-service` (19811), and the loopback-only `legacy-adapter` (19830). A second Java process on 19812 tests normal SMS mode and deliberately does not register with Eureka. The original React source runs through a separate Vite configuration on 15173.

Use the repository root for these commands. Existing `.p2-local/runtime.json` is private and must never be printed or committed.

1. On a fresh environment only: `node docs/p2-prepare.mjs`. It refuses to replace existing credentials. It uses existing local administrator credentials only to create new, strictly named P2 schemas and restricted accounts; it never starts the original store or imports original data.
2. `node docs/p2-schema-verify.mjs`, then `node docs/p2-legacy-fixtures.mjs`. Migration V001 is under `user-service/src/main/resources/db/migration/`; the adapter outbox schema is under `legacy-adapter/schema.sql`. Repeat verification creates another empty migration-validation schema and retains the evidence.
3. `powershell -NoProfile -ExecutionPolicy Bypass -File docs/p2-maven.ps1 -EvidenceDirectory docs/p2-evidence/<new-build-directory>`. Evidence directories must be new. The wrapper uses the isolated P1 Java 11 and Maven cache without changing system Java 21.
4. `python docs/p2-runtime.py start`. It checks port availability, launches hidden owned processes, and polls Gateway readiness. `python docs/p2-run-verification.py` additionally gates tests on both registries and Ribbon discovery. It records sanitized HTTP/MySQL/component test assertions; it is not a browser visual test.
5. `python docs/p2-runtime.py stop` stops only recorded processes whose creation timestamps match. Never start `campus-access-web/server/index.js` against the original environment for these tests.

Normal SMS mode requires `P2_SMS_URL` (HTTPS dispatch endpoint) and `P2_SMS_KEY` through protected process configuration. Without a channel it returns 503. Real provider delivery has not been validated. Codes can be returned only with the explicit `P2_DEMO=true`, exact `synthetic-demo` profile, whitelisted synthetic numbers, loopback binding and restricted P2 schema. Internal APIs require a separate random service credential, and the Gateway strips client identity/service headers.

Controllers are separated by authentication, roles, profiles, personnel queries/management, accounts, faces, vehicles, messages and audit queries. Services own transactions; MyBatis interfaces/XML own row operations; entities stay distinct from response whitelists. Session and OTP digests are never response DTO fields. The legacy adapter gets a fresh, transactional user projection for every request; it never creates an old session token or shares the original process cache.

`DELETE /api/people/:id` is intentionally not migrated or enabled in this isolated deployment. It requires an approved cross-domain credential-revocation contract and failure recovery tests. See `docs/p2-delete-contract.md`. Dashboard and reports remain the original Express route implementations. P3 is not authorized.
