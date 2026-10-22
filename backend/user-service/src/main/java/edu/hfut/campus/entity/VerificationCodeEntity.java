package edu.hfut.campus.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
public class VerificationCodeEntity  {
  public String purpose,phone,userId;
  @JsonIgnore public String digest;
  public long sentAt,expiresAt;
  public int attempts;
}
