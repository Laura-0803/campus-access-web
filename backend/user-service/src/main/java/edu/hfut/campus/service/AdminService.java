package edu.hfut.campus.service;
import edu.hfut.campus.entity.UserEntity;
import java.util.*;
public interface AdminService  {
  Object users(UserEntity a,String role);
  Object createUser(UserEntity a,Map<String,Object>b);
  Object updateUser(UserEntity a,String id,Map<String,Object>b);
  Object person(UserEntity a,String id,Map<String,Object>b);
}
