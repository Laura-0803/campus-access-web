from pathlib import Path
p=Path('backend/aggregation-service/src/main/java/edu/hfut/aggregate/service/impl/AggregationServiceImpl.java')
s=p.read_text(encoding='utf-8')
a=s.index(' private Map<String,Object> context(');b=s.index('\n private Map<String,Object> load(',a)
# Only replace the new aggregation layer; do not alter user-service authentication.
new=''' private Map<String,Object> context(String token){
  if(token==null||token.isEmpty())throw new ApiException(401,"\u8bf7\u5148\u767b\u5f55\u540e\u518d\u8bbf\u95ee\u7cfb\u7edf\u63a5\u53e3");
  try{return user.context(key,"Bearer "+token);}catch(Exception e){
   Throwable c=e;while(c!=null){if(c instanceof feign.FeignException){feign.FeignException remote=(feign.FeignException)c;int status=remote.status();
    if(status==401||status==403){String message=status==401?"\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55":"\u5f53\u524d\u89d2\u8272\u65e0\u6743\u8bbf\u95ee\u8be5\u63a5\u53e3";
     try{String m=new com.fasterxml.jackson.databind.ObjectMapper().readTree(remote.contentUTF8()).path("error").path("message").asText();
      if(Arrays.asList("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u8bbf\u95ee\u7cfb\u7edf\u63a5\u53e3","\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55","\u767b\u5f55\u8d26\u53f7\u4e0d\u5b58\u5728\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55","\u8d26\u53f7\u5df2\u88ab\u505c\u7528","\u8d26\u53f7\u672a\u5173\u8054\u6709\u6548\u4eba\u5458\u6863\u6848").contains(m))message=m;
     }catch(Exception ignored){}throw new ApiException(status,message);
    }
   }c=c.getCause();}throw new ApiException(503,"\u8ba4\u8bc1\u6743\u5a01\u6682\u4e0d\u53ef\u7528");
  }
 }'''
p.write_text(s[:a]+new+s[b:],encoding='utf-8')
