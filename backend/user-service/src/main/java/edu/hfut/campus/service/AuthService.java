package edu.hfut.campus.service;
import java.util.*;
import edu.hfut.campus.entity.UserEntity;
public interface AuthService  {
  Object login(Map<String,Object>b);
  Object roles();
  Object me(UserEntity u,String token,Map<String,String> q);
  Object logout(String token);
  Object change(UserEntity u,Map<String,Object>b);
  Object send(Map<String,Object>b,boolean reset);
  Object reset(Map<String,Object>b);
  Object register(Map<String,Object>b);
  Object projection();
}
