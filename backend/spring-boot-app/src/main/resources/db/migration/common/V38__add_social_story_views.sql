CREATE TABLE social_story_views (
  story_id BIGINT NOT NULL REFERENCES social_stories(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (story_id, user_id)
);
CREATE INDEX idx_social_story_views_user ON social_story_views(user_id, viewed_at DESC);
