package com.circlenet.domain.relationship;

import com.circlenet.domain.relationship.model.RelationshipEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RelationshipRepository extends JpaRepository<RelationshipEntity, Long> {
}
