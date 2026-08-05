package com.circlenet.domain.network.dto;
public record StartDirectCallRequest(Long recipientId,String callType,String offerSdp) {}
