package edu.hfut.campus.exception;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.dao.*;
import static edu.hfut.campus.dto.Responses.*;
@RestControllerAdvice public class Errors  {
  @ExceptionHandler(ApiException.class) public ResponseEntity<?> api(ApiException e)  {
    return ResponseEntity.status(e.status).body(map("success",false,"error",e.details==null?map("message",e.getMessage()):map("message",e.getMessage(),"details",e.details)));
  }
  @ExceptionHandler(DuplicateKeyException.class) public ResponseEntity<?> duplicate()  {
    return api(new ApiException(409,"账号或人员编号已存在"));
  }
  @ExceptionHandler(Exception.class) public ResponseEntity<?> unexpected(Exception e)  {
    return api(new ApiException(500,"服务器内部错误"));
  }
}
