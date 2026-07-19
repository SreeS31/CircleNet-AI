package com.circlenet.domain.user;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.circlenet.domain.user.dto.CreateUserRequest;
import com.circlenet.domain.user.dto.UserDto;
import com.circlenet.domain.user.model.UserEntity;

@Service
public class UserService {
  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public List<UserDto> listUsers() {
    return userRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
  }

  public UserDto getUser(Long id) {
    return userRepository.findById(id).map(this::toDto).orElseThrow(() -> new IllegalArgumentException("User not found"));
  }

  public UserDto createUser(CreateUserRequest request) {
    UserEntity entity = new UserEntity();
    entity.setUsername(request.getUsername());
    entity.setEmail(request.getEmail());
    entity.setPasswordHash(request.getPassword());
    return toDto(userRepository.save(entity));
  }

  public UserDto updateUser(Long id, CreateUserRequest request) {
    UserEntity entity = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
    entity.setUsername(request.getUsername());
    entity.setEmail(request.getEmail());
    entity.setPasswordHash(request.getPassword());
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
    dto.setPasswordHash(entity.getPasswordHash());
    return dto;
  }
}
