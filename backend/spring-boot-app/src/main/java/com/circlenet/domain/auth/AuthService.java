package com.circlenet.domain.auth;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.circlenet.domain.auth.model.AuthTokenEntity;

@Service
public class AuthService {
  private final AuthTokenRepository authTokenRepository;

  public AuthService(AuthTokenRepository authTokenRepository) {
    this.authTokenRepository = authTokenRepository;
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
}
