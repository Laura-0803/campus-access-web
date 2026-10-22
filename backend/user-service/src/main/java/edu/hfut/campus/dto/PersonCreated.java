package edu.hfut.campus.dto;
import edu.hfut.campus.entity.PersonEntity;
/** Original creation response excludes the not-yet-present faceStatus property. */ public class PersonCreated  {
  public final String id,name,type,code,idNumber,role,college,className,phone,status,department,position,host,company,graduationYear,major,gate;
  public PersonCreated(PersonEntity p) {
    id=p.id;
    name=p.name;
    type=p.type;
    code=p.code;
    idNumber=p.idNumber;
    role=p.role;
    college=p.college;
    className=p.className;
    phone=p.phone;
    status=p.status;
    department=p.department;
    position=p.position;
    host=p.host;
    company=p.company;
    graduationYear=p.graduationYear;
    major=p.major;
    gate=p.gate;
  }
}
