package com.circlenet.domain.profile;

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
public class ProfileMediaStorage {
  private static final Set<String> TYPES=Set.of("image/jpeg","image/png","image/webp");
  private final Path root; private final String publicBaseUrl;
  public ProfileMediaStorage(@Value("${circlenet.storage.local-directory:./var/circlenet/uploads}") String directory,@Value("${circlenet.storage.public-base-url:http://localhost:8080}") String base){
    root=Paths.get(directory).toAbsolutePath().normalize();publicBaseUrl=base.replaceAll("/$","");try{Files.createDirectories(root);}catch(IOException e){throw new IllegalStateException("Cannot create upload directory",e);}
  }
  public String store(MultipartFile file){
    if(file==null||file.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a photo to upload");
    if(file.getSize()>5*1024*1024||!TYPES.contains(file.getContentType()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a JPG, PNG or WebP image under 5 MB");
    String ext=switch(file.getContentType()){case "image/png"->".png";case "image/webp"->".webp";default->".jpg";};String name=UUID.randomUUID()+ext;Path target=root.resolve(name).normalize();if(!target.getParent().equals(root))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid file name");
    try{file.transferTo(target);}catch(IOException e){throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Photo upload failed");}return publicBaseUrl+"/api/profile/media/"+name;
  }
  public Resource load(String name){try{Path file=root.resolve(name).normalize();if(!file.getParent().equals(root))throw new IOException();Resource resource=new UrlResource(file.toUri());if(!resource.exists())throw new IOException();return resource;}catch(Exception e){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Photo not found");}}
  public void delete(String url){if(url==null||!url.contains("/api/profile/media/"))return;String name=url.substring(url.lastIndexOf('/')+1);try{Files.deleteIfExists(root.resolve(name).normalize());}catch(IOException ignored){}}
}
