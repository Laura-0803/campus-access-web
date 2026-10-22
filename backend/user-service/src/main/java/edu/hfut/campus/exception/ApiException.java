package edu.hfut.campus.exception;
public class ApiException extends RuntimeException  {
  public final int status;
  public final Object details;
  public ApiException(int s,String m)  {
    this(s,m,null);
  }
  public ApiException(int s,String m,Object d)  {
    super(m);
    status=s;
    details=d;
  }
}
