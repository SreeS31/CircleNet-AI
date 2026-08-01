package com.circlenet.domain.user;

import java.util.Optional;
import java.util.List;

import com.circlenet.domain.user.model.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
	Optional<UserEntity> findByEmail(String email);

	Optional<UserEntity> findByUsername(String username);

	boolean existsByEmail(String email);

	boolean existsByUsername(String username);

	Optional<UserEntity> findByPhoneNumber(String phoneNumber);

	boolean existsByPhoneNumber(String phoneNumber);

	@Query("""
		select u from UserEntity u where u.id <> :currentUserId and (
		  lower(u.username) like lower(concat('%', :query, '%')) or
		  lower(coalesce(u.firstName, '')) like lower(concat('%', :query, '%')) or
		  lower(coalesce(u.surname, '')) like lower(concat('%', :query, '%')) or
		  lower(coalesce(u.location, '')) like lower(concat('%', :query, '%')) or
		  u.phoneNumber like concat('%', :query, '%'))
		order by u.firstName, u.surname, u.username
		""")
	List<UserEntity> searchPeople(@Param("currentUserId") Long currentUserId, @Param("query") String query);
}
