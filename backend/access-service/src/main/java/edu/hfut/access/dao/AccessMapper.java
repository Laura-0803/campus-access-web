package edu.hfut.access.dao;import java.util.*;import org.apache.ibatis.annotations.Param;
public interface AccessMapper{
 List<Map<String,Object>>list(String table);
 int insert(@Param("table")String table,@Param("row")Map<String,Object> row);
 int update(@Param("table")String table,@Param("row")Map<String,Object> row);
 int delete(@Param("table")String table,@Param("row")Map<String,Object> row);
 Map<String,Object>lock(String id);
 Map<String,Object>request(String id);
 int reserveRequest(@Param("id")String id,@Param("digest")String digest);
 int completeRequest(@Param("id")String id,@Param("response")String response);
 int event(@Param("id")String id,@Param("kind")String kind,@Param("payload")String payload);
}
