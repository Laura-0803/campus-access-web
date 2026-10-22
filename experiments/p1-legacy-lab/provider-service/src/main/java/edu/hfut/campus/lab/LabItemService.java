package edu.hfut.campus.lab;

import java.util.List;
public interface LabItemService { LabItem create(String label); LabItem find(long id); List<LabItem> list(); LabItem update(long id,String label); void delete(long id); }
