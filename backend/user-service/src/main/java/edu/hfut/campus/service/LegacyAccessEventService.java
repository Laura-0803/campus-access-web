package edu.hfut.campus.service;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import edu.hfut.campus.dao.DomainMapper;
import edu.hfut.campus.dto.LegacyAccessEvent;
import edu.hfut.campus.entity.AuditEntity;
import edu.hfut.campus.exception.ApiException;
@Service public class LegacyAccessEventService  {
  final DomainMapper d;
  public LegacyAccessEventService(DomainMapper d)  {
    this.d=d;
  }
  @Transactional public void accept(LegacyAccessEvent e)  {
    if(e.audits==null||e.vehicles==null||e.audits.size()>10||e.vehicles.size()>10)throw new ApiException(400,"过渡事件不合法");
    for(LegacyAccessEvent.VehicleTime v:e.vehicles)if(v.id==null||v.ownerId==null||v.lastAccess==null||v.lastAccess.length()>64||d.vehicleTime(v)!=1)throw new ApiException(409,"车辆所属关系已变化");
    for(AuditEntity a:e.audits)  {
      if(a.id==null||a.id.length()>64||a.actor==null||a.action==null||a.action.length()>255)throw new ApiException(400,"过渡审计事件不合法");
      d.legacyAudit(a);
    }
  }
}
