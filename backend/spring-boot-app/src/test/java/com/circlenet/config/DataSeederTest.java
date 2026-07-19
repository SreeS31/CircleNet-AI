package com.circlenet.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.circlenet.domain.circle.CircleRepository;
import com.circlenet.domain.permission.PermissionRepository;
import com.circlenet.domain.person.PersonRepository;
import com.circlenet.domain.relationship.RelationshipRepository;
import com.circlenet.domain.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {
  @Mock
  private UserRepository userRepository;

  @Mock
  private PersonRepository personRepository;

  @Mock
  private CircleRepository circleRepository;

  @Mock
  private RelationshipRepository relationshipRepository;

  @Mock
  private PermissionRepository permissionRepository;

  @InjectMocks
  private DataSeeder dataSeeder;

  @Test
  void shouldSeedRepositoriesWhenEmpty() {
    when(userRepository.count()).thenReturn(0L);
    when(personRepository.count()).thenReturn(0L);
    when(circleRepository.count()).thenReturn(0L);
    when(relationshipRepository.count()).thenReturn(0L);
    when(permissionRepository.count()).thenReturn(0L);

    dataSeeder.run();

    verify(userRepository).save(any());
    verify(personRepository).save(any());
    verify(circleRepository).save(any());
    verify(relationshipRepository).save(any());
    verify(permissionRepository).save(any());
  }
}
