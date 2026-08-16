ALTER TABLE direct_messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE direct_messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
UPDATE direct_messages SET delivered_at = created_at WHERE delivered_at IS NULL;
CREATE INDEX idx_direct_messages_unread ON direct_messages(recipient_user_id, read_at, created_at);
