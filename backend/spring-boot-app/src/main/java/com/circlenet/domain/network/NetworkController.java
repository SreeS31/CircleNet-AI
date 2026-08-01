package com.circlenet.domain.network;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.circlenet.domain.network.dto.AddRelationshipRequest;
import com.circlenet.domain.network.dto.AddPersonRequest;
import com.circlenet.domain.network.dto.CircleMemberRequest;
import com.circlenet.domain.network.dto.CreateNetworkCircleRequest;
import com.circlenet.domain.network.dto.NetworkCircleDto;
import com.circlenet.domain.network.dto.NetworkPersonDto;
import com.circlenet.domain.network.dto.NetworkRelationshipDto;
import com.circlenet.domain.network.dto.UpdateRelationshipRequest;

@RestController
@RequestMapping("/api/network")
public class NetworkController {
  private final NetworkService networkService;
  public NetworkController(NetworkService networkService) { this.networkService = networkService; }

  @GetMapping("/search")
  public List<NetworkPersonDto> search(Principal principal, @RequestParam(defaultValue = "") String q) {
    return networkService.search(userId(principal), q);
  }

  @GetMapping("/relationships")
  public List<NetworkRelationshipDto> relationships(Principal principal) {
    return networkService.relationships(userId(principal));
  }

  @GetMapping("/relationship-types")
  public List<String> relationshipTypes() { return networkService.relationshipTypes(); }

  @PostMapping("/relationships")
  public NetworkRelationshipDto addRelationship(Principal principal, @RequestBody AddRelationshipRequest request) {
    return networkService.addRelationship(userId(principal), request);
  }

  @PostMapping("/relationships/add-person")
  public NetworkRelationshipDto addPerson(Principal principal, @RequestBody AddPersonRequest request) {
    return networkService.addPerson(userId(principal), request);
  }

  @PutMapping("/relationships/{id}")
  public NetworkRelationshipDto updateRelationship(Principal principal, @PathVariable Long id,
      @RequestBody UpdateRelationshipRequest request) {
    return networkService.updateRelationship(userId(principal), id, request);
  }

  @DeleteMapping("/relationships/{id}")
  public ResponseEntity<Void> removeRelationship(Principal principal, @PathVariable Long id) {
    networkService.removeRelationship(userId(principal), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/circles")
  public List<NetworkCircleDto> circles(Principal principal) { return networkService.circles(userId(principal)); }

  @PostMapping("/circles")
  public NetworkCircleDto createCircle(Principal principal, @RequestBody CreateNetworkCircleRequest request) {
    return networkService.createCircle(userId(principal), request);
  }

  @PostMapping("/circles/{circleId}/members")
  public NetworkCircleDto addMember(Principal principal, @PathVariable Long circleId,
      @RequestBody CircleMemberRequest request) {
    return networkService.addCircleMember(userId(principal), circleId, request.userId());
  }

  @DeleteMapping("/circles/{circleId}/members/{userId}")
  public NetworkCircleDto removeMember(Principal principal, @PathVariable Long circleId, @PathVariable Long userId) {
    return networkService.removeCircleMember(userId(principal), circleId, userId);
  }

  @PostMapping("/circles/{circleId}/admins/{memberUserId}")
  public NetworkCircleDto promoteAdmin(Principal principal, @PathVariable Long circleId, @PathVariable Long memberUserId) {
    return networkService.promoteCircleAdmin(userId(principal), circleId, memberUserId);
  }

  @DeleteMapping("/circles/{circleId}/admins/{memberUserId}")
  public NetworkCircleDto demoteAdmin(Principal principal, @PathVariable Long circleId, @PathVariable Long memberUserId) {
    return networkService.demoteCircleAdmin(userId(principal), circleId, memberUserId);
  }

  private Long userId(Principal principal) { return Long.valueOf(principal.getName()); }
}
