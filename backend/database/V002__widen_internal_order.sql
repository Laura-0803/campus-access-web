-- Only the isolated-schema verifier may replace __P2_USER_SCHEMA__ after checking its name.
-- New V001 schemas already use BIGINT. Repeating these definitions preserves existing values.
ALTER TABLE __P2_USER_SCHEMA__.users MODIFY sort_order BIGINT NOT NULL DEFAULT 0;
ALTER TABLE __P2_USER_SCHEMA__.people MODIFY sort_order BIGINT NOT NULL DEFAULT 0;
ALTER TABLE __P2_USER_SCHEMA__.faces MODIFY sort_order BIGINT NOT NULL DEFAULT 0;
ALTER TABLE __P2_USER_SCHEMA__.vehicles MODIFY sort_order BIGINT NOT NULL DEFAULT 0;
ALTER TABLE __P2_USER_SCHEMA__.messages MODIFY sort_order BIGINT NOT NULL DEFAULT 0;
ALTER TABLE __P2_USER_SCHEMA__.logs MODIFY sort_order BIGINT NOT NULL DEFAULT 0;
