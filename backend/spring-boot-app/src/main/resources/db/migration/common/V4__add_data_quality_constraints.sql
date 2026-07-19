ALTER TABLE users
  ADD CONSTRAINT chk_users_username_not_blank
  CHECK (CHAR_LENGTH(TRIM(username)) > 0);

ALTER TABLE users
  ADD CONSTRAINT chk_users_email_not_blank
  CHECK (CHAR_LENGTH(TRIM(email)) > 0);

ALTER TABLE users
  ADD CONSTRAINT chk_users_password_hash_not_blank
  CHECK (CHAR_LENGTH(TRIM(password_hash)) > 0);

ALTER TABLE people
  ADD CONSTRAINT chk_people_full_name_not_blank
  CHECK (CHAR_LENGTH(TRIM(full_name)) > 0);

ALTER TABLE people
  ADD CONSTRAINT chk_people_email_not_blank
  CHECK (CHAR_LENGTH(TRIM(email)) > 0);

ALTER TABLE circles
  ADD CONSTRAINT chk_circles_name_not_blank
  CHECK (CHAR_LENGTH(TRIM(name)) > 0);

ALTER TABLE circles
  ADD CONSTRAINT chk_circles_description_not_blank
  CHECK (CHAR_LENGTH(TRIM(description)) > 0);

ALTER TABLE relationships
  ADD CONSTRAINT chk_relationships_type_not_blank
  CHECK (CHAR_LENGTH(TRIM(type)) > 0);

ALTER TABLE permissions
  ADD CONSTRAINT chk_permissions_name_not_blank
  CHECK (CHAR_LENGTH(TRIM(name)) > 0);

ALTER TABLE permissions
  ADD CONSTRAINT chk_permissions_description_not_blank
  CHECK (CHAR_LENGTH(TRIM(description)) > 0);

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_name_not_blank
  CHECK (CHAR_LENGTH(TRIM(name)) > 0);

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_description_not_blank
  CHECK (CHAR_LENGTH(TRIM(description)) > 0);

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_status_allowed
  CHECK (status IN ('Active', 'Planning', 'Completed'));

ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_title_not_blank
  CHECK (CHAR_LENGTH(TRIM(title)) > 0);

ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_details_not_blank
  CHECK (CHAR_LENGTH(TRIM(details)) > 0);

ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_status_allowed
  CHECK (status IN ('Todo', 'In Progress', 'Done'));

ALTER TABLE milestones
  ADD CONSTRAINT chk_milestones_name_not_blank
  CHECK (CHAR_LENGTH(TRIM(name)) > 0);

ALTER TABLE milestones
  ADD CONSTRAINT chk_milestones_description_not_blank
  CHECK (CHAR_LENGTH(TRIM(description)) > 0);

ALTER TABLE milestones
  ADD CONSTRAINT chk_milestones_status_allowed
  CHECK (status IN ('Planned', 'In Progress', 'Blocked', 'Completed'));

ALTER TABLE milestones
  ADD CONSTRAINT chk_milestones_blocked_reason_semantics
  CHECK (
    (status = 'Blocked' AND blocked_reason IS NOT NULL AND CHAR_LENGTH(TRIM(blocked_reason)) > 0)
    OR
    (status <> 'Blocked' AND (blocked_reason IS NULL OR CHAR_LENGTH(TRIM(blocked_reason)) = 0))
  );
