package com.circlenet.domain.user;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.circlenet.domain.user.dto.CreateUserRequest;
import com.circlenet.domain.user.dto.UserDto;
import com.circlenet.domain.user.model.UserEntity;

@Service
public class UserService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public List<UserDto> listUsers() {
    return userRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
  }

  public UserDto getUser(Long id) {
    return userRepository.findById(id).map(this::toDto).orElseThrow(() -> new IllegalArgumentException("User not found"));
  }

  public UserDto createUser(CreateUserRequest request) {
    String username = requireValue(request.getUsername(), "Username");
    String email = optionalEmail(request.getEmail());
    String phoneNumber = normalizePhoneNumber(request.getPhoneNumber());
    String password = requireValue(request.getPassword(), "Password");

    if (userRepository.existsByUsername(username)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
    }
    if (email != null && userRepository.existsByEmail(email)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
    }
    if (userRepository.existsByPhoneNumber(phoneNumber)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already in use");
    }

    UserEntity entity = new UserEntity();
    entity.setUsername(username);
    entity.setEmail(email);
    entity.setPhoneNumber(phoneNumber);
    entity.setPasswordHash(passwordEncoder.encode(password));
    return toDto(userRepository.save(entity));
  }

  public UserDto updateUser(Long id, CreateUserRequest request) {
    UserEntity entity = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
    String username = requireValue(request.getUsername(), "Username");
    String email = optionalEmail(request.getEmail());
    String phoneNumber = normalizePhoneNumber(request.getPhoneNumber());

    if (!entity.getUsername().equals(username) && userRepository.existsByUsername(username)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
    }
    if (email != null && !email.equals(entity.getEmail()) && userRepository.existsByEmail(email)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
    }
    if (!entity.getPhoneNumber().equals(phoneNumber) && userRepository.existsByPhoneNumber(phoneNumber)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already in use");
    }

    entity.setUsername(username);
    entity.setEmail(email);
    entity.setPhoneNumber(phoneNumber);
    if (request.getPassword() != null && !request.getPassword().isBlank()) {
      entity.setPasswordHash(passwordEncoder.encode(request.getPassword()));
    }
    return toDto(userRepository.save(entity));
  }

  public void deleteUser(Long id) {
    userRepository.deleteById(id);
  }

  private UserDto toDto(UserEntity entity) {
    UserDto dto = new UserDto();
    dto.setId(entity.getId());
    dto.setUsername(entity.getUsername());
    dto.setEmail(entity.getEmail());
    dto.setPhoneNumber(entity.getPhoneNumber());
    dto.setRole(entity.getRole());
    return dto;
  }

  private String requireValue(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
    }
    return value.trim();
  }

  private String optionalEmail(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim().toLowerCase();
  }

  private String normalizePhoneNumber(String value) {
    String phoneNumber = requireValue(value, "Phone number").replaceAll("[\\s()-]", "");
    if (!phoneNumber.matches("\\+?[0-9]{7,15}")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number must contain 7 to 15 digits");
    }
    return phoneNumber;
  }
}
