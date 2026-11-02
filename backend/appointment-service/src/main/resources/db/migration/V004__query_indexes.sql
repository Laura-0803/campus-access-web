-- Additive, data-preserving indexes for appointment list, review and recovery paths.
CREATE INDEX ix_appointments_status_start ON appointments(status, visit_start);
CREATE INDEX ix_appointments_created ON appointments(created_at);
CREATE INDEX ix_review_appointment_time ON appointment_review_history(appointment_id, occurred_at);
