package com.circlenet.domain.network;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class NetworkControllerTest {
  @Autowired MockMvc mockMvc;
  @Autowired ObjectMapper objectMapper;

  @Test
  void shouldSearchConnectAndAddExistingUserToCircle() throws Exception {
    JsonNode owner = createUser("network-owner", "+15550110001", "Asha", "Rao", "Bengaluru");
    JsonNode friend = createUser("network-friend", "+15550110002", "Meera", "Shah", "Mumbai");
    String token = login(owner.get("phoneNumber").asText());

    mockMvc.perform(get("/api/network/search").param("q", "Mumbai").header(auth(), "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0]").doesNotExist());

    mockMvc.perform(post("/api/network/relationships/add-person").header(auth(), "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"fullName\":\"Meera Shah\",\"phoneNumber\":\"+15550110002\",\"type\":\"Friend\",\"visibilityScope\":\"PUBLIC\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("Friend"))
        .andExpect(jsonPath("$.visibilityScope").value("PUBLIC"))
        .andExpect(jsonPath("$.person.phoneNumber").doesNotExist());

    mockMvc.perform(get("/api/network/search").param("q", "Mumbai").header(auth(), "Bearer " + token))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(friend.get("id").asLong()));

    MvcResult circleResult = mockMvc.perform(post("/api/network/circles").header(auth(), "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Close friends\",\"description\":\"Trusted people\"}"))
        .andExpect(status().isOk()).andReturn();
    long circleId = objectMapper.readTree(circleResult.getResponse().getContentAsString()).get("id").asLong();

    mockMvc.perform(post("/api/network/circles/" + circleId + "/members").header(auth(), "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":" + friend.get("id").asLong() + "}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.members[?(@.person.id == " + friend.get("id").asLong() + ")]").exists());

    mockMvc.perform(post("/api/network/circles/" + circleId + "/admins/" + friend.get("id").asLong())
        .header(auth(), "Bearer " + token)).andExpect(status().isOk())
        .andExpect(jsonPath("$.members[?(@.person.id == " + friend.get("id").asLong() + " && @.admin == true)]").exists());

    String friendToken = login(friend.get("phoneNumber").asText());
    mockMvc.perform(put("/api/network/circles/" + circleId).header(auth(), "Bearer " + friendToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Close friends updated\",\"description\":\"Updated by a circle admin\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Close friends updated"))
        .andExpect(jsonPath("$.description").value("Updated by a circle admin"));

    mockMvc.perform(get("/api/network/circles").header(auth(), "Bearer " + friendToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(circleId))
        .andExpect(jsonPath("$[0].name").value("Close friends updated"))
        .andExpect(jsonPath("$[0].ownerName").value("Asha Rao"))
        .andExpect(jsonPath("$[0].ownedByCurrentUser").value(false));
  }

  @Test
  void shouldRejectDuplicateMobileWithRelationshipGuidance() throws Exception {
    createUser("unique-mobile-one", "+15550110003", "Ravi", "Kumar", "Delhi");
    mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
        .content(userJson("unique-mobile-two", "+15550110003", "Other", "Person", "Delhi")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("This mobile number already belongs to an existing user. Search for them and add only the relationship."));
  }

  @Test
  void shouldPersistAndSearchInvitedRelationship() throws Exception {
    JsonNode owner = createUser("invite-owner", "+15550110004", "Invite", "Owner", "Hyderabad");
    String token = login(owner.get("phoneNumber").asText());

    MvcResult relationshipResult = mockMvc.perform(post("/api/network/relationships/add-person").header(auth(), "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"fullName\":\"Rambabu Test\",\"phoneNumber\":\"+15550110005\",\"email\":\"rambabu@test.example\",\"type\":\"Friend\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.person.displayName").value("Rambabu Test"))
        .andExpect(jsonPath("$.person.username").doesNotExist())
        .andExpect(jsonPath("$.person.accountStatus").value("INVITED")).andReturn();
    long relationshipId = objectMapper.readTree(relationshipResult.getResponse().getContentAsString()).get("id").asLong();

    mockMvc.perform(put("/api/network/relationships/" + relationshipId).header(auth(), "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"contactName\":\"Rambabu Updated\",\"contactPhone\":\"+15550110006\",\"contactEmail\":\"private-contact@test.example\",\"type\":\"Relative\",\"visibilityScope\":\"RELATIVES\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.person.displayName").value("Rambabu Updated"))
        .andExpect(jsonPath("$.contactPhone").value("+15550110006"))
        .andExpect(jsonPath("$.contactEmail").value("private-contact@test.example"))
        .andExpect(jsonPath("$.type").value("Relative"))
        .andExpect(jsonPath("$.visibilityScope").value("RELATIVES"));

    mockMvc.perform(get("/api/network/search").param("q", "Updated").header(auth(), "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].displayName").value("Rambabu Updated"));

    mockMvc.perform(get("/api/network/relationships").header(auth(), "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].person.phoneNumber").doesNotExist())
        .andExpect(jsonPath("$[0].contactPhone").value("+15550110006"))
        .andExpect(jsonPath("$[0].contactEmail").value("private-contact@test.example"))
        .andExpect(jsonPath("$[0].visibilityScope").value("RELATIVES"));
  }

  private JsonNode createUser(String username, String phone, String firstName, String surname, String location) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
        .content(userJson(username, phone, firstName, surname, location)))
        .andExpect(status().isOk()).andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString());
  }

  private String login(String phone) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"identifier\":\"" + phone + "\",\"password\":\"secret123\"}"))
        .andExpect(status().isOk()).andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  private String userJson(String username, String phone, String firstName, String surname, String location) throws Exception {
    return objectMapper.writeValueAsString(new UserPayload(username, phone, "secret123", firstName, surname, location));
  }
  private String auth() { return HttpHeaders.AUTHORIZATION; }
  private record UserPayload(String username, String phoneNumber, String password, String firstName, String surname, String location) {}
}
