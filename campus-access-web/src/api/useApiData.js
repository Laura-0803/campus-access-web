// useEffect 负责执行异步加载副作用，useState 保存数据、加载状态、错误和刷新版本号。
import { useEffect, useState } from "react";

/**
 * 根据传入默认值的类型构造同类型的“空数据”。
 * 接口首次加载失败时，数组回退为空数组、普通对象回退为空对象，其余类型回退为 null，
 * 从而避免页面直接使用 map、属性读取等操作时因为类型突变而报错。
 */
function emptyLike(value) {
  // 数组数据通常用于列表渲染，因此保持数组类型。
  if (Array.isArray(value)) return [];
  // 排除 null 后，将对象型数据重置为空对象。
  if (value && typeof value === "object") return {};
  // 字符串、数字等其他类型没有通用空值，统一返回 null。
  return null;
}

/**
 * 通用接口数据 Hook。
 * @param {Function} loader 无参数异步加载函数，成功后返回页面需要的数据。
 * @param {*} fallback 首次渲染使用的默认数据，同时决定失败时的空数据类型。
 * @param {Array} deps 外部依赖；任一依赖变化时重新请求。
 * @returns 数据、手动改值函数、加载状态、错误对象和主动刷新函数。
 */
export function useApiData(loader, fallback, deps = []) {
  // data 对外提供业务数据；初始值让页面在首个请求结束前也能安全渲染。
  const [data, setData] = useState(fallback);
  // loading 用于显示骨架屏、加载文字或禁用重复操作。
  const [loading, setLoading] = useState(true);
  // error 保留最近一次加载错误，成功请求会把它清空。
  const [error, setError] = useState(null);
  // version 不参与业务展示，只作为递增的重载触发器。
  const [version, setVersion] = useState(0);

  // 依赖或刷新版本变化时执行一次完整的异步加载流程。
  useEffect(() => {
    // alive 标记当前副作用是否仍有效，防止组件卸载后继续更新状态。
    let alive = true;

    // 每轮请求开始时进入加载态。
    setLoading(true);
    loader()
      .then((nextData) => {
        // 如果组件已卸载或副作用已清理，直接忽略迟到的响应。
        if (!alive) return;
        // 保存服务器返回的数据，并清除上一次错误。
        setData(nextData);
        setError(null);
      })
      .catch((nextError) => {
        if (!alive) return;
        // 暴露错误给调用页面；若仍是初始默认值，则替换为同类型空结构。
        setError(nextError);
        setData((current) => (current === fallback ? emptyLike(fallback) : current));
      })
      .finally(() => {
        // 无论成功失败，请求结束后都退出加载态；清理后的旧请求不得影响新页面。
        if (alive) setLoading(false);
      });

    // 组件卸载或依赖改变时使本轮请求失效，规避异步竞态和内存泄漏警告。
    return () => {
      alive = false;
    };
  }, [...deps, version]);

  // setData 允许页面做局部乐观更新；reload 通过递增 version 主动触发同一 loader。
  return {
    data,
    setData,
    loading,
    error,
    reload: () => setVersion((value) => value + 1)
  };
}
