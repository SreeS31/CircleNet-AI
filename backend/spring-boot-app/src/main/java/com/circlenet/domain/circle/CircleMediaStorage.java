package com.circlenet.domain.circle;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CircleMediaStorage {
  private static final Set<String> TYPES=Set.of("image/jpeg","image/png","image/webp","video/mp4","video/webm","application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation");
  private final Path root;
  public CircleMediaStorage(@Value("${circlenet.storage.local-directory:./var/circlenet/uploads}") String directory){
    root=Paths.get(directory).toAbsolutePath().normalize().resolve("circles");
    try{Files.createDirectories(root);}catch(IOException e){throw new IllegalStateException("Cannot create circle upload directory",e);}
  }
  public StoredMedia store(MultipartFile file){
    if(file==null||file.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a file to upload");
    String type=file.getContentType()==null?"application/octet-stream":file.getContentType();
    if(file.getSize()>25L*1024*1024||!TYPES.contains(type))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose an image, MP4/WebM video, PDF, Office document, or text file under 25 MB");
    String original=file.getOriginalFilename()==null?"attachment":Paths.get(file.getOriginalFilename()).getFileName().toString();
    String extension=original.contains(".")?original.substring(original.lastIndexOf('.')).replaceAll("[^A-Za-z0-9.]",""):"";
    String key=UUID.randomUUID()+extension; Path target=root.resolve(key).normalize();
    if(!target.getParent().equals(root))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid file name");
    try{file.transferTo(target);}catch(IOException e){throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Circle attachment upload failed");}
    return new StoredMedia(key,original,type,file.getSize());
  }
  public Resource load(String key){try{Path file=root.resolve(key).normalize();if(!file.getParent().equals(root))throw new IOException();Resource resource=new UrlResource(file.toUri());if(!resource.exists())throw new IOException();return resource;}catch(Exception e){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Attachment not found");}}
  public record StoredMedia(String key,String name,String type,long size){}
}
