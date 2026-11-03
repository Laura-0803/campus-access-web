#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/campus-access-web"

if ! command -v java >/dev/null 2>&1; then
  echo "启动失败：未找到 Java，请安装并启用 JDK 11。" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "启动失败：未找到 npm，请先安装 Node.js/npm。" >&2
  exit 1
fi

if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  echo "启动失败：前端依赖尚未安装，请先运行：cd campus-access-web && npm install" >&2
  exit 1
fi

echo "正在启动全部服务：Eureka 双节点、Gateway、业务微服务、聚合服务和前端……"
echo "前端地址：http://localhost:5173"
echo "按 Ctrl-C 可统一停止全部服务。"

cd "$WEB_DIR"
exec npm run start-all
