-- Additive, data-preserving indexes for exception handling and blacklist lookup.
CREATE INDEX ix_exceptions_status_risk_time ON exceptions(status, risk, time);
CREATE INDEX ix_blacklist_credential_status ON blacklist(credential_no, status);
CREATE INDEX ix_incident_outbox_state_retry ON incident_outbox(state, next_retry_at);
