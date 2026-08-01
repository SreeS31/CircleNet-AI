CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY,
  date_of_birth VARCHAR(20), gender VARCHAR(40), bio TEXT,
  address_line1 VARCHAR(255), address_line2 VARCHAR(255), city VARCHAR(120), state VARCHAR(120), postal_code VARCHAR(30), country VARCHAR(120),
  alternate_phone VARCHAR(40), website VARCHAR(255), whatsapp VARCHAR(120), linkedin VARCHAR(255), facebook VARCHAR(255), instagram VARCHAR(255), x_handle VARCHAR(120),
  highest_qualification VARCHAR(180), institution VARCHAR(255), field_of_study VARCHAR(180), graduation_year VARCHAR(10),
  employment_status VARCHAR(80), employer VARCHAR(255), job_title VARCHAR(180), industry VARCHAR(180), work_location VARCHAR(180),
  profile_photo TEXT,
  CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_profile_photos (
  user_id BIGINT NOT NULL,
  photo_order INTEGER NOT NULL,
  photo_data TEXT NOT NULL,
  PRIMARY KEY (user_id, photo_order),
  CONSTRAINT fk_user_profile_photo_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);
