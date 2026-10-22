package edu.hfut.aggregate.exception;
import org.springframework.web.bind.annotation.*;import org.springframework.http.*;import static edu.hfut.aggregate.dto.Views.*;
@RestControllerAdvice public class Errors{
 @ExceptionHandler(ApiException.class)public ResponseEntity<?> known(ApiException e){return ResponseEntity.status(e.status).header("Cache-Control","no-store").body(map("success",false,"error",map("message",e.getMessage())));}
 @ExceptionHandler(Exception.class)public ResponseEntity<?> unavailable(Exception e){return ResponseEntity.status(503).header("Cache-Control","no-store").body(map("success",false,"error",map("message","聚合依赖暂不可用，请稍后重试")));}
}
