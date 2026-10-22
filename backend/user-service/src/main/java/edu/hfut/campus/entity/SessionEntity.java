package edu.hfut.campus.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
public class SessionEntity  {
  @JsonIgnore public String token;
  public String userId,role,createdAt,expiresAt;
}
