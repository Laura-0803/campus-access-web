package edu.hfut.appointment.dto;
import java.util.*;
public class DirectoryContext {
 public Actor actor;
 public List<Host> hosts;
 public PersonScope visitorScope;
 public int servedBy;
 public boolean unavailable;
 public static class Actor {public String id,username,role,personId,personName,phone;}
 public static class Host {public String id,name,role,type,code,department;}
 public static class PersonScope {public String name,phone;}
}
