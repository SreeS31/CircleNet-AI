package com.circlenet.domain.taskgroup;
import org.springframework.data.jpa.repository.JpaRepository;
import com.circlenet.domain.taskgroup.model.TaskGroupEntity;
public interface TaskGroupRepository extends JpaRepository<TaskGroupEntity, Long> { }
