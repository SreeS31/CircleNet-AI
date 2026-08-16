package com.circlenet.domain.social;
import com.circlenet.domain.social.model.SocialCommentEntity; import java.util.List; import org.springframework.data.jpa.repository.JpaRepository;
public interface SocialCommentRepository extends JpaRepository<SocialCommentEntity,Long>{List<SocialCommentEntity> findByPostIdOrderByCreatedAtAsc(Long postId); long countByPostId(Long postId);}
