package com.circlenet.domain.network.dto;

public record NetworkPersonDto(Long id, String firstName, String surname,
    String displayName, String phoneNumber, String location, String accountStatus, String profilePhoto) {}
