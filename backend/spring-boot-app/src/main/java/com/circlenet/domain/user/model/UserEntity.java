package com.circlenet.domain.user.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String username;

  @Column(unique = true)
  private String email;

  @Column(name = "phone_number", nullable = false, unique = true)
  private String phoneNumber;

  @Column(nullable = false)
  private String role = "USER";

  @Column(nullable = false)
  private String passwordHash;

  private String firstName;
  private String surname;
  private String location;

  @Column(name = "account_status", nullable = false)
  private String accountStatus = "ACTIVE";

  public Long getId() {
    return id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhoneNumber() {
    return phoneNumber;
  }

  public void setPhoneNumber(String phoneNumber) {
    this.phoneNumber = phoneNumber;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public String getFirstName() { return firstName; }
  public void setFirstName(String firstName) { this.firstName = firstName; }
  public String getSurname() { return surname; }
  public void setSurname(String surname) { this.surname = surname; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getAccountStatus() { return accountStatus; }
  public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }
}
