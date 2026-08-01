package com.circlenet.domain.network.dto;

public record UpdateRelationshipRequest(String contactName, String type,
    String visibilityScope, String visibilityCompany) {}
