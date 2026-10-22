package edu.hfut.appointment.entity;
/** Original SQL GET shape. Internal order/version are never serialized. */
public class Appointment {
 public String id,visitor,visitorId,visitorPhone,idNumber,host,hostId,time,visitStart,visitEnd,reason,status,createdAt,reviewedAt,reviewer,reviewComment;
 @com.fasterxml.jackson.annotation.JsonIgnore public Long version;
}
