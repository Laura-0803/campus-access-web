package edu.hfut.aggregate.service;
public interface AggregationService{Object admin(String token);Object dashboard(String role,String userId,String token);Object summary(String token);Object access(String status,String gate,String token);Object health();}
