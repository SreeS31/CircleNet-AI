CREATE VIEW IF NOT EXISTS dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM users) AS user_count,
  (SELECT COUNT(*) FROM people) AS person_count,
  (SELECT COUNT(*) FROM circles) AS circle_count,
  (SELECT COUNT(*) FROM relationships) AS relationship_count,
  (SELECT COUNT(*) FROM permissions) AS permission_count;
