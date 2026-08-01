ALTER TABLE users ADD COLUMN account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX idx_users_account_status ON users(account_status);
