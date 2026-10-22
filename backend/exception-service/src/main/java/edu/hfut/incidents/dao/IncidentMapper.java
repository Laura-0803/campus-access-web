package edu.hfut.incidents.dao;
import java.util.*;import org.apache.ibatis.annotations.Param;
public interface IncidentMapper {
 List<Map<String,Object>> exceptions();Map<String,Object> incident(@Param("id")String id);Map<String,Object> lockIncident(@Param("id")String id);
 List<Map<String,Object>> blacklist();Map<String,Object> black(@Param("id")String id);void lockBlacklist();int insertBlack(Map<String,Object>b);int updateBlack(Map<String,Object>b);
 int updateIncident(Map<String,Object>b);int insertIncident(Map<String,Object>b);
 Map<String,Object> inbox(@Param("id")String id);int insertInbox(@Param("id")String id,@Param("digest")String digest,@Param("exceptionId")String exceptionId,@Param("time")String time);
 int outbox(@Param("id")String id,@Param("payload")String payload);List<Map<String,Object>> due();int delivered(@Param("id")String id);int failed(@Param("id")String id);int claim(@Param("id")String id);
 Map<String,Object> request(@Param("id")String id);int insertRequest(@Param("id")String id,@Param("digest")String digest,@Param("response")String response);
 int fault(@Param("name")String name);
}
