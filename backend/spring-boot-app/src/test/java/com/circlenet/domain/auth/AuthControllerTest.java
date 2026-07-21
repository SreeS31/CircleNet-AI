package com.circlenet.domain.auth;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Test
  void shouldLoginWithValidCredentials() throws Exception {
    createUser("auth-login-user", "auth-login@circlenet.ai", "secret123");

    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(new LoginPayload("auth-login@circlenet.ai", "secret123"))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.tokenType").value("Bearer"))
      .andExpect(jsonPath("$.accessToken", not(nullValue())))
      .andExpect(jsonPath("$.refreshToken", not(nullValue())))
      .andExpect(jsonPath("$.expiresIn").value(900));
  }

  @Test
  void shouldRefreshTokens() throws Exception {
    createUser("auth-refresh-user", "auth-refresh@circlenet.ai", "secret123");

    MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(new LoginPayload("auth-refresh@circlenet.ai", "secret123"))))
      .andExpect(status().isOk())
      .andReturn();

    TokenPayload loginPayload = objectMapper.readValue(loginResult.getResponse().getContentAsString(), TokenPayload.class);

    mockMvc.perform(post("/api/auth/refresh")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(new RefreshPayload(loginPayload.refreshToken))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.tokenType").value("Bearer"))
      .andExpect(jsonPath("$.accessToken", not(nullValue())))
      .andExpect(jsonPath("$.refreshToken", not(nullValue())));
  }

  @Test
  void shouldRejectLoginWithInvalidCredentials() throws Exception {
    createUser("auth-bad-user", "auth-bad@circlenet.ai", "secret123");

    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(new LoginPayload("auth-bad@circlenet.ai", "wrong-pass"))))
      .andExpect(status().isUnauthorized());
  }

  private void createUser(String username, String email, String password) throws Exception {
    mockMvc.perform(post("/api/users")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(new CreateUserPayload(username, email, password))))
      .andExpect(status().isOk());
  }

  private record CreateUserPayload(String username, String email, String password) {
  }

  private record LoginPayload(String email, String password) {
  }

  private record RefreshPayload(String refreshToken) {
  }

  private static class TokenPayload {
    public String tokenType;
    public String accessToken;
    public String refreshToken;
    public long expiresIn;
  }
}
