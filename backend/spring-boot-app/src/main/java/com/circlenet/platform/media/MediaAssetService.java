package com.circlenet.platform.media;

import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MediaAssetService {
  private final MediaObjectStorage storage; private final MediaAssetRepository assets; private final MediaScanner scanner; private final long quotaBytes;
  public MediaAssetService(MediaObjectStorage storage,MediaAssetRepository assets,MediaScanner scanner,@Value("${circlenet.storage.user-quota-bytes:1073741824}") long quotaBytes){this.storage=storage;this.assets=assets;this.scanner=scanner;this.quotaBytes=quotaBytes;}
  @Transactional
  public StoredAsset store(Long owner,String category,MultipartFile file,Set<String> allowed,long maximumBytes,String keyPrefix){
    if(file==null||file.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a file to upload");String type=file.getContentType()==null?"application/octet-stream":file.getContentType();if(file.getSize()>maximumBytes)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"File exceeds the "+(maximumBytes/1024/1024)+" MB limit");if(!allowed.contains(type))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This file type is not supported");if(assets.activeBytes(owner)+file.getSize()>quotaBytes)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"Your media storage quota is full. Remove older files before uploading.");
    try{byte[] bytes=file.getBytes();String original=file.getOriginalFilename()==null?"file":Paths.get(file.getOriginalFilename()).getFileName().toString();validateSignature(bytes,type);scanner.assertClean(bytes,original,type);String extension=extension(original);String key=keyPrefix+UUID.randomUUID()+extension;storage.put(key,bytes,type,original);MediaAssetEntity asset=new MediaAssetEntity();asset.setOwnerUserId(owner);asset.setStorageKey(key);asset.setCategory(category);asset.setOriginalName(original);asset.setContentType(type);asset.setSizeBytes(bytes.length);asset.setSha256(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));if(Set.of("image/jpeg","image/png").contains(type)){byte[] thumbnail=thumbnail(bytes);if(thumbnail!=null){String thumbnailKey=keyPrefix+"thumbs/"+UUID.randomUUID()+".jpg";storage.put(thumbnailKey,thumbnail,"image/jpeg","thumbnail.jpg");asset.setThumbnailKey(thumbnailKey);}}assets.save(asset);return new StoredAsset(key,original,type,bytes.length);}catch(ResponseStatusException e){throw e;}catch(Exception e){throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Media upload failed");}
  }
  @Transactional public void delete(String key){if(key==null)return;var asset=assets.findByStorageKeyAndDeletedAtIsNull(key);storage.delete(key);asset.ifPresent(value->{if(value.getThumbnailKey()!=null)storage.delete(value.getThumbnailKey());value.setDeletedAt(Instant.now());assets.save(value);});}
  @Scheduled(cron="${circlenet.storage.retention-cleanup-cron:0 30 2 * * *}") @Transactional public void cleanupExpired(){for(var asset:assets.findTop100ByExpiresAtBeforeAndDeletedAtIsNullOrderByExpiresAt(Instant.now()))delete(asset.getStorageKey());}
  public long usage(Long owner){return assets.activeBytes(owner);}
  private void validateSignature(byte[] bytes,String type){boolean valid=switch(type){case "image/jpeg"->starts(bytes,0xff,0xd8,0xff);case "image/png"->starts(bytes,0x89,0x50,0x4e,0x47);case "image/webp"->bytes.length>12&&new String(bytes,0,4).equals("RIFF")&&new String(bytes,8,4).equals("WEBP");case "application/pdf"->bytes.length>5&&new String(bytes,0,5).equals("%PDF-");default->true;};if(!valid)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"File contents do not match the selected file type");}
  private boolean starts(byte[] bytes,int... signature){if(bytes.length<signature.length)return false;for(int i=0;i<signature.length;i++)if((bytes[i]&255)!=signature[i])return false;return true;}
  private String extension(String name){if(!name.contains("."))return "";return name.substring(name.lastIndexOf('.')).toLowerCase().replaceAll("[^a-z0-9.]","");}
  private byte[] thumbnail(byte[] bytes){try{BufferedImage source=ImageIO.read(new ByteArrayInputStream(bytes));if(source==null)return null;double scale=Math.min(1d,320d/Math.max(source.getWidth(),source.getHeight()));int width=Math.max(1,(int)(source.getWidth()*scale)),height=Math.max(1,(int)(source.getHeight()*scale));BufferedImage target=new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB);Graphics2D graphics=target.createGraphics();graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);graphics.drawImage(source,0,0,width,height,null);graphics.dispose();ByteArrayOutputStream output=new ByteArrayOutputStream();ImageIO.write(target,"jpg",output);return output.toByteArray();}catch(Exception ignored){return null;}}
  public record StoredAsset(String key,String name,String type,long size){}
}
