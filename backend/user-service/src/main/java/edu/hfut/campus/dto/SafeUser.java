package edu.hfut.campus.dto;
import edu.hfut.campus.entity.UserEntity;
/** Explicit response whitelist; password/hash fields cannot enter this DTO. */ public class SafeUser  {
  public final String id,username,accountType,role,personId,status;
  public SafeUser(UserEntity u)  {
    id=u.id;
    username=u.username;
    accountType=u.accountType;
    role=u.role;
    personId=u.personId;
    status=u.status;
  }
}
