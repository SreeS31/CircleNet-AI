package com.circlenet.domain.network.dto;

import java.time.Instant;

public record CirclePostDto(Long id,Long circleId,Long parentPostId,Long authorId,String authorName,String authorPhoto,
    String message,String attachmentUrl,String attachmentName,String attachmentType,Long attachmentSize,Instant createdAt,boolean currentUserAuthor) {}
