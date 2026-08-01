package com.circlenet.domain.network.dto;

public record UpdateRelationshipRequest(String contactName, String contactPhone, String contactEmail, String type,
    String visibilityScope, String visibilityCompany) {}
