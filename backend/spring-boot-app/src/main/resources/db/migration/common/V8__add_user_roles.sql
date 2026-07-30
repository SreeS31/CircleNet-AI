ALTER TABLE users
  ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'USER';

UPDATE users
  SET role = 'ADMIN'
  WHERE username = 'admin';
