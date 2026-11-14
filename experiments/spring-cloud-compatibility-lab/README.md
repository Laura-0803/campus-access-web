# Spring Cloud 旧版组件兼容性实验室

该实验工程用于验证课程要求的 Eureka、Ribbon、OpenFeign、Hystrix、Gateway 与 MyBatis 组合，仅提供合成接口，不迁移旧系统路由、用户身份或生产数据。

验证基线：JDK 11、Spring Boot 2.3.12.RELEASE、Spring Cloud Hoxton.SR12、MyBatis Starter 2.1.4。

模块说明：`eureka-server`（双进程 18761/18762）、`provider-service`（18811/18812）、`consumer-service`（18821）、`gateway-service`（18800）。

Provider 必须通过 `LAB_DB_URL`、`LAB_DB_USER`、`LAB_DB_PASSWORD` 连接自动生成的 `campus_p1_lab_*` 隔离库，并使用受限的 `p1_lab_*` 账号。代码会拒绝生产库地址，也不提供生产凭据默认值。Eureka 的短租约和 Hystrix 阈值只服务于兼容性实验，不代表生产环境建议。

该目录只保留为课程技术验证源码，不属于正式 Maven reactor。需要复核时可直接使用 JDK 11 和 `mvn -f experiments/spring-cloud-compatibility-lab/pom.xml verify`；正式演示不启动该实验工程。
