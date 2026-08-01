package com.circlenet.domain.network.dto;

public record NetworkCircleMemberDto(NetworkPersonDto person, boolean admin, boolean creator) {}
