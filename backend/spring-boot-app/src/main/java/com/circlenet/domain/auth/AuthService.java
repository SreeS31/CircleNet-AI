package com.circlenet.domain.auth;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.circlenet.domain.auth.dto.AuthLoginRequest;
import com.circlenet.domain.auth.dto.AuthRefreshRequest;
import com.circlenet.domain.auth.dto.AuthTokenResponse;
import com.circlenet.domain.auth.model.AuthTokenEntity;
import com.circlenet.domain.user.UserRepository;
import com.circlenet.domain.user.model.UserEntity;

import io.jsonwebtoken.Claims;

@Service
@Transactional
public class AuthService {
  private final AuthTokenRepository authTokenRepository;
  private final UserRepository userRepository;
  private final JwtTokenService jwtTokenService;

  public AuthService(
      AuthTokenRepository authTokenRepository,
      UserRepository userRepository,
      JwtTokenService jwtTokenService) {
    this.authTokenRepository = authTokenRepository;
    this.userRepository = userRepository;
    this.jwtTokenService = jwtTokenService;
  }

  public List<AuthTokenEntity> listTokens() {
    return authTokenRepository.findAll();
  }

  public AuthTokenEntity createToken(AuthTokenEntity token) {
    return authTokenRepository.save(token);
  }

  public void deleteToken(Long id) {
    authTokenRepository.deleteById(id);
  }

  public AuthTokenResponse login(AuthLoginRequest request) {
    UserEntity user = userRepository.findByEmail(request.getEmail())
      .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

    if (!user.getPasswordHash().equals(request.getPassword())) {
      throw new IllegalArgumentException("Invalid email or password");
    }

    return issueNewSession(user, null);
  }

  public AuthTokenResponse refresh(AuthRefreshRequest request) {
    Claims claims = jwtTokenService.parseAndValidate(request.getRefreshToken(), "refresh");
    Long userId = Long.parseLong(claims.getSubject());

    AuthTokenEntity storedToken = authTokenRepository.findByToken(request.getRefreshToken())
      .orElseThrow(() -> new IllegalArgumentException("Refresh token not recognized"));

    if (storedToken.getExpiresAt().isBefore(Instant.now())) {
      authTokenRepository.deleteByToken(request.getRefreshToken());
      throw new IllegalArgumentException("Refresh token expired");
    }

    if (!"refresh".equals(storedToken.getTokenType()) || !userId.equals(storedToken.getUserId())) {
      throw new IllegalArgumentException("Invalid refresh token context");
    }

    UserEntity user = userRepository.findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    return issueNewSession(user, storedToken.getToken());
  }

  public void logout(AuthRefreshRequest request) {
    revoke(request);
  }

  public void revoke(AuthRefreshRequest request) {
    Claims claims = jwtTokenService.parseAndValidate(request.getRefreshToken(), "refresh");
    Long userId = Long.parseLong(claims.getSubject());

    AuthTokenEntity storedToken = authTokenRepository.findByToken(request.getRefreshToken())
      .orElseThrow(() -> new IllegalArgumentException("Refresh token not recognized"));

    if (!"refresh".equals(storedToken.getTokenType()) || !userId.equals(storedToken.getUserId())) {
      throw new IllegalArgumentException("Invalid refresh token context");
    }

    authTokenRepository.deleteByToken(request.getRefreshToken());
  }

  private AuthTokenResponse issueNewSession(UserEntity user, String oldRefreshToken) {
    String accessToken = jwtTokenService.createAccessToken(user);
    String refreshToken = jwtTokenService.createRefreshToken(user);

    if (oldRefreshToken != null) {
      authTokenRepository.deleteByToken(oldRefreshToken);
    }
    authTokenRepository.deleteByUserIdAndTokenType(user.getId(), "refresh");

    AuthTokenEntity refreshTokenEntity = new AuthTokenEntity();
    refreshTokenEntity.setUserId(user.getId());
    refreshTokenEntity.setTokenType("refresh");
    refreshTokenEntity.setToken(refreshToken);
    refreshTokenEntity.setExpiresAt(jwtTokenService.getRefreshTokenExpiryInstant());
    authTokenRepository.save(refreshTokenEntity);

    AuthTokenResponse response = new AuthTokenResponse();
    response.setTokenType("Bearer");
    response.setAccessToken(accessToken);
    response.setRefreshToken(refreshToken);
    response.setExpiresIn(jwtTokenService.getAccessTokenExpirySeconds());
    return response;
  }
}
