package com.circlenet.domain.circle;

import com.circlenet.domain.circle.model.CircleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CircleRepository extends JpaRepository<CircleEntity, Long> {
  List<CircleEntity> findByOwnerUserId(Long ownerUserId);
}
