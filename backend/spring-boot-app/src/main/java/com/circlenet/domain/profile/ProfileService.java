package com.circlenet.domain.profile;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.circlenet.domain.profile.dto.UserProfileDto;
import com.circlenet.domain.profile.model.UserProfileEntity;
import com.circlenet.domain.user.UserRepository;
import com.circlenet.domain.user.model.UserEntity;

@Service @Transactional
public class ProfileService {
  private final UserProfileRepository profiles; private final UserRepository users;
  public ProfileService(UserProfileRepository profiles, UserRepository users){this.profiles=profiles;this.users=users;}
  @Transactional(readOnly=true) public UserProfileDto get(Long userId){return dto(user(userId),profiles.findById(userId).orElseGet(()->blank(userId)));}
  public UserProfileDto save(Long userId,UserProfileDto d){
    UserEntity u=user(userId); u.setFirstName(clean(d.firstName()));u.setSurname(clean(d.surname()));u.setEmail(clean(d.email()));u.setLocation(clean(d.location()));users.save(u);
    UserProfileEntity p=profiles.findById(userId).orElseGet(()->blank(userId));
    p.setDateOfBirth(clean(d.dateOfBirth()));p.setGender(clean(d.gender()));p.setBio(clean(d.bio()));p.setAddressLine1(clean(d.addressLine1()));p.setAddressLine2(clean(d.addressLine2()));p.setCity(clean(d.city()));p.setState(clean(d.state()));p.setPostalCode(clean(d.postalCode()));p.setCountry(clean(d.country()));
    p.setAlternatePhone(clean(d.alternatePhone()));p.setWebsite(clean(d.website()));p.setWhatsapp(clean(d.whatsapp()));p.setLinkedin(clean(d.linkedin()));p.setFacebook(clean(d.facebook()));p.setInstagram(clean(d.instagram()));p.setXHandle(clean(d.xHandle()));
    p.setHighestQualification(clean(d.highestQualification()));p.setInstitution(clean(d.institution()));p.setFieldOfStudy(clean(d.fieldOfStudy()));p.setGraduationYear(clean(d.graduationYear()));p.setEmploymentStatus(clean(d.employmentStatus()));p.setEmployer(clean(d.employer()));p.setJobTitle(clean(d.jobTitle()));p.setIndustry(clean(d.industry()));p.setWorkLocation(clean(d.workLocation()));
    validatePhoto(d.profilePhoto());p.setProfilePhoto(d.profilePhoto());p.getPhotos().clear();List<String> gallery=d.photos()==null?List.of():d.photos();if(gallery.size()>8)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Maximum 8 gallery photos");gallery.forEach(this::validatePhoto);p.getPhotos().addAll(gallery);return dto(u,profiles.save(p));
  }
  private void validatePhoto(String value){if(value!=null&&!value.isBlank()&&(!value.startsWith("data:image/")||value.length()>2_800_000))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Photos must be images under 2 MB");}
  private UserEntity user(Long id){return users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"User not found"));}
  private UserProfileEntity blank(Long id){UserProfileEntity p=new UserProfileEntity();p.setUserId(id);return p;} private String clean(String s){return s==null||s.isBlank()?null:s.trim();}
  private UserProfileDto dto(UserEntity u,UserProfileEntity p){return new UserProfileDto(u.getFirstName(),u.getSurname(),u.getEmail(),u.getPhoneNumber(),u.getLocation(),p.getDateOfBirth(),p.getGender(),p.getBio(),p.getAddressLine1(),p.getAddressLine2(),p.getCity(),p.getState(),p.getPostalCode(),p.getCountry(),p.getAlternatePhone(),p.getWebsite(),p.getWhatsapp(),p.getLinkedin(),p.getFacebook(),p.getInstagram(),p.getXHandle(),p.getHighestQualification(),p.getInstitution(),p.getFieldOfStudy(),p.getGraduationYear(),p.getEmploymentStatus(),p.getEmployer(),p.getJobTitle(),p.getIndustry(),p.getWorkLocation(),p.getProfilePhoto(),List.copyOf(p.getPhotos()));}
}
