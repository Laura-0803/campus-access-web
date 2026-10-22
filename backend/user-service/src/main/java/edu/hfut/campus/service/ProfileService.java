package edu.hfut.campus.service;
import edu.hfut.campus.entity.UserEntity;
import java.util.*;
public interface ProfileService  {
  Object profile(UserEntity actor,String role,Map<String,String>query,Map<String,Object>body,boolean update);
  Object people(UserEntity actor,Map<String,String>q);
  Object person(UserEntity actor,String id);
}
