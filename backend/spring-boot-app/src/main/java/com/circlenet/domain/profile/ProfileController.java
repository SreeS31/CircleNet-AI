package com.circlenet.domain.profile;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;
import com.circlenet.domain.profile.dto.UserProfileDto;
@RestController @RequestMapping("/api/profile")
public class ProfileController {
 private final ProfileService service; public ProfileController(ProfileService service){this.service=service;}
 @GetMapping("/me") public UserProfileDto get(Principal p){return service.get(Long.valueOf(p.getName()));}
 @PutMapping("/me") public UserProfileDto save(Principal p,@RequestBody UserProfileDto d){return service.save(Long.valueOf(p.getName()),d);}
}
