package edu.hfut.appointment.service.impl;
import java.time.*;
import java.util.regex.*;
/** Preserve the original frontend's local ISO/space/offset formats and JS day overflow. */
final class LegacyDateTime {
 private static final Pattern ISO=Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})(?:T(\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{1,3}))?)?)?(Z|[+-]\\d{2}:?\\d{2})?$");
 static Long parse(String raw){try{
  String s=raw.replaceFirst(" ","T");Matcher m=ISO.matcher(s);
  if(m.matches()){
   int month=Integer.parseInt(m.group(2)),day=Integer.parseInt(m.group(3));if(month<1||month>12||day<1||day>31)return null;
   LocalDate d=LocalDate.of(Integer.parseInt(m.group(1)),month,1).plusDays(day-1);boolean time=m.group(4)!=null;
   int h=time?Integer.parseInt(m.group(4)):0,min=time?Integer.parseInt(m.group(5)):0,sec=m.group(6)==null?0:Integer.parseInt(m.group(6));if(h==24&&min==0&&sec==0){d=d.plusDays(1);h=0;}
   String fraction=m.group(7);int nano=fraction==null?0:Integer.parseInt((fraction+"000").substring(0,3))*1000000;
   LocalDateTime date=LocalDateTime.of(d,LocalTime.of(h,min,sec,nano));String offset=m.group(8);
   if(offset!=null)return date.toInstant("Z".equals(offset)?ZoneOffset.UTC:ZoneOffset.of(offset)).toEpochMilli();
   return time?date.atZone(ZoneId.of("Asia/Shanghai")).toInstant().toEpochMilli():date.toInstant(ZoneOffset.UTC).toEpochMilli();
  }
  if(s.matches("\\d{4}"))return LocalDate.of(Integer.parseInt(s),1,1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
  if(s.matches("\\d{4}-\\d{2}"))return YearMonth.parse(s).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
 }catch(Exception ignored){}return null;}
}
