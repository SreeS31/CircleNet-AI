package com.circlenet.domain.network.dto;

public record AddRelationshipRequest(Long relatedUserId, String type, String visibilityScope, String visibilityCompany) {}
