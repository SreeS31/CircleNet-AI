package com.circlenet.domain.network.dto;

public record NetworkRelationshipDto(Long id, String type, String visibilityScope, String contactPhone, String contactEmail,
    String visibilityCompany, Long relativeToUserId, NetworkPersonDto person) {}
