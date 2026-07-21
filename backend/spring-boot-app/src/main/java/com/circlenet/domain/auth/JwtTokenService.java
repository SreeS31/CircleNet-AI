package com.circlenet.domain.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.circlenet.domain.user.model.UserEntity;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;

@Service
public class JwtTokenService {
  private final String jwtSecret;
  private final long accessTokenMinutes;
  private final long refreshTokenDays;

  public JwtTokenService(
      @Value("${security.jwt.secret:circlenet-dev-secret-key-change-me-32bytes}") String jwtSecret,
      @Value("${security.jwt.access-token-minutes:15}") long accessTokenMinutes,
      @Value("${security.jwt.refresh-token-days:7}") long refreshTokenDays) {
    this.jwtSecret = jwtSecret;
    this.accessTokenMinutes = accessTokenMinutes;
    this.refreshTokenDays = refreshTokenDays;
  }

  public String createAccessToken(UserEntity user) {
    return createToken(user, "access", Duration.ofMinutes(accessTokenMinutes));
  }

  public String createRefreshToken(UserEntity user) {
    return createToken(user, "refresh", Duration.ofDays(refreshTokenDays));
  }

  public Claims parseAndValidate(String token, String expectedType) {
    try {
      Claims claims = Jwts.parser()
        .verifyWith(signingKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();

      String tokenType = claims.get("type", String.class);
      if (!expectedType.equals(tokenType)) {
        throw new IllegalArgumentException("Invalid token type");
      }

      return claims;
    } catch (JwtException ex) {
      throw new IllegalArgumentException("Invalid token", ex);
    }
  }

  public long getAccessTokenExpirySeconds() {
    return Duration.ofMinutes(accessTokenMinutes).getSeconds();
  }

  public Instant getRefreshTokenExpiryInstant() {
    return Instant.now().plus(Duration.ofDays(refreshTokenDays));
  }

  private String createToken(UserEntity user, String tokenType, Duration duration) {
    Instant now = Instant.now();
    Instant expiresAt = now.plus(duration);

    return Jwts.builder()
      .subject(String.valueOf(user.getId()))
      .claim("username", user.getUsername())
      .claim("type", tokenType)
      .issuedAt(Date.from(now))
      .expiration(Date.from(expiresAt))
      .signWith(signingKey())
      .compact();
  }

  private SecretKey signingKey() {
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
  }
}
