-- Additive, data-preserving indexes for the queries used by UserMapper/DomainMapper.
-- Apply once after V001. Rollback: backend/database/rollback/user_V002.sql.
CREATE INDEX ix_people_type_status ON people(type, status);
CREATE INDEX ix_users_role_status ON users(role, status);
CREATE INDEX ix_sessions_expires_at ON sessions(expires_at);
CREATE INDEX ix_messages_target_created ON messages(target_role, created_at);
CREATE INDEX ix_logs_time ON logs(time);
