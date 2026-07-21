package com.circlenet.domain.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.circlenet.domain.auth.dto.AuthLoginRequest;
import com.circlenet.domain.auth.dto.AuthRefreshRequest;
import com.circlenet.domain.auth.dto.AuthTokenResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @GetMapping("/health")
  public String health() {
    return "auth-service-ready";
  }

  @PostMapping("/login")
  public ResponseEntity<AuthTokenResponse> login(@Valid @RequestBody AuthLoginRequest request) {
    try {
      return ResponseEntity.ok(authService.login(request));
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
  }

  @PostMapping("/refresh")
  public ResponseEntity<AuthTokenResponse> refresh(@Valid @RequestBody AuthRefreshRequest request) {
    try {
      return ResponseEntity.ok(authService.refresh(request));
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@Valid @RequestBody AuthRefreshRequest request) {
    try {
      authService.logout(request);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
  }

  @PostMapping("/revoke")
  public ResponseEntity<Void> revoke(@Valid @RequestBody AuthRefreshRequest request) {
    try {
      authService.revoke(request);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
  }
}
