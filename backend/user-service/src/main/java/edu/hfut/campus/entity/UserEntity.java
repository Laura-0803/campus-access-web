package edu.hfut.campus.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
public class UserEntity  {
  public String id,username,accountType,role,personId,status;
  @JsonIgnore public String password;
}
