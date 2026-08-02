ALTER TABLE relationships ADD COLUMN relative_to_user_id BIGINT;
ALTER TABLE relationships ADD CONSTRAINT fk_relationship_relative_to
  FOREIGN KEY (relative_to_user_id) REFERENCES users(id);
CREATE INDEX idx_relationships_relative_to ON relationships(owner_user_id, relative_to_user_id);
