package edu.hfut.campus.service;
import java.util.*;
import edu.hfut.campus.entity.UserEntity;
public interface CredentialService  {
  Object faces(UserEntity u,Map<String,String>q);
  Object upload(UserEntity u,Map<String,String>q,Map<String,Object>b);
  Object vehicles(UserEntity u,Map<String,String>q);
  Object vehicle(UserEntity u,String id,Map<String,Object>b,boolean delete);
}
