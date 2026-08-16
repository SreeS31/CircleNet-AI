package com.circlenet.domain.social;
import com.circlenet.domain.social.model.SocialPostEntity; import java.util.List; import org.springframework.data.jpa.repository.JpaRepository;
public interface SocialPostRepository extends JpaRepository<SocialPostEntity,Long>{List<SocialPostEntity> findTop100ByOrderByCreatedAtDesc();}
