package com.circlenet.domain.network.dto;

import java.time.Instant;

public record DirectMessageDto(Long id,Long senderId,Long recipientId,String senderName,String senderPhoto,
    String message,String attachmentUrl,String attachmentName,String attachmentType,Long attachmentSize,
    Instant createdAt,boolean currentUserAuthor) {}
