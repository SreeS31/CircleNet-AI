package com.circlenet.domain.circle;

import com.circlenet.platform.media.MediaObjectStorage;
import com.circlenet.platform.media.MediaAssetService;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CircleMediaStorage {
  private static final Set<String> TYPES=Set.of("image/jpeg","image/png","image/webp","video/mp4","video/webm","audio/mpeg","audio/mp3","audio/mp4","audio/x-m4a","audio/wav","audio/x-wav","audio/webm","audio/ogg","application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation");
  private final MediaObjectStorage storage; private final MediaAssetService assets;
  public CircleMediaStorage(MediaObjectStorage storage,MediaAssetService assets){this.storage=storage;this.assets=assets;}
  public StoredMedia store(Long ownerUserId,MultipartFile file){
    var asset=assets.store(ownerUserId,"CONVERSATION",file,TYPES,25L*1024*1024,"circles/");String key=asset.key().substring("circles/".length());return new StoredMedia(key,asset.name(),asset.type(),asset.size());
  }
  public Resource load(String key){return storage.load("circles/"+key);}
  public void delete(String key){if(key!=null)assets.delete("circles/"+key);}
  public record StoredMedia(String key,String name,String type,long size){}
}
