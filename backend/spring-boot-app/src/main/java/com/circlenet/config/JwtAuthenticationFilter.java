package com.circlenet.config;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.circlenet.domain.auth.JwtTokenService;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtTokenService jwtTokenService;

  public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
    this.jwtTokenService = jwtTokenService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {

    String path = request.getRequestURI();
    boolean isDashboardPath = path.startsWith("/api/dashboard/");
    boolean isAuthMePath = "/api/auth/me".equals(path);
    if (!isDashboardPath && !isAuthMePath) {
      filterChain.doFilter(request, response);
      return;
    }

    String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      return;
    }

    String token = authorizationHeader.substring("Bearer ".length()).trim();
    try {
      Claims claims = jwtTokenService.parseAndValidate(token, "access");
      UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
          claims.getSubject(),
          null,
          AuthorityUtils.NO_AUTHORITIES);
      SecurityContextHolder.getContext().setAuthentication(authentication);
      filterChain.doFilter(request, response);
    } catch (IllegalArgumentException ex) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
