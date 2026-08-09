package com.circlenet.domain.ai;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/contact-organizer")
public class ContactOrganizerController {
  private final RestClient ai;
  private final ContactOrganizerService organizer;

  public ContactOrganizerController(RestClient.Builder builder,
      @Value("${circlenet.ai.base-url:http://localhost:8081/api/v1}") String baseUrl,
      ContactOrganizerService organizer) {
    this.ai = builder.baseUrl(baseUrl).build();
    this.organizer = organizer;
  }

  @PostMapping("/analyze")
  public Object analyze(@RequestBody Map<String, Object> request) {
    if (!Boolean.TRUE.equals(request.get("consent"))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Allow contact analysis or skip this optional step");
    }
    try {
      return ai.post().uri("/contacts/organize").body(request).retrieve().body(Object.class);
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "AI contact suggestions are temporarily unavailable. No contacts were saved.");
    }
  }

  @PostMapping("/accept")
  public ContactOrganizerService.AcceptResult accept(Principal principal,
      @RequestBody AcceptContactSuggestionsRequest request) {
    return organizer.accept(Long.valueOf(principal.getName()), request.suggestions());
  }

  public record AcceptContactSuggestionsRequest(List<AcceptedContactSuggestion> suggestions) {}
  public record AcceptedContactSuggestion(String displayName, String phone, String email,
      String relationship, List<String> circles, boolean selected) {}
}
