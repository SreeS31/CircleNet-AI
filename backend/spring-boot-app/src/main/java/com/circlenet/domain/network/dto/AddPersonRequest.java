package com.circlenet.domain.network.dto;

public record AddPersonRequest(String fullName, String phoneNumber, String email, String type,
    String visibilityScope, String visibilityCompany, String identityType, String managedCategory,
    String dateOfBirth, String dateOfDeath, String notes) {}
