package edu.hfut.appointment.dto;
public class WriteContext {
 public DirectoryContext.Actor actor;
 public Person host,visitor;
 public boolean unavailable;
 public int servedBy;
 public static class Person {public String id,name,role,status,code,phone,idNumber;}
}
