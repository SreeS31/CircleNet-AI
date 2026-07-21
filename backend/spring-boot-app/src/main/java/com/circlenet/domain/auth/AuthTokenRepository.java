package com.circlenet.domain.auth;

import java.util.Optional;

import com.circlenet.domain.auth.model.AuthTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthTokenEntity, Long> {
	Optional<AuthTokenEntity> findByToken(String token);

	void deleteByToken(String token);

	void deleteByUserIdAndTokenType(Long userId, String tokenType);
}
