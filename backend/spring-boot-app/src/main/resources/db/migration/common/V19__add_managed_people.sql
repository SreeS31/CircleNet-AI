ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE users ADD COLUMN identity_type VARCHAR(24) NOT NULL DEFAULT 'ACCOUNT';
ALTER TABLE users ADD COLUMN managed_category VARCHAR(24);
ALTER TABLE users ADD COLUMN guardian_user_id BIGINT;
ALTER TABLE users ADD COLUMN claim_status VARCHAR(48) NOT NULL DEFAULT 'NONE';
ALTER TABLE users ADD COLUMN managed_date_of_birth VARCHAR(10);
ALTER TABLE users ADD COLUMN managed_date_of_death VARCHAR(10);
ALTER TABLE users ADD COLUMN managed_notes VARCHAR(2000);

ALTER TABLE users ADD CONSTRAINT fk_users_guardian
  FOREIGN KEY (guardian_user_id) REFERENCES users(id);
CREATE INDEX idx_users_identity_type ON users(identity_type);
CREATE INDEX idx_users_guardian ON users(guardian_user_id);
