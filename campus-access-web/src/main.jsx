// React 提供严格模式等核心能力；ReactDOM 负责把 React 组件树挂载到浏览器真实 DOM 中。
import React from "react";
import ReactDOM from "react-dom/client";
// BrowserRouter 使用浏览器 History API 保存当前路由，使页面切换无需重新请求整份 HTML。
import { BrowserRouter } from "react-router-dom";
// App 是前端应用的根业务组件，index.css 则统一加载 Tailwind 指令和全局基础样式。
import App from "./App.jsx";
import "./index.css";

// 找到 public/index.html 中 id 为 root 的挂载节点，并为它创建 React 18 根实例。
ReactDOM.createRoot(document.getElementById("root")).render(
  // 严格模式仅在开发环境帮助发现副作用、过时 API 等潜在问题，不会额外渲染可见界面。
  <React.StrictMode>
    {/* 为整棵组件树提供路由上下文，使 App 内部可以使用 Routes、Navigate、useLocation 等能力。 */}
    <BrowserRouter>
      {/* 渲染应用根组件；后续登录态管理、权限校验和页面路由都从这里展开。 */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
