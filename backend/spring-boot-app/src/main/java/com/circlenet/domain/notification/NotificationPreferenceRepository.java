package com.circlenet.domain.notification;

import com.circlenet.domain.notification.model.NotificationPreferenceEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreferenceEntity, Long> {
  Optional<NotificationPreferenceEntity> findByUnsubscribeToken(String token);
}
