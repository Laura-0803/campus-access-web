-- Additive, data-preserving indexes for access history, QR validation and device views.
CREATE INDEX ix_access_records_person_time ON access_records(person_id, time);
CREATE INDEX ix_access_records_status_time ON access_records(status, time);
CREATE INDEX ix_qr_codes_status_valid_to ON qr_codes(status, valid_to);
CREATE INDEX ix_devices_gate_status ON devices(gate, status);
CREATE INDEX ix_access_rules_role_status ON access_rules(role, status);
