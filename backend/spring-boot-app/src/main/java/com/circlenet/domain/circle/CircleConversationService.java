package com.circlenet.domain.circle;

import com.circlenet.domain.circle.model.CircleEntity;
import com.circlenet.domain.circle.model.CirclePostEntity;
import com.circlenet.domain.network.dto.CirclePostDto;
import com.circlenet.domain.profile.UserProfileRepository;
import com.circlenet.domain.user.UserRepository;
import com.circlenet.domain.user.model.UserEntity;
import com.circlenet.domain.notification.NotificationCommand;
import com.circlenet.domain.notification.NotificationService;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional
public class CircleConversationService {
  private final CircleRepository circles; private final CirclePostRepository posts; private final UserRepository users;
  private final UserProfileRepository profiles; private final CircleMediaStorage storage; private final NotificationService notificationService;
  public CircleConversationService(CircleRepository circles,CirclePostRepository posts,UserRepository users,UserProfileRepository profiles,CircleMediaStorage storage,NotificationService notificationService){this.circles=circles;this.posts=posts;this.users=users;this.profiles=profiles;this.storage=storage;this.notificationService=notificationService;}

  @Transactional(readOnly=true) public List<CirclePostDto> posts(Long userId,Long circleId){memberCircle(userId,circleId);return posts.findByCircleIdOrderByCreatedAtAsc(circleId).stream().map(post->dto(post,userId)).toList();}
  public CirclePostDto create(Long userId,Long circleId,Long parentPostId,String message,MultipartFile file){
    CircleEntity circle=memberCircle(userId,circleId); assertCanPost(circle,userId);
    String clean=message==null?"":message.trim(); if(clean.length()>4000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Message must be 4000 characters or less");
    CirclePostEntity parent=null; if(parentPostId!=null){parent=posts.findById(parentPostId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Message not found"));if(!circleId.equals(parent.getCircleId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Reply must belong to this circle");}
    if(clean.isBlank()&&(file==null||file.isEmpty()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Write a message or choose a file");
    CirclePostEntity post=new CirclePostEntity();post.setCircleId(circleId);post.setAuthorUserId(userId);post.setParentPostId(parent==null?null:parent.getId());post.setMessage(clean);
    if(file!=null&&!file.isEmpty()){var media=storage.store(file);post.setAttachmentKey(media.key());post.setAttachmentName(media.name());post.setAttachmentType(media.type());post.setAttachmentSize(media.size());}
    post=posts.save(post); UserEntity author=users.findById(userId).orElseThrow(); String authorName=name(author);
    for(Long memberId:circle.getMemberUserIds()) if(!memberId.equals(userId)) notificationService.notify(new NotificationCommand(memberId,"CIRCLE_MESSAGE",circle.getName(),authorName+": "+(clean.isBlank()?"Sent an attachment":clean),"/dashboard?circleId="+circleId,"CIRCLE_POST",post.getId()));
    return dto(post,userId);
  }
  @Transactional(readOnly=true) public Attachment attachment(Long userId,Long circleId,Long postId){memberCircle(userId,circleId);CirclePostEntity post=posts.findById(postId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Message not found"));if(!circleId.equals(post.getCircleId())||post.getAttachmentKey()==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Attachment not found");return new Attachment(storage.load(post.getAttachmentKey()),post.getAttachmentName(),post.getAttachmentType());}
  private CircleEntity memberCircle(Long userId,Long circleId){CircleEntity circle=circles.findById(circleId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Circle not found"));if(!circle.getMemberUserIds().contains(userId))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only circle members can view this conversation");return circle;}
  private void assertCanPost(CircleEntity circle,Long userId){if("ADMINS_ONLY".equals(circle.getPostingPermission())&&!circle.getAdminUserIds().contains(userId))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only circle admins can post messages");}
  private CirclePostDto dto(CirclePostEntity post,Long currentUserId){UserEntity author=users.findById(post.getAuthorUserId()).orElseThrow();String name=((author.getFirstName()==null?"":author.getFirstName())+" "+(author.getSurname()==null?"":author.getSurname())).trim();if(name.isBlank())name=author.getUsername();String photo=profiles.findById(author.getId()).map(p->p.getProfilePhoto()).orElse(null);String url=post.getAttachmentKey()==null?null:"/api/network/circles/"+post.getCircleId()+"/posts/"+post.getId()+"/attachment";return new CirclePostDto(post.getId(),post.getCircleId(),post.getParentPostId(),author.getId(),name,photo,post.getMessage(),url,post.getAttachmentName(),post.getAttachmentType(),post.getAttachmentSize(),post.getCreatedAt(),currentUserId.equals(author.getId()));}
  public record Attachment(Resource resource,String name,String type){}
  private String name(UserEntity user){String value=((user.getFirstName()==null?"":user.getFirstName())+" "+(user.getSurname()==null?"":user.getSurname())).trim();return value.isBlank()?user.getUsername():value;}
}
