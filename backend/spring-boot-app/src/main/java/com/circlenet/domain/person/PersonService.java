package com.circlenet.domain.person;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.circlenet.domain.person.dto.CreatePersonRequest;
import com.circlenet.domain.person.dto.PersonDto;
import com.circlenet.domain.person.model.PersonEntity;

@Service
public class PersonService {
  private final PersonRepository personRepository;

  public PersonService(PersonRepository personRepository) {
    this.personRepository = personRepository;
  }

  public List<PersonDto> listPeople() {
    return personRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
  }

  public PersonDto getPerson(Long id) {
    return personRepository.findById(id).map(this::toDto).orElseThrow(() -> new IllegalArgumentException("Person not found"));
  }

  public PersonDto createPerson(CreatePersonRequest request) {
    PersonEntity entity = new PersonEntity();
    entity.setFullName(request.getFullName());
    entity.setEmail(request.getEmail());
    return toDto(personRepository.save(entity));
  }

  public PersonDto updatePerson(Long id, CreatePersonRequest request) {
    PersonEntity entity = personRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Person not found"));
    entity.setFullName(request.getFullName());
    entity.setEmail(request.getEmail());
    return toDto(personRepository.save(entity));
  }

  public void deletePerson(Long id) {
    personRepository.deleteById(id);
  }

  private PersonDto toDto(PersonEntity entity) {
    PersonDto dto = new PersonDto();
    dto.setId(entity.getId());
    dto.setFullName(entity.getFullName());
    dto.setEmail(entity.getEmail());
    return dto;
  }
}
