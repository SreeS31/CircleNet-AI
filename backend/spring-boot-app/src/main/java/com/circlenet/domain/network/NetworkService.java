package com.circlenet.domain.network;

import java.util.List;
import java.util.Set;
import java.util.LinkedHashSet;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.circlenet.domain.circle.CircleRepository;
import com.circlenet.domain.circle.model.CircleEntity;
import com.circlenet.domain.network.dto.AddRelationshipRequest;
import com.circlenet.domain.network.dto.CreateNetworkCircleRequest;
import com.circlenet.domain.network.dto.NetworkCircleDto;
import com.circlenet.domain.network.dto.NetworkPersonDto;
import com.circlenet.domain.network.dto.NetworkRelationshipDto;
import com.circlenet.domain.relationship.RelationshipRepository;
import com.circlenet.domain.relationship.model.RelationshipEntity;
import com.circlenet.domain.user.UserRepository;
import com.circlenet.domain.user.model.UserEntity;

@Service
@Transactional
public class NetworkService {
  private static final Set<String> RELATIONSHIP_TYPES = Set.of(
      "Friend", "Spouse", "Parent", "Child", "Sibling", "Colleague", "Relative", "Other");

  private final UserRepository userRepository;
  private final RelationshipRepository relationshipRepository;
  private final CircleRepository circleRepository;

  public NetworkService(UserRepository userRepository, RelationshipRepository relationshipRepository,
      CircleRepository circleRepository) {
    this.userRepository = userRepository;
    this.relationshipRepository = relationshipRepository;
    this.circleRepository = circleRepository;
  }

  @Transactional(readOnly = true)
  public List<NetworkPersonDto> search(Long currentUserId, String query) {
    return userRepository.searchPeople(currentUserId, query == null ? "" : query.trim())
        .stream().limit(50).map(this::toPerson).toList();
  }

  @Transactional(readOnly = true)
  public List<NetworkRelationshipDto> relationships(Long currentUserId) {
    return relationshipRepository.findByOwnerUserId(currentUserId).stream()
        .map(entity -> new NetworkRelationshipDto(entity.getId(), entity.getType(),
            toPerson(requireUser(entity.getRelatedUserId()))))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<String> relationshipTypes() {
    LinkedHashSet<String> types = new LinkedHashSet<>(RELATIONSHIP_TYPES);
    relationshipRepository.findByOwnerUserIdIsNull().stream()
        .map(RelationshipEntity::getType)
        .filter(type -> type != null && !type.isBlank())
        .forEach(type -> {
          if (types.stream().noneMatch(existing -> existing.equalsIgnoreCase(type.trim()))) types.add(type.trim());
        });
    return types.stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
  }

  public NetworkRelationshipDto addRelationship(Long currentUserId, AddRelationshipRequest request) {
    if (request.relatedUserId() == null || currentUserId.equals(request.relatedUserId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose another user");
    }
    UserEntity related = requireUser(request.relatedUserId());
    String type = normalizeRelationshipType(request.type());
    RelationshipEntity relationship = relationshipRepository
        .findByOwnerUserIdAndRelatedUserId(currentUserId, related.getId())
        .orElseGet(RelationshipEntity::new);
    relationship.setOwnerUserId(currentUserId);
    relationship.setRelatedUserId(related.getId());
    relationship.setType(type);
    relationship = relationshipRepository.save(relationship);
    return new NetworkRelationshipDto(relationship.getId(), relationship.getType(), toPerson(related));
  }

  public void removeRelationship(Long currentUserId, Long relationshipId) {
    RelationshipEntity entity = relationshipRepository.findById(relationshipId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Relationship not found"));
    if (!currentUserId.equals(entity.getOwnerUserId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this relationship");
    }
    circleRepository.findByOwnerUserId(currentUserId).forEach(circle -> {
      if (circle.getMemberUserIds().remove(entity.getRelatedUserId())) circleRepository.save(circle);
    });
    relationshipRepository.delete(entity);
  }

  @Transactional(readOnly = true)
  public List<NetworkCircleDto> circles(Long currentUserId) {
    return circleRepository.findByOwnerUserId(currentUserId).stream().map(this::toCircle).toList();
  }

  public NetworkCircleDto createCircle(Long currentUserId, CreateNetworkCircleRequest request) {
    String name = requireText(request.name(), "Circle name");
    CircleEntity entity = new CircleEntity();
    entity.setName(name);
    entity.setDescription(request.description() == null ? "" : request.description().trim());
    entity.setOwnerUserId(currentUserId);
    return toCircle(circleRepository.save(entity));
  }

  public NetworkCircleDto addCircleMember(Long currentUserId, Long circleId, Long userId) {
    CircleEntity circle = ownedCircle(currentUserId, circleId);
    requireUser(userId);
    if (relationshipRepository.findByOwnerUserIdAndRelatedUserId(currentUserId, userId).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add this person as a relationship before adding them to a circle");
    }
    circle.getMemberUserIds().add(userId);
    return toCircle(circleRepository.save(circle));
  }

  public NetworkCircleDto removeCircleMember(Long currentUserId, Long circleId, Long userId) {
    CircleEntity circle = ownedCircle(currentUserId, circleId);
    circle.getMemberUserIds().remove(userId);
    return toCircle(circleRepository.save(circle));
  }

  private CircleEntity ownedCircle(Long ownerId, Long circleId) {
    CircleEntity circle = circleRepository.findById(circleId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Circle not found"));
    if (!ownerId.equals(circle.getOwnerUserId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this circle");
    }
    return circle;
  }

  private UserEntity requireUser(Long id) {
    return userRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  private NetworkCircleDto toCircle(CircleEntity circle) {
    List<NetworkPersonDto> members = circle.getMemberUserIds().stream()
        .map(this::requireUser).map(this::toPerson).toList();
    return new NetworkCircleDto(circle.getId(), circle.getName(), circle.getDescription(), members);
  }

  private NetworkPersonDto toPerson(UserEntity user) {
    String displayName = String.join(" ",
        user.getFirstName() == null ? "" : user.getFirstName(),
        user.getSurname() == null ? "" : user.getSurname()).trim();
    if (displayName.isBlank()) displayName = user.getUsername();
    return new NetworkPersonDto(user.getId(), user.getUsername(), user.getFirstName(), user.getSurname(),
        displayName, user.getPhoneNumber(), user.getLocation());
  }

  private String normalizeRelationshipType(String type) {
    String value = requireText(type, "Relationship type");
    return relationshipTypes().stream().filter(item -> item.equalsIgnoreCase(value)).findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported relationship type"));
  }

  private String requireText(String value, String label) {
    if (value == null || value.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is required");
    return value.trim();
  }
}
