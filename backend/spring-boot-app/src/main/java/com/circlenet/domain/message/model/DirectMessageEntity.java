package com.circlenet.domain.message.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="direct_messages")
public class DirectMessageEntity {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(name="sender_user_id",nullable=false) private Long senderUserId;
  @Column(name="recipient_user_id",nullable=false) private Long recipientUserId;
  @Column(length=4000,nullable=false) private String message="";
  @Column(name="attachment_key") private String attachmentKey;
  @Column(name="attachment_name") private String attachmentName;
  @Column(name="attachment_type") private String attachmentType;
  @Column(name="attachment_size") private Long attachmentSize;
  @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
  public Long getId(){return id;}
  public Long getSenderUserId(){return senderUserId;} public void setSenderUserId(Long value){senderUserId=value;}
  public Long getRecipientUserId(){return recipientUserId;} public void setRecipientUserId(Long value){recipientUserId=value;}
  public String getMessage(){return message;} public void setMessage(String value){message=value;}
  public String getAttachmentKey(){return attachmentKey;} public void setAttachmentKey(String value){attachmentKey=value;}
  public String getAttachmentName(){return attachmentName;} public void setAttachmentName(String value){attachmentName=value;}
  public String getAttachmentType(){return attachmentType;} public void setAttachmentType(String value){attachmentType=value;}
  public Long getAttachmentSize(){return attachmentSize;} public void setAttachmentSize(Long value){attachmentSize=value;}
  public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant value){createdAt=value;}
}
