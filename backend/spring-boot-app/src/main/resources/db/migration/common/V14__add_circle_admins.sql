CREATE TABLE circle_admins (
  circle_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (circle_id, user_id),
  CONSTRAINT fk_circle_admin_circle FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
  CONSTRAINT fk_circle_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO circle_members (circle_id, user_id)
SELECT c.id, c.owner_user_id FROM circles c
WHERE c.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = c.owner_user_id);

INSERT INTO circle_admins (circle_id, user_id)
SELECT c.id, c.owner_user_id FROM circles c WHERE c.owner_user_id IS NOT NULL;
