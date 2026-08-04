package com.circlenet.domain.message;

import com.circlenet.domain.circle.CircleMediaStorage;
import com.circlenet.domain.message.model.DirectMessageEntity;
import com.circlenet.domain.network.dto.DirectMessageDto;
import com.circlenet.domain.profile.UserProfileRepository;
import com.circlenet.domain.relationship.RelationshipRepository;
import com.circlenet.domain.user.UserRepository;
import com.circlenet.domain.user.model.UserEntity;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional
public class DirectMessageService {
  private final DirectMessageRepository messages; private final UserRepository users;
  private final RelationshipRepository relationships; private final UserProfileRepository profiles;
  private final CircleMediaStorage storage;
  public DirectMessageService(DirectMessageRepository messages,UserRepository users,RelationshipRepository relationships,UserProfileRepository profiles,CircleMediaStorage storage){this.messages=messages;this.users=users;this.relationships=relationships;this.profiles=profiles;this.storage=storage;}

  @Transactional(readOnly=true)
  public List<DirectMessageDto> conversation(Long currentUserId,Long otherUserId){assertConversationParticipant(currentUserId,otherUserId);return messages.conversation(currentUserId,otherUserId).stream().map(message->dto(message,currentUserId)).toList();}

  public DirectMessageDto send(Long senderId,Long recipientId,String message,MultipartFile file){
    UserEntity recipient=assertConversationParticipant(senderId,recipientId);
    if(!"ACTIVE".equals(recipient.getAccountStatus())||"MANAGED".equals(recipient.getIdentityType()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This person does not have an active CircleNet account and cannot receive private messages");
    if(relationships.findByOwnerUserIdAndRelatedUserId(senderId,recipientId).isEmpty()&&messages.conversation(senderId,recipientId).isEmpty())throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Add this person to your relationships before sending a private message");
    String clean=message==null?"":message.trim();
    if(clean.length()>4000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Message must be 4000 characters or less");
    if(clean.isBlank()&&(file==null||file.isEmpty()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Write a message or choose a file");
    DirectMessageEntity directMessage=new DirectMessageEntity();directMessage.setSenderUserId(senderId);directMessage.setRecipientUserId(recipientId);directMessage.setMessage(clean);
    if(file!=null&&!file.isEmpty()){var media=storage.store(file);directMessage.setAttachmentKey(media.key());directMessage.setAttachmentName(media.name());directMessage.setAttachmentType(media.type());directMessage.setAttachmentSize(media.size());}
    return dto(messages.save(directMessage),senderId);
  }

  @Transactional(readOnly=true)
  public Attachment attachment(Long currentUserId,Long otherUserId,Long messageId){assertConversationParticipant(currentUserId,otherUserId);DirectMessageEntity message=messages.findById(messageId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Message not found"));boolean participant=(currentUserId.equals(message.getSenderUserId())||currentUserId.equals(message.getRecipientUserId()))&&otherUserId.equals(currentUserId.equals(message.getSenderUserId())?message.getRecipientUserId():message.getSenderUserId());if(!participant||message.getAttachmentKey()==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Attachment not found");return new Attachment(storage.load(message.getAttachmentKey()),message.getAttachmentName(),message.getAttachmentType());}

  private UserEntity assertConversationParticipant(Long currentUserId,Long otherUserId){if(currentUserId.equals(otherUserId))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose another person to message");users.findById(currentUserId).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Current user not found"));return users.findById(otherUserId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Person not found"));}
  private DirectMessageDto dto(DirectMessageEntity message,Long currentUserId){UserEntity sender=users.findById(message.getSenderUserId()).orElseThrow();String name=((sender.getFirstName()==null?"":sender.getFirstName())+" "+(sender.getSurname()==null?"":sender.getSurname())).trim();if(name.isBlank())name=sender.getUsername();String photo=profiles.findById(sender.getId()).map(profile->profile.getProfilePhoto()).orElse(null);String attachmentUrl=message.getAttachmentKey()==null?null:"/api/network/messages/with/"+(currentUserId.equals(message.getSenderUserId())?message.getRecipientUserId():message.getSenderUserId())+"/"+message.getId()+"/attachment";return new DirectMessageDto(message.getId(),message.getSenderUserId(),message.getRecipientUserId(),name,photo,message.getMessage(),attachmentUrl,message.getAttachmentName(),message.getAttachmentType(),message.getAttachmentSize(),message.getCreatedAt(),currentUserId.equals(message.getSenderUserId()));}
  public record Attachment(Resource resource,String name,String type){}
}
