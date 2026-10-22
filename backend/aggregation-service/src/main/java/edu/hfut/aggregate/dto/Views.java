package edu.hfut.aggregate.dto;
import java.util.*;import java.util.function.Predicate;import java.util.stream.*;import java.text.NumberFormat;
/** Request-local compatibility helpers. No persistent or cross-request snapshot. */
public final class Views {
 private Views(){}
 public static Map<String,Object> map(Object...pairs){Map<String,Object>m=new LinkedHashMap<>();for(int i=0;i<pairs.length;i+=2)m.put((String)pairs[i],pairs[i+1]);return m;}
 @SuppressWarnings("unchecked") public static Map<String,Object> obj(Object x){return x instanceof Map?(Map<String,Object>)x:Collections.emptyMap();}
 @SuppressWarnings("unchecked") public static List<Map<String,Object>> rows(Object x){if(!(x instanceof List))throw new IllegalStateException("Missing domain collection");return (List<Map<String,Object>>)x;}
 public static String text(Map<String,Object>x,String k){Object v=x.get(k);return v==null?"":String.valueOf(v);}
 public static Object co(Object...a){for(Object x:a)if(x!=null)return x;return null;}
 public static Object or(Object...a){for(Object x:a)if(truth(x))return x;return "";}
 public static boolean truth(Object x){return x!=null&&!Boolean.FALSE.equals(x)&&!"".equals(x)&&!(x instanceof Number&&((Number)x).doubleValue()==0);}
 public static boolean has(Object x){return x!=null&&!"".equals(x);}
 public static boolean eq(Object a,Object b){return Objects.equals(a,b);}
 public static List<Map<String,Object>> filter(List<Map<String,Object>>a,Predicate<Map<String,Object>>p){return a.stream().filter(p).collect(Collectors.toList());}
 public static int count(List<Map<String,Object>>a,Predicate<Map<String,Object>>p){return (int)a.stream().filter(p).count();}
 public static String num(Object n){return NumberFormat.getIntegerInstance(Locale.CHINA).format(n);}
 public static String day(Map<String,Object>x){String t=text(x,"time");return t.matches("^\\d{4}-\\d{2}-\\d{2}.*")?t.substring(0,10):"";}
 public static List<Map<String,Object>> sorted(List<Map<String,Object>>a,String key){List<Map<String,Object>>b=new ArrayList<>(a);b.sort((x,y)->text(y,key).compareTo(text(x,key)));return b;}
 public static List<Map<String,Object>> latest(List<Map<String,Object>>a){List<Map<String,Object>>b=sorted(a,"time");return new ArrayList<>(b.subList(0,Math.min(10,b.size())));}
 public static Map<String,Object> newest(List<Map<String,Object>>a,String key){return sorted(filter(a,x->truth(x.get(key))),key).stream().findFirst().orElse(null);}
 public static Map<String,Object> first(List<Map<String,Object>>a,Predicate<Map<String,Object>>p){return a.stream().filter(p).findFirst().orElse(null);}
 public static Map<String,Object> group(List<Map<String,Object>>a,String key){Map<String,Object>m=new LinkedHashMap<>();for(Map<String,Object>x:a){String k=String.valueOf(or(x.get(key),"未分类"));m.put(k,((Number)m.getOrDefault(k,0)).intValue()+1);}return m;}
 public static String type(Object s){String t=String.valueOf(s);if(Arrays.asList("开放","在线","正常","值守中","已上传","已认证","已通过","有效").contains(t))return "success";if(Arrays.asList("维护中","待审核","待被访人审核","待保卫处审核","未上传","未生成","未记录").contains(t))return "warning";if(Arrays.asList("关闭","离线","故障","异常","未通过","已过期","停用").contains(t))return "danger";return "primary";}
 public static Map<String,Object> card(String title,Object value,String desc,String type,boolean badge){Map<String,Object>m=map("title",title,"value",value,"desc",desc,"type",type);if(badge)m.put("badge","当前");return m;}
 public static boolean belongs(Map<String,Object>x,Object pid,Map<String,Object>p){if(p.isEmpty()&&!truth(pid))return false;for(String k:Arrays.asList("personId","ownerId","visitorId","hostId"))if(has(x.get(k)))return eq(x.get(k),pid);if(p.isEmpty())return false;for(String k:Arrays.asList("name","person","ownerName","visitor","host"))if(has(x.get(k))&&eq(x.get(k),p.get("name")))return true;return has(p.get("phone"))&&(eq(x.get("phone"),p.get("phone"))||eq(x.get("visitorPhone"),p.get("phone")))||has(p.get("code"))&&(eq(x.get("code"),p.get("code"))||eq(x.get("ownerCode"),p.get("code"))||eq(x.get("visitorCode"),p.get("code")));}
}
