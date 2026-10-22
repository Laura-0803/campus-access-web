package edu.hfut.campus.lab;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Service
public class LabItemServiceImpl implements LabItemService {
 private final LabItemDao dao; public LabItemServiceImpl(LabItemDao dao){this.dao=dao;}
 private void validate(String label){if(label==null||label.trim().isEmpty()||label.length()>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"label must contain 1-100 characters");}
 @Transactional public LabItem create(String label){validate(label);LabItem item=new LabItem();item.setLabel(label);dao.insert(item);return item;}
 public LabItem find(long id){LabItem item=dao.find(id);if(item==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Synthetic lab item not found");return item;}
 public List<LabItem> list(){return dao.list();}
 @Transactional public LabItem update(long id,String label){validate(label);LabItem item=new LabItem();item.setId(id);item.setLabel(label);if(dao.update(item)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND);return item;}
 @Transactional public void delete(long id){if(dao.delete(id)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND);}
}
