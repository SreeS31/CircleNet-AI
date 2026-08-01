UPDATE relationships
SET contact_phone = (SELECT users.phone_number FROM users WHERE users.id = relationships.related_user_id)
WHERE owner_user_id IS NOT NULL AND contact_phone IS NULL;

UPDATE relationships
SET contact_email = (SELECT users.email FROM users WHERE users.id = relationships.related_user_id)
WHERE owner_user_id IS NOT NULL AND contact_email IS NULL;
