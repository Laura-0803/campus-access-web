import edu.hfut.access.service.AccessPolicy;import java.time.*;
public class P4CPolicyTest{
 static int count;static void check(boolean b){count++;if(!b)throw new AssertionError("Policy assertion "+count);}
 public static void main(String[]args){for(String s:new String[]{null,"","garbage","25:99-99:99","24:00-25:00","prefix00:00-23:59suffix","0:00-23:59","00:00-23:99","预约时段garbage"})check(!AccessPolicy.time(s,LocalTime.NOON));
 check(AccessPolicy.time("09:00-17:00",LocalTime.of(9,0)));check(AccessPolicy.time("09:00-17:00",LocalTime.of(17,0)));check(!AccessPolicy.time("09:00-17:00",LocalTime.of(8,59)));check(!AccessPolicy.time("09:00-17:00",LocalTime.of(17,1)));
 check(AccessPolicy.time("23:00-01:00",LocalTime.of(23,0)));check(AccessPolicy.time("23:00-01:00",LocalTime.MIDNIGHT));check(AccessPolicy.time("23:00-01:00",LocalTime.of(1,0)));check(!AccessPolicy.time("23:00-01:00",LocalTime.of(12,0)));
 check(AccessPolicy.time("全天",LocalTime.NOON));check(AccessPolicy.time("全天时间",LocalTime.NOON));check(AccessPolicy.timestamp("2026-10-20 00:00:00").equals(AccessPolicy.timestamp("2026-10-19T16:00:00Z")));check(AccessPolicy.timestamp("2026-10-20T00:00:00+08:00").equals(AccessPolicy.timestamp("2026-10-19T16:00:00Z")));check(AccessPolicy.timestamp("2026-99-99 00:00:00")==null);
 System.out.println("{\"actualCompiledPolicy\":true,\"assertions\":"+count+",\"pass\":true,\"timezone\":\"Asia/Shanghai\"}");}
}
