package edu.hfut.appointment.exception;
public class ApiException extends RuntimeException {
 public final int status;
 public final Object details;
 public ApiException(int status,String message){this(status,message,null);}
 public ApiException(int status,String message,Object details){super(message);this.status=status;this.details=details;}
}
