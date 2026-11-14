-- 智慧校园微服务本机数据库准备模板
-- 执行前必须将所有 CHANGE_ME_* 替换为本机生成的强密码，并确认连接的是本机 MySQL。
-- 本文件只创建隔离数据库和最小权限账号，不创建业务表；业务表结构见 refactor/*/V100__target_schema.sql。

CREATE DATABASE IF NOT EXISTS cam_identity_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS cam_appointment_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS cam_passage_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS cam_incident_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cam_identity_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_IDENTITY_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'cam_appointment_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_APPOINTMENT_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'cam_passage_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_PASSAGE_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'cam_incident_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_INCIDENT_DB_PASSWORD';

ALTER USER 'cam_identity_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_IDENTITY_DB_PASSWORD';
ALTER USER 'cam_appointment_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_APPOINTMENT_DB_PASSWORD';
ALTER USER 'cam_passage_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_PASSAGE_DB_PASSWORD';
ALTER USER 'cam_incident_dev_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_INCIDENT_DB_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE ON cam_identity_dev.* TO 'cam_identity_dev_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON cam_appointment_dev.* TO 'cam_appointment_dev_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON cam_passage_dev.* TO 'cam_passage_dev_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON cam_incident_dev.* TO 'cam_incident_dev_app'@'127.0.0.1';

FLUSH PRIVILEGES;
