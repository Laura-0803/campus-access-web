# P1 LEGACY_STRICT isolated compatibility laboratory

Synthetic endpoints only. No legacy routes, identities or production data are migrated.

Candidate: JDK11, Boot2.3.12.RELEASE, CloudHoxton.SR12, MyBatis starter2.1.4; historical acceptance is summarized in `docs/archive/COURSE_HISTORY.md`.

Modules: eureka-server (two processes 18761/18762), provider-service (18811/18812), consumer-service (18821), gateway-service (18800).

Provider requires LAB_DB_URL / LAB_DB_USER / LAB_DB_PASSWORD for the generated campus_p1_lab_* schema and restricted p1_lab_* account. It rejects production schema addresses. No default production credentials. Eureka peer addresses/low leases and Hystrix thresholds are isolated-lab settings, not production recommendations.

该目录只保留为课程阶段实验源码，不属于正式 Maven reactor。需要复核时可直接使用 JDK 11 和 `mvn -f experiments/p1-legacy-lab/pom.xml verify`；正式演示不启动该实验工程。
