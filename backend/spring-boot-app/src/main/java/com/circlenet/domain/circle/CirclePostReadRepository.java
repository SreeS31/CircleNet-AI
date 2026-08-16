package com.circlenet.domain.circle;
import com.circlenet.domain.circle.model.CirclePostReadEntity;import org.springframework.data.jpa.repository.JpaRepository;
public interface CirclePostReadRepository extends JpaRepository<CirclePostReadEntity,Long>{boolean existsByPostIdAndUserId(Long postId,Long userId);long countByPostId(Long postId);}
