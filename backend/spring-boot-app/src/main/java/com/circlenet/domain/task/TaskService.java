package com.circlenet.domain.task;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.circlenet.domain.task.dto.CreateTaskRequest;
import com.circlenet.domain.task.dto.TaskDto;
import com.circlenet.domain.task.model.TaskEntity;

@Service
public class TaskService {
  private final TaskRepository taskRepository;

  public TaskService(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
  }

  public List<TaskDto> listTasks(Long projectId, Long milestoneId) {
    if (milestoneId != null) {
      return taskRepository.findByMilestoneId(milestoneId).stream().map(this::toDto).collect(Collectors.toList());
    }

    if (projectId != null) {
      return taskRepository.findByProjectId(projectId).stream().map(this::toDto).collect(Collectors.toList());
    }

    return listTasks();
  }

  public List<TaskDto> listTasks() {
    return taskRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
  }

  public TaskDto createTask(CreateTaskRequest request) {
    TaskEntity entity = new TaskEntity();
    entity.setTitle(request.getTitle());
    entity.setDetails(request.getDetails());
    entity.setStatus(request.getStatus());
    entity.setProjectId(request.getProjectId());
    entity.setMilestoneId(request.getMilestoneId());
    return toDto(taskRepository.save(entity));
  }

  private TaskDto toDto(TaskEntity entity) {
    TaskDto dto = new TaskDto();
    dto.setId(entity.getId());
    dto.setTitle(entity.getTitle());
    dto.setDetails(entity.getDetails());
    dto.setStatus(entity.getStatus());
    dto.setProjectId(entity.getProjectId());
    dto.setMilestoneId(entity.getMilestoneId());
    return dto;
  }
}
