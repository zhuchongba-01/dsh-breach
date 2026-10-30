# dsh-happy

DSH（DeepSeek Harness）插件：往宿主里注入**提示词、规则和工具**，并提供一个可回滚的**补丁引擎**。

装完之后，你的 DSH 会按这份插件定义的默认人格与规则工作，同时保留完整的撤销能力——每条补丁都有备份，随时能一键还原。

- 目标宿主：`dsh 0.2.1-rc.5`
- 支持表面：`web` / `desktop`
- 许可证：MIT

---

## 它到底做什么

### 1. 提示词注入

提示词的优先级（从高到低）：

```
输入框里正在显示的文字  >  $DSH_HOME/prompt-inject.md  >  插件内置的加密默认
```

- 默认提示词以 AES-256-GCM 封存在 `lib/asset-table.js` 里，运行时解密，明文不落盘。
- 想换成自己的：编辑 `$DSH_HOME/prompt-inject.md`，保存即生效，不用重启。
- 不同模型可以绑定不同提示词（按 preset 切换）。

### 2. 补丁引擎（86 条）

把 `@deepseek-ai/*` 宿主源码里的特定字符串替换掉，覆盖这些面：

| 分组 | 作用 |
|---|---|
| `disclaimer` | 全局 / 替换 / 作用域免责声明 → 强指令 |
| `approval_sentence` | 审批提示句 → 自动放行 |
| `approval_policy` | 审批默认 `never` + 自动放行 |
| `desktop_update` | 官方桌面更新交接 |
| `desktop_close` | host 退出不再报错弹框 |
| `hooks_deny` | hooks deny → allow |
| `hooks_steer` | Stop / UserPromptSubmit 不再假插话或整轮 reject |

- 每条补丁有唯一 id，改动前写 `.dshhappy.bak` 备份，记录在 `$DSH_HOME/dsh-happy/applied.json`。
- 宿主升级后可以重放（reapply），也可以整批回滚。
- 不认识的宿主版本会跳过，不会硬改坏。

### 3. 三个工具

| 工具 | 作用 |
|---|---|
| `happy_status` | 看当前打了哪些补丁、哪些失败、备份在哪 |
| `happy_apply` | 打补丁 / 重放 |
| `happy_revert` | 按备份回滚 |

### 4. 区域与敏感操作门

`lib/net-scope.js` 会在第一步拦截三类请求：

- 面向中国大陆 / 香港 / 澳门的主机
- 约 200 个银行域名
- 攻击类关键词请求

被拦时直接返回一句拒绝话术，不进入模型。白名单写在 `$DSH_HOME/net-scope-allow.txt`，一行一个。

### 5. Web 面板

插件在自己的 Web 表面注册了 `/dsh-happy/*` 一组路由（状态、应用、回滚、卸载、重启、rewind、Skill、规则、覆盖等）。
只接受同源请求：跨站 `sec-fetch-site`、`Origin: null`、`Origin` 与 `Host` 不一致的一律拒绝。

### 6. Skill / 规则 / rewind

- Skill 与规则的增删改走同一套 HTTP + 工具接口。
- rewind 支持把会话退回到指定轮次。

---

## 安装

### 方式一：DSH 界面里装（推荐）

打开 DSH → 插件 → **添加插件**，在输入框里粘贴包名：

```
dsh-happy-pj
```

安装源选「中国大陆镜像源」或官方源都行（`registry.npmmirror.com` 已同步该包）。

### 方式二：手工写进 profile 的 `package.json`

```jsonc
{
  "dependencies": {
    // 从 npm 装：
    "dsh-happy-pj": "^1.0.24"
    // 或从本地目录装（改成你自己的路径）：
    // "dsh-happy-pj": "link:D:/dsh/dsh-happy-pj"
  },
  "dsh": { "profile": { "bundles": ["dsh-happy-pj"] } }
}
```

然后在该 profile 目录下 `pnpm install`。

### 验证

装完重启宿主，打开：

```
http://127.0.0.1:<DSH 端口>/dsh-happy/status
```

`<DSH 端口>` 就是 DSH Web 界面的端口（本机示例是 `52034`）。返回 `{"ok":true,...}` 即加载成功。

### 关于命令行

`dsh plugin ...` 这类子命令依赖宿主提供的 CLI——**部分安装（如桌面版）并不带 `dsh` 命令**。你自己的目录里可以先看有没有：

```bash
# 有 dsh 命令才用这条
dsh plugin --profile desktop add dsh-happy-pj
```

没有就用上面两种方式。插件自带的 CLI 是 `dsh-happy`（装完后在 profile 的 `node_modules/.bin` 里），跑 `dsh-happy --help`。


---

## 目录结构

```
lib/
  index.js           插件入口：注册工具、路由、注入钩子
  core.js            补丁引擎（86 条补丁 + 显示分组 + 应用/回滚）
  client.js          客户端 bundle（侧栏 UI、词条、样式）
  desktop.js         桌面表面适配
  identity.js        身份覆盖
  net-scope.js       区域与敏感操作门
  asset-table.js     加密的默认提示词资产
  table-key.js       封存/解封（AES-256-GCM + deflate）
  skills.js           Skill 管理
  rules.js            规则管理
  rewind.js           会话回退
  update.js           自更新（默认关闭）
bin/
  dsh-happy.js        CLI
scripts/
  embed-default-prompt.mjs   把明文 md 封成 asset-table.js
```

## 状态目录

全部在 `$DSH_HOME/dsh-happy/`：

| 文件 | 内容 |
|---|---|
| `applied.json` | 已应用的补丁 id 与备份位置 |
| `host-backups/` | 宿主原文件备份 |
| `drill-grant.json` | 演练授权 |
| `override-state.json` | 覆盖状态 |
| `installed-rev` | 安装版本标记 |

---

## 开发

```bash
# 重新封存默认提示词（先准备 lib/default-prompt-inject.md）
pnpm embed-prompt

# 语法检查
node --check lib/index.js
```

改了默认提示词正文之后才需要跑 `embed-prompt`；运行时不读明文 md。

## 卸载

先回滚补丁（`happy_revert`，或界面上点「回滚」），再删包：

- 界面里：插件列表 → `dsh-happy-pj` → 卸载
- 或在 profile 目录里：

  ```bash
  pnpm remove dsh-happy-pj
  ```

  并把它从 profile `package.json` 的 `dsh.profile.bundles` 数组里删掉。

宿主带了 CLI 的话，也可以 `dsh plugin --profile desktop remove dsh-happy-pj`。

`$DSH_HOME/dsh-happy/` 里的备份建议留着，直到确认宿主正常。

## 许可

[MIT](./LICENSE) © 2026 zhuchongba01

插件通过改写宿主源码工作，只在你自己的机器、自己的安装上使用。
