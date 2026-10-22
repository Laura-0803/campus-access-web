package edu.hfut.campus.dto;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonProperty;
public class LoginRequest  {
  public String account,username;
  @JsonProperty(access=JsonProperty.Access.WRITE_ONLY)public String password;
  public Map<String,Object> values()  {
    return Responses.map("account",account,"username",username,"password",password);
  }
}
