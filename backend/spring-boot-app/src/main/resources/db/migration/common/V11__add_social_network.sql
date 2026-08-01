ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN surname VARCHAR(255);
ALTER TABLE users ADD COLUMN location VARCHAR(255);

ALTER TABLE relationships ADD COLUMN owner_user_id BIGINT;
ALTER TABLE relationships ADD COLUMN related_user_id BIGINT;
ALTER TABLE relationships ADD CONSTRAINT fk_relationship_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE relationships ADD CONSTRAINT fk_relationship_related FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE relationships ADD CONSTRAINT uq_relationship_pair UNIQUE (owner_user_id, related_user_id);
CREATE INDEX idx_relationship_owner ON relationships(owner_user_id);

ALTER TABLE circles ADD COLUMN owner_user_id BIGINT;
ALTER TABLE circles ADD CONSTRAINT fk_circle_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_circle_owner ON circles(owner_user_id);

CREATE TABLE circle_members (
  circle_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (circle_id, user_id),
  CONSTRAINT fk_circle_member_circle FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
  CONSTRAINT fk_circle_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_circle_member_user ON circle_members(user_id);

CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_surname ON users(surname);
CREATE INDEX idx_users_location ON users(location);
