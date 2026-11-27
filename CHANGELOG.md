# 更新日志

> 更新弹窗只显示**最新一个版本**的说明，历史版本留在下面备查。
> 想改文案直接改这个文件，不用动代码。

## 1.3.6 — 修复安装脚本报错、启动自愈与待适配提醒

### 修复

- 修复 `install.ps1` 缺少 UTF-8 BOM 导致中文 Windows PowerShell 5.1 解析报语法错误，修正 `-PluginRoot` 与 `-Mode tarball` 分支提示。
- 移除误入 Git 索引的明文提示词稿，确保源码仓库仅保留加密资产。
- 修复默认关闭 `autoApplyOnStart` 时启动自愈提前退出的问题：点过应用后宿主升级、退回密封包或标记丢失均可正常触发自愈，首次安装仍保持只读。
- 修复必选补丁锚点失配被标为 `skipped` 导致「待适配」黄条（`adapt_pending`）不触发的问题，补齐 `patterns` 锚点摘要提取。
- 修复提示词末尾换行 / CRLF 差异导致的重复注入，以及 `/dsh-breach/status` 在 ESM 下调用 `require` 报错的问题。

## 1.3.5 — 补丁真的生效了、注入只剩一份

### 修复

- 补丁全绿但宿主仍读 `app.asar` 时不再算成功：apply 收尾加活体校验，写 `applied.json` 的 `live` 字段，不生效就返回需要彻底退出换包，面板顶出红条。
- 三处会让重启静默失败的出口（清洗自检不过、inflight 判定、unpacked 分支）改成结构化返回，带着分支名和具体宿主文件往上报，不再只说「已取消重启」。
- 系统提示里的注入出现两份：改 injection 只折唯一一个 persona 段，比较前按换行归一 + trim，另加段内折叠兜底；`anchorApplied` 不再是恒 false 的桩。
- `hostFs` 缺 `readSync` / `closeSync` 导致每次 shim 检查都留一个文件描述符、并把文本脚本误判成二进制（issue #2）。
- 重启不再弹「host stopped」：有 runtime 时先让宿主自己 exit 0，helper 只等进程消失再拉起。

### 变更

- 日志从 `%TEMP%` 搬到 `$DSH_HOME/dsh-breach/logs/desktop.log`，补 `sealed.*` / `swap.*` / `http.restart` 事件与退出分支。
- 启动自愈：宿主版本变化、仍然 sealed、宿主 marker 数低于记录，任一成立就自动重打并提示重启；同状态二次启动不再重复打扰。
- 版本号从代码里移走，改成 `lib/host-range.json` 表；未知版本只 warn 不阻断，`install.ps1` 也读同一份表。
- 锚点对不上的 required 补丁进「待适配」并挂黄条，不再把整次应用判失败；有 pending 也照常重启。
- README 的兼容数字改由 `node scripts/gen-compat.mjs` 生成，不再手填。
- `.gitattributes` 锁 LF；桌面面无 shim 时状态行直说「桌面面不提供 dsh 命令」，不挂 ✗；目标文件不存在的补丁计入「本机不适用」，不占分母。

## 1.3.4 — 用户须知去掉红队表述

### 变更

- 用户须知里的「网络安全红队评测与清洗插件」改为「本机增强插件」——红队功能已移除，说明不该再提。
- 设置面板的提示文案同步去掉「红队」字样，改用「规则集」表述。
- 英文版同步调整。

## 1.3.3 — 更新说明只显示当前版本

### 改进

- 更新弹窗不再一次列出四五个版本，只显示最新版本的改动。
- 历史版本仍保留在本文件里，需要回溯时翻这里。

> 顺序：先更新 DSH，再更新插件。

## 1.3.2 — 修复点「应用/重启」后崩溃

### 修复

- 点「应用」或「重启」后 DSH 崩溃：`restartDsh` 把 `{kind, text}` 对象传给了期望字符串的 `setNote`，`note` 变成对象后被直接渲染，抛 React error #31。

> 顺序：先更新 DSH，再更新插件。

## 1.3.1 — 适配 DSH 0.2.2-rc.1

### 适配

- 适配 DSH 0.2.2-rc.1：70 处补丁全部命中，0 pending
- 新增 ptc-executor / dsh-tools-pipeline / deliverable-file-refs 路径键

### 修复

- 点「重启」后 DSH 崩溃（`shell.overlay` 渲染 `{kind, text}` 对象）
- asar 被占用时强杀 DSH，改为等待用户退出
- locale 返回值统一收敛为字符串

### 新增

- 更新确认弹窗：点胶囊先看更新内容，再决定
- 5 个 overlay 组件各自包错误边界

## 1.3.0 — 适配 DSH 0.2.2-rc.1（初版）

- 首次适配 0.2.2-rc.1
- 修复 asar 挪不走导致补丁白打

## 1.2.9

- 回退 UI 改进：只隐藏被撤掉的那一轮
- 设置面板增加 hooks 拒绝开关
