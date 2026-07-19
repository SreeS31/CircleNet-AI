package com.circlenet.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.circlenet.domain.circle.CircleRepository;
import com.circlenet.domain.circle.model.CircleEntity;
import com.circlenet.domain.permission.PermissionRepository;
import com.circlenet.domain.permission.model.PermissionEntity;
import com.circlenet.domain.person.PersonRepository;
import com.circlenet.domain.person.model.PersonEntity;
import com.circlenet.domain.relationship.RelationshipRepository;
import com.circlenet.domain.relationship.model.RelationshipEntity;
import com.circlenet.domain.user.UserRepository;
import com.circlenet.domain.user.model.UserEntity;

@Component
public class DataSeeder implements CommandLineRunner {
  private final UserRepository userRepository;
  private final PersonRepository personRepository;
  private final CircleRepository circleRepository;
  private final RelationshipRepository relationshipRepository;
  private final PermissionRepository permissionRepository;

  public DataSeeder(
      UserRepository userRepository,
      PersonRepository personRepository,
      CircleRepository circleRepository,
      RelationshipRepository relationshipRepository,
      PermissionRepository permissionRepository) {
    this.userRepository = userRepository;
    this.personRepository = personRepository;
    this.circleRepository = circleRepository;
    this.relationshipRepository = relationshipRepository;
    this.permissionRepository = permissionRepository;
  }

  @Override
  public void run(String... args) {
    if (userRepository.count() == 0) {
      UserEntity user = new UserEntity();
      user.setUsername("admin");
      user.setEmail("admin@circlenet.ai");
      user.setPasswordHash("demo-password");
      userRepository.save(user);
    }

    if (personRepository.count() == 0) {
      PersonEntity person = new PersonEntity();
      person.setFullName("Ava Patel");
      person.setEmail("ava@circlenet.ai");
      personRepository.save(person);
    }

    if (circleRepository.count() == 0) {
      CircleEntity circle = new CircleEntity();
      circle.setName("Engineering");
      circle.setDescription("Core platform collaboration circle");
      circleRepository.save(circle);
    }

    if (relationshipRepository.count() == 0) {
      RelationshipEntity relationship = new RelationshipEntity();
      relationship.setType("friend");
      relationshipRepository.save(relationship);
    }

    if (permissionRepository.count() == 0) {
      PermissionEntity permission = new PermissionEntity();
      permission.setName("admin");
      permission.setDescription("Full platform access");
      permissionRepository.save(permission);
    }
  }
}
