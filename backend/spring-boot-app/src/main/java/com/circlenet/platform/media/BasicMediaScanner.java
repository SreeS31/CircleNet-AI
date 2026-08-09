package com.circlenet.platform.media;

import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class BasicMediaScanner implements MediaScanner {
  public void assertClean(byte[] bytes,String name,String type){
    String sample=new String(bytes,0,Math.min(bytes.length,8192),StandardCharsets.ISO_8859_1);
    if(sample.contains("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")||starts(bytes,0x4d,0x5a)||starts(bytes,0x7f,0x45,0x4c,0x46))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The file was rejected by the security scan");
  }
  private boolean starts(byte[] bytes,int... signature){if(bytes.length<signature.length)return false;for(int i=0;i<signature.length;i++)if((bytes[i]&255)!=signature[i])return false;return true;}
}
