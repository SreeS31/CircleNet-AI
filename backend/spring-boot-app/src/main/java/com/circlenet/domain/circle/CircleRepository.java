package com.circlenet.domain.circle;

import com.circlenet.domain.circle.model.CircleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CircleRepository extends JpaRepository<CircleEntity, Long> {
}
