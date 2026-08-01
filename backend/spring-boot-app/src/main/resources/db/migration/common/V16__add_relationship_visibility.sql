ALTER TABLE relationships ADD COLUMN visibility_scope VARCHAR(20) NOT NULL DEFAULT 'FRIENDS';
ALTER TABLE relationships ADD COLUMN visibility_company VARCHAR(255);

CREATE INDEX idx_relationships_related_visibility
  ON relationships (related_user_id, visibility_scope);
