package com.circlenet.domain.network.dto;

public record NetworkRelationshipDto(Long id, String type, String visibilityScope,
    String visibilityCompany, NetworkPersonDto person) {}
