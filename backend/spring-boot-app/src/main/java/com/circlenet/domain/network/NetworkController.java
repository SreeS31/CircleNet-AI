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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.core.io.Resource;
import com.circlenet.domain.circle.CircleConversationService;
import com.circlenet.domain.network.dto.CirclePostDto;
import com.circlenet.domain.message.DirectMessageService;
import com.circlenet.domain.network.dto.DirectMessageDto;
import com.circlenet.domain.message.DirectCallService;
import com.circlenet.domain.message.RelationshipBroadcastService;
import com.circlenet.domain.network.dto.BroadcastAudienceDto;
import com.circlenet.domain.network.dto.BroadcastResultDto;
import com.circlenet.domain.network.dto.DirectCallDto;
import com.circlenet.domain.network.dto.StartDirectCallRequest;
import com.circlenet.domain.network.dto.AnswerDirectCallRequest;

import com.circlenet.domain.network.dto.AddRelationshipRequest;
import com.circlenet.domain.network.dto.AddPersonRequest;
import com.circlenet.domain.network.dto.CircleMemberRequest;
import com.circlenet.domain.network.dto.CreateNetworkCircleRequest;
import com.circlenet.domain.network.dto.NetworkCircleDto;
import com.circlenet.domain.network.dto.NetworkPersonDto;
import com.circlenet.domain.network.dto.NetworkRelationshipDto;
import com.circlenet.domain.network.dto.UpdateRelationshipRequest;
import com.circlenet.domain.network.dto.UpdateNetworkCircleRequest;

@RestController
@RequestMapping("/api/network")
public class NetworkController {
  private final NetworkService networkService;
  private final CircleConversationService circleConversationService;
  private final DirectMessageService directMessageService;
  private final DirectCallService directCallService;
  private final RelationshipBroadcastService broadcastService;
  public NetworkController(NetworkService networkService,CircleConversationService circleConversationService,DirectMessageService directMessageService,DirectCallService directCallService,RelationshipBroadcastService broadcastService) { this.networkService = networkService; this.circleConversationService=circleConversationService; this.directMessageService=directMessageService; this.directCallService=directCallService; this.broadcastService=broadcastService; }

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

  @PutMapping("/circles/{circleId}")
  public NetworkCircleDto updateCircle(Principal principal, @PathVariable Long circleId,
      @RequestBody UpdateNetworkCircleRequest request) {
    return networkService.updateCircle(userId(principal), circleId, request);
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

  @GetMapping("/circles/{circleId}/posts")
  public List<CirclePostDto> circlePosts(Principal principal,@PathVariable Long circleId){return circleConversationService.posts(userId(principal),circleId);}

  @PostMapping(value="/circles/{circleId}/posts",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public CirclePostDto createCirclePost(Principal principal,@PathVariable Long circleId,
      @RequestParam(value="message",required=false) String message,@RequestParam(value="parentPostId",required=false) Long parentPostId,
      @RequestPart(value="file",required=false) MultipartFile file){return circleConversationService.create(userId(principal),circleId,parentPostId,message,file);}

  @GetMapping("/circles/{circleId}/posts/{postId}/attachment")
  public ResponseEntity<Resource> circleAttachment(Principal principal,@PathVariable Long circleId,@PathVariable Long postId){var attachment=circleConversationService.attachment(userId(principal),circleId,postId);return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=\""+attachment.name().replace("\"","")+"\"").contentType(MediaType.parseMediaType(attachment.type())).body(attachment.resource());}

  @GetMapping("/messages/with/{otherUserId}")
  public List<DirectMessageDto> directMessages(Principal principal,@PathVariable Long otherUserId){return directMessageService.conversation(userId(principal),otherUserId);}

  @PostMapping(value="/messages/with/{otherUserId}",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public DirectMessageDto sendDirectMessage(Principal principal,@PathVariable Long otherUserId,@RequestParam(value="message",required=false) String message,@RequestPart(value="file",required=false) MultipartFile file){return directMessageService.send(userId(principal),otherUserId,message,file);}

  @GetMapping("/messages/with/{otherUserId}/{messageId}/attachment")
  public ResponseEntity<Resource> directMessageAttachment(Principal principal,@PathVariable Long otherUserId,@PathVariable Long messageId){var attachment=directMessageService.attachment(userId(principal),otherUserId,messageId);return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=\""+attachment.name().replace("\"","")+"\"").contentType(MediaType.parseMediaType(attachment.type())).body(attachment.resource());}

  @PostMapping("/calls") public DirectCallDto startCall(Principal principal,@RequestBody StartDirectCallRequest request){return directCallService.start(userId(principal),request);}
  @GetMapping("/calls/incoming") public List<DirectCallDto> incomingCalls(Principal principal){return directCallService.incoming(userId(principal));}
  @GetMapping("/calls/{callId}") public DirectCallDto call(Principal principal,@PathVariable Long callId){return directCallService.get(userId(principal),callId);}
  @PostMapping("/calls/{callId}/accept") public DirectCallDto acceptCall(Principal principal,@PathVariable Long callId,@RequestBody AnswerDirectCallRequest request){return directCallService.accept(userId(principal),callId,request.answerSdp());}
  @PostMapping("/calls/{callId}/reject") public DirectCallDto rejectCall(Principal principal,@PathVariable Long callId){return directCallService.reject(userId(principal),callId);}
  @PostMapping("/calls/{callId}/end") public DirectCallDto endCall(Principal principal,@PathVariable Long callId){return directCallService.end(userId(principal),callId);}

  @GetMapping("/broadcasts/preview")
  public BroadcastAudienceDto previewBroadcast(Principal principal,
      @RequestParam String audienceType,
      @RequestParam(required=false) Long anchorUserId,
      @RequestParam(required=false) String location) {
    return broadcastService.preview(userId(principal), audienceType, anchorUserId, location);
  }

  @PostMapping(value="/broadcasts", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public BroadcastResultDto sendBroadcast(Principal principal,
      @RequestParam String audienceType,
      @RequestParam(required=false) Long anchorUserId,
      @RequestParam(required=false) String location,
      @RequestParam(value="message",required=false) String message,
      @RequestPart(value="file",required=false) MultipartFile file) {
    return broadcastService.send(userId(principal), audienceType, anchorUserId, location, message, file);
  }

  private Long userId(Principal principal) { return Long.valueOf(principal.getName()); }
}
