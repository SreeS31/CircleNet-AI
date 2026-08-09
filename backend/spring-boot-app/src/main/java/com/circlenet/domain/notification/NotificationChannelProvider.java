package com.circlenet.domain.notification;

import com.circlenet.domain.notification.model.NotificationDeliveryEntity;
import com.circlenet.domain.notification.model.NotificationEntity;

public interface NotificationChannelProvider {
  String channel();
  boolean configured();
  String send(NotificationEntity notification, NotificationDeliveryEntity delivery);
}
