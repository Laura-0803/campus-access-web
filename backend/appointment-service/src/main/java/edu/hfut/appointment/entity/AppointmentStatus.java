package edu.hfut.appointment.entity;
public enum AppointmentStatus {
 LEGACY_PENDING("待审核"),HOST_PENDING("待被访人审核"),SECURITY_PENDING("待保卫处审核"),APPROVED("已通过"),REJECTED("未通过");
 public final String text;AppointmentStatus(String text){this.text=text;}
 public static boolean hostPending(String s){return LEGACY_PENDING.text.equals(s)||HOST_PENDING.text.equals(s);}
}
