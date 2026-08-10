package com.circlenet.domain.message;

import com.circlenet.domain.message.model.RelationshipBroadcastEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelationshipBroadcastRepository extends JpaRepository<RelationshipBroadcastEntity, Long> {
  List<RelationshipBroadcastEntity> findTop50BySenderUserIdOrderByCreatedAtDesc(Long senderUserId);
}
