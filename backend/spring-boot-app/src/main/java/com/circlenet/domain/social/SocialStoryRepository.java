package com.circlenet.domain.social;
import com.circlenet.domain.social.model.SocialStoryEntity; import java.time.Instant; import java.util.List; import org.springframework.data.jpa.repository.JpaRepository;
public interface SocialStoryRepository extends JpaRepository<SocialStoryEntity,Long>{
 List<SocialStoryEntity> findByExpiresAtAfterOrderByCreatedAtDesc(Instant now);
 List<SocialStoryEntity> findTop100ByExpiresAtBeforeOrderByExpiresAt(Instant now);
}
