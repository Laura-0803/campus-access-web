package edu.hfut.campus.lab;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface LabItemDao {
 int insert(LabItem item); LabItem find(long id); List<LabItem> list(); int update(LabItem item); int delete(long id);
}
