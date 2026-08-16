CREATE TABLE social_post_saves (
  post_id BIGINT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_social_post_saves_user ON social_post_saves(user_id, created_at DESC);
