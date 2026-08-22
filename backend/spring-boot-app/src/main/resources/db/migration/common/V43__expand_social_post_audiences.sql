ALTER TABLE social_posts DROP CONSTRAINT chk_social_post_audience;
ALTER TABLE social_posts ADD CONSTRAINT chk_social_post_audience
  CHECK (audience IN ('PRIVATE','PUBLIC','FRIENDS','RELATIVES','RELATIONSHIPS','CIRCLE'));
