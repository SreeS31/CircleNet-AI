ALTER TABLE users
  ADD COLUMN phone_number VARCHAR(32);

UPDATE users
  SET phone_number = CONCAT('legacy-', id)
  WHERE phone_number IS NULL;

ALTER TABLE users
  ALTER COLUMN phone_number SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT uq_users_phone_number UNIQUE (phone_number);

ALTER TABLE users
  DROP CONSTRAINT uq_users_email;

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;
