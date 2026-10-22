package edu.hfut.campus.service;
import edu.hfut.campus.entity.UserEntity;
import java.util.*;
public interface MessageService  {
  Object list(UserEntity u,Map<String,String>q);
  Object write(UserEntity u,String id,Map<String,String>q,Map<String,Object>b,String action);
  Object logs(UserEntity u,Map<String,String>q);
}
