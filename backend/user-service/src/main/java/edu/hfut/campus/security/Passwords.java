package edu.hfut.campus.security;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;
@Component public class Passwords  {
  public static String hex(byte[] b)  {
    StringBuilder s=new StringBuilder();
    for(byte x:b)s.append(String.format("%02x",x&255));
    return s.toString();
  }
  public static String digest(String s)  {
    try  {
      return hex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
    }
    catch(Exception e)  {
      throw new IllegalStateException();
    }
  }
  private byte[] derive(String p,String salt,int n)throws Exception  {
    return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(p.toCharArray(),salt.getBytes(StandardCharsets.UTF_8),n,256)).getEncoded();
  }
  public String hash(String p)  {
    try  {
      byte[] salt=new byte[16];
      new SecureRandom().nextBytes(salt);
      String s=hex(salt);
      return "pbkdf2$120000$"+s+"$"+hex(derive(p,s,120000));
    }
    catch(Exception e)  {
      throw new IllegalStateException();
    }
  }
  public boolean verify(String p,String stored)  {
    try  {
      if(stored==null||!stored.startsWith("pbkdf2$"))return false;
      String[]s=stored.split("\\$",-1);
      int n=Integer.parseInt(s[1]);
      if(s.length!=4||n<1||n>1000000)return false;
      return MessageDigest.isEqual(hex(derive(p,s[2],n)).getBytes(StandardCharsets.US_ASCII),s[3].getBytes(StandardCharsets.US_ASCII));
    }
    catch(Exception e)  {
      return false;
    }
  }
}
