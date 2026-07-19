package com.circlenet.domain.task;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.circlenet.domain.milestone.dto.CreateMilestoneRequest;
import com.circlenet.domain.task.dto.CreateTaskRequest;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Test
  void shouldCreateListAndFilterTasksByMilestone() throws Exception {
    CreateMilestoneRequest milestoneRequest = new CreateMilestoneRequest();
    milestoneRequest.setName("Task Filter Milestone");
    milestoneRequest.setDescription("Used to validate task filtering by milestone");
    milestoneRequest.setStatus("In Progress");

    MvcResult milestoneResult = mockMvc.perform(post("/api/milestones")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(milestoneRequest)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id", notNullValue()))
      .andReturn();

    Long milestoneId = objectMapper.readTree(milestoneResult.getResponse().getContentAsString()).get("id").asLong();

    CreateTaskRequest request = new CreateTaskRequest();
    request.setTitle("Prepare launch checklist");
    request.setDetails("Align product, backend, and design rollout tasks");
    request.setStatus("Todo");
    request.setMilestoneId(milestoneId);

    mockMvc.perform(post("/api/tasks")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.title").value("Prepare launch checklist"))
      .andExpect(jsonPath("$.status").value("Todo"))
      .andExpect(jsonPath("$.milestoneId").value(milestoneId));

    mockMvc.perform(get("/api/tasks"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(1)));

    mockMvc.perform(get("/api/tasks").param("milestoneId", milestoneId.toString()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(1)));
  }
}
