package com.circlenet.domain.task;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.circlenet.domain.task.model.TaskEntity;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long> {
	List<TaskEntity> findByProjectId(Long projectId);

	List<TaskEntity> findByMilestoneId(Long milestoneId);
}
