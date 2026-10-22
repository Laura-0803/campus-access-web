package edu.hfut.campus.dto;
import java.util.*;
import edu.hfut.campus.entity.AuditEntity;
public class LegacyAccessEvent  {
  public List<AuditEntity> audits=new ArrayList<>();
  public List<VehicleTime> vehicles=new ArrayList<>();
  public static class VehicleTime  {
    public String id,ownerId,lastAccess;
  }
}
