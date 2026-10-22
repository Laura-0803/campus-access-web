package edu.hfut.access.exception;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.netflix.hystrix.exception.HystrixBadRequestException;
import edu.hfut.access.dto.Envelope;
@RestControllerAdvice public class ApiAdvice {
 @ExceptionHandler(ApiException.class)public ResponseEntity<?> business(ApiException e){java.util.Map<String,Object> body=Envelope.error(e.getMessage());if(e.details!=null)((java.util.Map<String,Object>)body.get("error")).put("details",e.details);return ResponseEntity.status(e.status).body(body);}
 @ExceptionHandler(org.springframework.dao.DataAccessException.class)public ResponseEntity<?> database(org.springframework.dao.DataAccessException e){return ResponseEntity.status(500).body(Envelope.error("服务器内部错误"));}
 @ExceptionHandler(HystrixBadRequestException.class)public ResponseEntity<?> remote(HystrixBadRequestException e){return e.getCause() instanceof ApiException?business((ApiException)e.getCause()):ResponseEntity.status(503).body(Envelope.error("身份验证服务不可用"));}
}
