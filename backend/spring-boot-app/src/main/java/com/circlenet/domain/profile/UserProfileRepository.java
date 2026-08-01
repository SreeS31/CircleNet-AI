package com.circlenet.domain.profile;
import com.circlenet.domain.profile.model.UserProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserProfileRepository extends JpaRepository<UserProfileEntity, Long> {}
