# P1 LEGACY_STRICT isolated compatibility laboratory

Synthetic endpoints only. No legacy routes, identities or production data are migrated.

Candidate: JDK11, Boot2.3.12.RELEASE, CloudHoxton.SR12, MyBatis starter2.1.4; actual acceptance is recorded in docs/p1-acceptance.md at workspace root.

Modules: eureka-server (two processes 18761/18762), provider-service (18811/18812), consumer-service (18821), gateway-service (18800).

Provider requires LAB_DB_URL / LAB_DB_USER / LAB_DB_PASSWORD for the generated campus_p1_lab_* schema and restricted p1_lab_* account. It rejects production schema addresses. No default production credentials. Eureka peer addresses/low leases and Hystrix thresholds are isolated-lab settings, not production recommendations.

Build using docs/p1-maven.ps1; live verification/start-stop uses docs/p1-run-lab.py. Never execute old Node seed or init scripts. P1 ends before business migration.
