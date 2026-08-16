DELETE FROM relationships
WHERE owner_user_id IS NULL AND related_user_id IS NULL;

UPDATE relationships r
SET type = CASE
  WHEN lower(p.gender) IN ('female', 'woman') THEN 'Wife'
  WHEN lower(p.gender) IN ('male', 'man') THEN 'Husband'
  ELSE r.type
END
FROM user_profiles p
WHERE r.related_user_id = p.user_id
  AND lower(r.type) = 'spouse';
