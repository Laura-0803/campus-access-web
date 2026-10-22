// 本模块定义所有路由共用的成功、失败响应格式、异步错误转发和必填字段检查工具。
// 返回普通成功响应；meta 可附加 total 等与 data 同级的响应元信息。
export function ok(res, data = null, meta = {}) {
  return res.json({ success: true, data, ...meta });
}

// 返回 HTTP 201 创建成功响应，主体结构与普通成功响应保持一致。
export function created(res, data = null, meta = {}) {
  return res.status(201).json({ success: true, data, ...meta });
}

// 返回统一失败响应，将用户可读消息和可选错误详情封装到 error 对象中。
export function fail(res, status, message, details) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      details
    }
  });
}

// 将异步路由处理函数包装为 Express 中间件，把 Promise 拒绝统一交给全局错误处理中间件。
export function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// 检查指定字段是否缺失、为 null 或去除空白后为空，并返回所有缺失字段名。
export function requireFields(body, fields) {
  return fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || String(value).trim() === "";
  });
}
