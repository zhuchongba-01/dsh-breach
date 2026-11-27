window.__ModuleLoader__.load({ id: "dsh-breach", factory: (require) => {

		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const h = react.createElement;
		const { useState, useEffect, useCallback, useRef, Component } = react;

		const name = "dsh-breach";
		const inject = ["slots", "locale"];
		const NS = "settings.dsh-breach";
		let translate = (key) => key;
		function useT() {
			return translate;
		}
		function clientGuessSurface() {
			try {
				if (typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent || "")) return "desktop";
				if (typeof location !== "undefined") {
					const port = String(location.port || "");
					if (port === "43120") return "desktop";
					const host = String(location.hostname || "");
					if (host && host !== "127.0.0.1" && host !== "localhost" && /dsh desktop/i.test(String(location.href || ""))) return "desktop";
				}
			} catch { /* ignore */ }
			return "";
		}
		function hostSurfaceOf(s) {
			return (s && s.surface) || clientGuessSurface() || "web";
		}
		/**
		 * 把任意来源的文本收敛成字符串。
		 * DSH 0.2.2 起，locale / command / tool 的返回值可能是 {kind, text} 这类对象，
		 * 直接塞进 React children 会抛 React error #31（Objects are not valid as a React child），
		 * 进而让整个 shell.overlay entry 崩掉、宿主判 fatal 直接退出。
		 */
		function safeText(value, fallback) {
			const fb = fallback === undefined ? "" : fallback;
			if (typeof value === "string") return value;
			if (value === null || value === undefined) return fb;
			if (typeof value === "number" || typeof value === "boolean") return String(value);
			if (typeof value === "object") {
				if (typeof value.text === "string") return value.text;
				if (typeof value.message === "string") return value.message;
				if (typeof value.label === "string") return value.label;
				return fb;
			}
			return fb;
		}
		function hostText(t, key, surface) {
			if (surface && surface !== "web") {
				const specific = key + "." + surface;
				const hit = t(specific);
				if (hit && hit !== specific) return safeText(hit, key);
			}
			return safeText(t(key), key);
		}
		function apiUrl(p) {
			try { return new URL(p, window.location.origin).toString(); } catch { return p; }
		}
		function apiTimeoutMs(p, init) {
			const path = String(p || "");
			const method = String((init && init.method) || "GET").toUpperCase();
			if (path.indexOf("/dsh-breach/update") !== -1) return method === "POST" ? 180000 : 45000;
			if (path.indexOf("/dsh-breach/uninstall") !== -1) return 90000;
			// status 会在"应用"期间被后端的同步落盘阻塞，默认 20s 必然被 abort，界面只会显示"读取失败: timeout"。
			if (path.indexOf("/dsh-breach/status") !== -1) return 60000;
			if (path.indexOf("/dsh-breach/apply") !== -1) return 240000;
			if (path.indexOf("/dsh-breach/revert") !== -1) return 120000;
			if (path.indexOf("/dsh-breach/restart") !== -1) return 60000;
			return 20000;
		}
		function isAbortError(e) {
			const msg = String((e && e.message) || e || "");
			return (e && e.name === "AbortError") || /aborted|abort/i.test(msg);
		}
		async function apiJson(p, init) {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), apiTimeoutMs(p, init));
			try {
				const r = await fetch(apiUrl(p), Object.assign({ cache: "no-store", credentials: "same-origin", signal: ctrl.signal }, init || {}));
				const text = await r.text();
				let data;
				try { data = text ? JSON.parse(text) : null; } catch {
					throw new Error(r.status + " non-json: " + text.slice(0, 120));
				}
				if (!r.ok) throw new Error((data && (data.error || data.message)) || (r.status + " " + r.statusText));
				return data;
			} catch (e) {
				if (isAbortError(e)) throw new Error("timeout");
				const msg = String((e && e.message) || e || "");
				if (/failed to fetch|networkerror|load failed/i.test(msg)) {
					throw new Error("连不上接口，请确认 dsh 还在跑后 Ctrl+F5");
				}
				throw e;
			} finally { clearTimeout(timer); }
		}

		function promptBoxEmpty(text) {
			return !String(text || "").trim();
		}

		function responseNeedsPrompt(d) {
			return Boolean(d && (d.needPrompt || d.injectSource === "none"));
		}

		function warnNeedPrompt(d, tr) {
			if (!responseNeedsPrompt(d)) return false;
			window.alert(tr("need.prompt"));
			return true;
		}

		async function bothInjectEmpty(overrideText, defaultText) {
			if (!promptBoxEmpty(overrideText)) return false;
			if (!promptBoxEmpty(defaultText)) return false;
			return true;
		}

		const TARGETS = ["AGENTS.md", "CLAUDE.md"];

		const zh = {
			nav: "规则设定",
			"dock.clean": "清洗",
			"dock.toggle": "dsh-breach",
			"dock.newSession": "dsh-breach",
			"updPill.label": "更新",
			"updPill.title": "有新版本可用，点一下看更新内容",
			"updPill.busy": "更新中…",
			"updPill.fail": "更新失败",
			"updDialog.title": "发现新版本",
			"updDialog.version": "版本",
			"updDialog.now": "立即更新",
			"updDialog.later": "稍后",
			"updDialog.updating": "更新中…",
			"updDialog.noNotes": "这个版本没有附带更新说明。",
			"dock.inSession": "dsh-breach",
			"dock.full": "全面浏览",
			"dock.close": "收起",
			"dock.unauthorized": "未授权",
			"welcome.title": "用户须知",
			"welcome.lead": "首次安装本插件时请阅读以下说明。确认后本窗不再弹出。",
			"welcome.warn": "本插件免费开源。任何背着作者私自售卖、付费倒卖或借本项目盈利的行为，作者将依法追究法律责任。",
			"welcome.body": "dsh-breach 是 DeepSeek Harness 的本机增强插件：调整提示词、补丁与运行策略。项目免费、非营利。",
			"welcome.repo": "https://github.com/zhuchongba-01/dsh-breach",
			"welcome.ban1": "禁止将本项目用于未授权的网络攻击、入侵、窃取数据、破坏系统或任何违法犯罪。",
			"welcome.ban2": "禁止商业售卖、付费倒卖、黑灰产牟利，以及隐瞒作者的营利性再分发。",
			"welcome.ban3": "使用者须自行遵守所在地法律法规与平台规范；违法后果由行为人自行承担，与作者无关。",
			"welcome.bans": "禁止事项",
			"welcome.check": "我已阅读并理解上述用户须知，同意合法合规使用。",
			"welcome.ok": "我已知晓并继续",
			"theme.aria": "外观",
			"theme.white": "白",
			"theme.ink": "墨",
			"happy.title": "补丁",
			"override.title": "提示词",
			"own.title": "自己的服务器",
			"own.hint": "每行一个 IP 或完整主机名。可以写成 账号@主机，账号只用来认出这种写法。主机名会连同它当时解析出的地址一起放行。不要写密钥、密码、网段。",
			"own.save": "保存名单",
			"saved.own": "已保存自己的服务器",
			"saved.own.dropped": "已保存。有 {n} 行不是单个 IP 或主机名，已丢掉",
			"metric.happyd": "已写入",
			"metric.happyd.skip": "已写入。跳过 {n} 项，本机没有这些文件",
			"metric.pendingShort": "待处理 {n}",
			"metric.unmatchedShort": "没对上 {n}",
			"metric.skipShort": "跳过 {n}",
			"metric.unlocated.count": "—",
			"metric.shim": "shim",
			"metric.shim.na": "本端不需要",
			"metric.bak.yes": "有备份",
			"metric.bak.no": "无备份",
			"metric.bak.hint": "备份",
			"table.patch": "项目",
			"table.status": "状态",
			"status.applied": "已应用",
			"status.off": "已关闭",
			"status.pending": "待应用",
			"status.unmatched": "没对上",
			"status.skipped": "跳过",
			"apply.hint": "没改提示词框不用点保存，默认就是这份，启动和应用会写进 prompt-inject.md。只有自己改过再点保存才会覆盖。点应用打补丁。待应用=原文还在。跳过=当前版本不需要或组件未安装。",
			"warn.noRoot": "未定位到当前宿主的 @deepseek-ai，清洗不会生效。请完全退出后再打开本宿主，在本页点「应用」。桌面端安装目录可以是任意盘符；目录名带 DeepseekHarness / DeepSeek Harness 均可。",
			"warn.noRoot.desktop": "官方客户端的代码在 app.asar 里。点「应用」会解开并自动重启，不用另跑脚本。若一直显示还没定位，先完全退出客户端再开，再点「应用」。第三方 DSH Desktop 直接点「应用」。",
			"unpack.restarting": "补丁已写入。点「重启」后客户端会自己重新打开。",
			"restart.fullQuit": "正在重启，客户端会自己重新打开。",
			"warn.noInject": "官方始终用默认提示词。启用规则集时只用规则集；未启用时用去掉 CTF 的默认提示词，再接规则操作。两边都空会提示必须添加。",
			"need.prompt": "提示词和规则集都是空的，必须先添加提示词，或启用一条有内容的规则集。",
			"btn.restoreInject": "恢复默认",
			"restore.title": "恢复默认提示词",
			"restore.body": "把提示词恢复成内置默认稿并立即写入宿主文件？当前输入框里的修改会被覆盖。",
			"restore.confirm": "确认恢复",
			"restore.cancel": "取消",
			"saved.restoreInject": "已恢复默认提示词",
			"skip": "跳过",
			"unknown": "未知",
			"delete": "删除",
			"btn.apply": "应用",
			"btn.apply.busy": "处理中…",
			"btn.revert": "还原",
			"btn.uninstall": "卸载",
			"btn.uninstall.busy": "卸载中…",
			"uninstall.title": "卸载 dsh-breach",
			"uninstall.body": "是否卸载？卸载将还原回原版，并清除本插件的全部文件与补丁。",
			"uninstall.confirm": "确认卸载",
			"uninstall.cancel": "取消",
			"uninstall.applying": "正在卸载并还原…",
			"uninstall.done": "已卸载并还原，正在重启…",
			"uninstall.done.desktop": "已卸载并还原，正在重启桌面应用…",
			"uninstall.fail": "卸载失败: {error}",
			"channel.title": "通道",
			"channel.stable": "正式版",
			"channel.beta": "测试版",
			"channel.useStable": "切换到正式版",
			"channel.useBeta": "切换到测试版",
			"channel.local": "本机",
			"update.checking": "正在检测更新…",
			"update.applying": "正在更新…",
			"update.switching": "正在切换版本…",
			"update.latest": "已是最新（{version}）",
			"update.available": "有新版本 {remote}，当前 {local}",
			"update.pinned": "已固定在 {version}，通道最新是 {remote}",
			"update.done": "已更新到 {version}",
			"update.restarting": "已还原并写入新补丁，正在重启…",
			"update.fullQuit": "补丁已写入。点「重启」后客户端会自己重新打开。",
			"restart.official.title": "需要重启",
			"restart.official.body": "补丁已写入。点重启后客户端会自己重新打开。",
			"update.switched": "已切换到 {version}",
			"update.autoDone": "已自动更新到 {version}",
			"update.reloading": "正在刷新设置页…",
			"update.dirty": "有新版本，本地有改动未自动覆盖",
			"update.fail": "更新失败: {error}",
			"update.timeout": "检测超时，请再点一次检测更新",
			"update.needRestart": "检测接口未加载，请先重启 dsh 再点检测更新",
			"update.switch": "切换到此版本",
			"update.pick": "选择版本",
			"update.tip": "最新",
			"update.current": "当前",
			"update.confirmSwitch": "切换到 {version}？之后可再切回另一通道或其它版本。本地未提交的插件改动不会保留。",
			"update.confirmChannel": "切换到{version}？会按该通道重新安装插件，本地未提交的插件改动不会保留。",
			"metric.version": "版本",
			"action.apply": "应用",
			"action.revert": "还原",
			"action.uninstall": "卸载",
			"ok.done": "已完成",
			"err.action": "失败: {error}",
			"err.status": "读取失败: {error}",
			"err.override": "读取失败: {error}",
			"err.read": "读取失败: {error}",
			"err.save": "保存失败: {error}",
			"btn.saveInject": "保存",
			"saved.override": "已保存",
			"ph.alias.short": "名称",
			"btn.restart": "重启",
			"btn.restart.busy": "重启中…",
			"restarting": "重启中…",
			"restarting.desktop": "正在重启桌面应用…",
			"restart.timeout": "等待超时。若 DSH 还开着，请完全退出它（托盘右键 → 退出），插件会自动完成替换并重新启动。",
			"restart.notStarted": "核心文件被 DSH 占用，替换没有完成。请完全退出 DSH（托盘右键 → 退出）后，插件会自己完成改名并重新启动；不需要再点一次。",
			"restart.fail": "失败: {error}",
			"restart.already": "这一次重启已经开始，不会再重启一次。",
			"restart.confirm": "清洗已完成，重启后生效。",
			"restart.confirm.desktop": "清洗已完成，重启桌面应用后生效。",
			"restart.ask.title": "要现在重启吗",
			"restart.ask.body": "已经写入。重启后才会在当前客户端里生效。",
			"restart.revert.title": "要现在重启吗",
			"restart.revert.body": "补丁已撤销。重启后才会完全还原；想恢复补丁，重启后再点「应用」。",
			"restart.now": "现在重启",
			"restart.notNow": "稍后",
			"restart.asarSwap": "补丁已写入磁盘。正在结束桌面进程并挪开 app.asar，完成后会自动重新打开；若仍无效，请先完全退出 Harness（托盘也关），再点一次应用。",
			"surface.web": "Web",
			"surface.desktop": "桌面端",
			"surface.gui": "GUI",
			"surface.tui": "TUI",
			"restart.incomplete": "提示词已写入。{detail}",
			"restart.incomplete.patches": "还有 {failed} 项代码补丁没对上当前版本（#{ids}），不影响这段提示词",
			"restart.incomplete.flash": "CMD 无感未钉入（{entry}）",
			"restart.later": "以后",
			"group.prompt": "提示词",
			"group.code": "代码",
			"group.engine": "引擎",
			"group.tools": "工具",
			"group.compat": "0.1.5 兼容",
			"group.dsh20": "0.2.0",
			"ov.ok": "全部就绪",
			"ov.loading": "读取中…",
			"ov.applied": "已生效",
			"ov.skipped": "跳过",
			"ov.failed": "失败",
			"ov.pending": "待应用",
			"ov.failN": "项失败",
			"ov.pendingN": "项待应用",
			"ov.notApplied": "未应用",
			"ov.liveBad": "补丁未生效：宿主仍在读 app.asar",
			"ov.fullQuit": "彻底退出并换包",
			"ov.adaptN": "项锚点待适配",
			"ov.hostWarn": "宿主版本提示",
			"ov.groupDetail": "补丁分组明细",
			"ov.reapply": "重新应用",
			"ov.view": "筛选查看",
			"ov.hostVerified": "已验证",
			"ov.hostUnverified": "未验证",
			"tab.patches": "补丁",
			"tab.prompt": "提示词",
			"tab.settings": "设置",
			"grp.compat": "兼容",
			"grp.desc.prompt": "身份剥除 · 免责与审批句替换",
			"grp.desc.code": "沙箱默认全开 · 审批与 hooks 旁路",
			"grp.desc.tools": "终端谨慎词清理 · 外部内容放行",
			"grp.desc.compat": "预设衔接 · OAuth 与无弹窗重启",
			"set.sysTitle": "版本与宿主控制",
			"set.sysHint": "需要彻底重载宿主进程、检查新版本或卸载并还原补丁时在此操作。",
			"set.checkUpdate": "检查更新",
			"set.restartHost": "重启宿主",
			"set.ownEdit": "编辑名单",
			"set.ownClose": "收起",
			"ov.skippedHint": "跳过",
			"ov.allApplied": "没有跳过项",
			"ov.showDetail": "查看明细 ›",
			"ov.hideDetail": "收起明细 ˅",
			"patch.1": "全局免责 → 强指令",
			"patch.2": "替换式免责 → 强指令",
			"patch.3": "作用域免责 → 强指令",
			"patch.4": "persona 会话强指令",
			"patch.5": "审批提示句 → 全权限",
			"patch.6": "沙箱 deny → allow 写",
			"patch.7": "沙箱默认全权限",
			"patch.8": "审批默认 never",
			"patch.9": "审批门自动放行",
			"patch.10": "审批配置默认 never",
			"patch.11": "never 提示句 → 自动放行",
			"patch.12": "ask 提示句 → 自动放行",
			"patch.13": "豁免升级阶梯",
			"patch.14": "升级无条件授信",
			"patch.15": "沙箱 confine 直通",
			"patch.16": "文件系统围栏取消",
			"patch.17": "观察策略读写放行",
			"patch.18": "重复调用守卫禁用",
			"patch.19": "工具结果修剪禁用",
			"patch.21": "恢复插件延长的 bash 等待",
			"patch.22": "read 上限放宽",
			"patch.23": "子代理深度 3 → 10",
			"patch.24": "preset fetch 启用",
			"patch.25": "去掉官方默认身份（功能提示词不动）",
			"patch.26": "minimal：去掉默认身份并打开 inject",
			"patch.28": "dsh-liangshen（梁神）：phase-1 保留 dsh-breach / dshhappy 段",
			"patch.70": "极简模式终端不再禁止网络",
			"patch.71": "梁神去掉官方身份句",
			"patch.29": "dsh-tool-web：外部 untrusted 拦截→可执行",
			"patch.30": "dsh-hooks-claude-code：deny→allow",
			"patch.31": "dsh-hooks-codex：deny→allow",
			"patch.32": "Web 表面身份中性化",
			"patch.33": "Shell 拒绝提示 → 可执行",
			"patch.34": "沙箱提示中性化",
			"patch.35": "升级 never 不拒",
			"patch.36": "文件系统升级 schema 放行",
			"patch.37": "子代理 scope lock 中性化",
			"patch.38": "persona text→prefix（0.1.2 预设）",
			"patch.39": "会话 v0 plugin summary（mnemon）",
			"patch.40": "complete 预设仍保留注入",
			"patch.42": "设置页旧接口",
			"patch.43": "网页预设去掉默认身份",
			"patch.45": "官方桌面更新交接",
			"patch.46": "官方更新脚本只用英文",
			"patch.47": "OAuth 不再插入 Claude 身份",
			"patch.48": "shell 去掉删除前的额外确认",
			"patch.49": "OAuth 不再伪装 claude-cli",
			"patch.50": "跨会话引用不再标不可信",
			"patch.51": "新会话保持完全权限",
			"patch.52": "会话日志默认不上传",
			"patch.53": "网页提示去掉禁止另开服务器",
			"patch.54": "交付物提示去掉多余禁止",
			"patch.55": "每一步替换第一条系统提示",
			"patch.56": "回退只藏被撤掉的那一轮",
			"patch.57": "developer role 仅限 openai/azure，第三方代理回退 system",
			"patch.58": "回退空标记不进模型请求",
			"patch.59": "官方 Auto Review 不再拦工具",
			"patch.60": "官方 run_code 去掉审批教学",
			"patch.61": "官方沙箱策略不再教拒绝",
			"patch.62": "无审批通道时放行（用户拒绝仍有效）",
			"patch.63": "计划模式不再软拦执行",
			"patch.64": "Stop hook 不再注入假用户话",
			"patch.65": "UserPromptSubmit deny 不再整轮 reject",
			"patch.66": "空的系统段不再把这一轮打成内部错误",
			"patch.67": "缺 messages 时这一轮不中断",
			"patch.68": "回退后缺 content 不中断",
			"patch.69": "deepseek-flash 保持官方 in-history",
			"patch.72": "Messages 的 system 用当前系统提示",
			"patch.73": "极简 bash 去掉误留的镜像说明",
			"patch.74": "启动/应用把默认提示词写入 prompt-inject.md",
			"patch.75": "回退把已完成任务收回成未开始",
			"patch.76": "unrestricted 预设去掉身份句",
			"patch.77": "回退标记到达时丢弃已发送消息",
			"patch.78": "补丁文件缺失时从 .bak 恢复",
			"patch.80": "恢复官方极简工具表",
			"patch.82": "主进程兜底 DSH_PROFILE=desktop",
			"patch.83": "host 信号杀时不报错不弹对话框",
			"patch.84": "host code=0 正常退出不报错 (消除 stopped 对话框)",
			"patch.85": "prompt() 的 steer 仍走插话，不压成 followup",
			"patch.86": "队列插话走 steer；公共 steer() 保持下一步",
			"patch.87": "首次 assemble 用 prepare 返回的当前模式 systemPrompt",
			"patch.88": "去掉 renderPrompt 后的挂针，注入只走 assemble",
			"status.unlocated": "未定位",
			"status.na": "本端不需要",
			"metric.unlocated": "还没定位到本机 Harness",
			"metric.sealed": "已找到官方客户端，点应用解开",
			"metric.sealed.count": "待解开",
			"metric.lost": "补丁已丢失，请重新应用",
			"metric.lost.count": "已丢失",
			"rewind.label": "回退",
			"rewind.aria": "回退",
			"rewind.busy": "回退中…",
			"rewind.empty": "没有可回退的上一句",
			"rewind.fail": "回退失败: {error}",
			"rewind.once": "回退上一步",
					"rewind.once.hint": "撤回最后一步已进行的对话，新会话接上之前的上下文；那句回到输入框再发送",
			"rewind.round": "回退上一轮",
					"rewind.round.hint": "撤回上一整轮（含子代理）已进行的对话，新会话接上之前的上下文；那句回到输入框再发送",
			"hooksDeny.title": "Hooks 拦截",
			"hooksDeny.bypass": "放行 hooks 的 deny / ask（补丁 30 / 31 / 64 / 65）",
			"hooksDeny.hint": "关掉后，用户自己的 PreToolUse / UserPromptSubmit / Stop hook 的 deny 会按官方逻辑生效。官方 ask 分支本身是空操作，关开关不会弹出审批框。改完后点「应用」并重启才写进宿主。",
			"saved.hooksDeny": "已保存",
		};

		const en = {
			nav: "Rules",
			"dock.clean": "Clean",
			"dock.toggle": "dsh-breach",
			"dock.newSession": "dsh-breach",
			"updPill.label": "Update",
			"updPill.title": "New version available — click to see what changed",
			"updPill.busy": "Updating…",
			"updPill.fail": "Update failed",
			"updDialog.title": "Update available",
			"updDialog.version": "Version",
			"updDialog.now": "Update now",
			"updDialog.later": "Later",
			"updDialog.updating": "Updating…",
			"updDialog.noNotes": "This release ships without notes.",
			"dock.inSession": "dsh-breach",
			"dock.full": "Full view",
			"dock.close": "Collapse",
			"dock.unauthorized": "Unauthorized",
			"welcome.title": "User notice",
			"welcome.lead": "Please read this on first install. After you confirm, it will not appear again.",
			"welcome.warn": "This plugin is free and open source. Anyone who sells, resells, or profits from it behind the author's back may face legal action.",
			"welcome.body": "dsh-breach is a local DeepSeek Harness enhancement plugin: adjust prompts, patches and runtime policy on a machine you control. Free and non-profit.",
			"welcome.repo": "https://github.com/zhuchongba-01/dsh-breach",
			"welcome.ban1": "Do not use this project for unauthorized attacks, intrusion, data theft, sabotage, or any illegal activity.",
			"welcome.ban2": "Do not commercially sell, resell, or profit from gray-market use, or redistribute for profit without the author.",
			"welcome.ban3": "You must follow local law and platform rules; illegal use is solely your responsibility.",
			"welcome.bans": "Prohibitions",
			"welcome.check": "I have read and understand this notice and will use the plugin lawfully.",
			"welcome.ok": "I understand — continue",
			"theme.aria": "Appearance",
			"theme.white": "Light",
			"theme.ink": "Ink",
			"happy.title": "Patches",
			"override.title": "Prompt",
			"own.title": "Own servers",
			"own.hint": "One IP or exact hostname per line. account@host is accepted; the account only identifies that host. A hostname also allows the addresses it resolves to. Do not enter a key, a password, or a range.",
			"own.save": "Save list",
			"saved.own": "Own servers saved",
			"saved.own.dropped": "Saved. {n} lines were not a single IP or hostname and were dropped",
			"metric.happyd": "Written",
			"metric.happyd.skip": "Written. Skipped {n}; those files are not on this install",
			"metric.pendingShort": "Pending {n}",
			"metric.unmatchedShort": "No match {n}",
			"metric.skipShort": "Skipped {n}",
			"metric.unlocated.count": "—",
			"metric.shim": "shim",
			"metric.shim.na": "Not needed here",
			"metric.bak.yes": "Backup",
			"metric.bak.no": "No backup",
			"metric.bak.hint": "Backup",
			"table.patch": "Item",
			"table.status": "Status",
			"status.applied": "Applied",
			"status.off": "Off",
			"status.pending": "Pending",
			"status.unmatched": "No match",
			"status.skipped": "Skipped",
			"apply.hint": "If you did not edit the prompt box, do not save. The default is already used and is written to prompt-inject.md on start/apply. Save only after you change it. Apply writes host patches. Pending = original text still present. Skipped = not needed for this version or the component is not installed.",
			"warn.noRoot": "Could not find this host’s @deepseek-ai tree, so Apply will not patch anything. Fully quit and reopen this host, then Apply here. Desktop may live on any drive; folder names like DeepseekHarnessDesktop or DeepSeek Harness are fine.",
			"warn.noRoot.desktop": "Official Harness keeps its code in app.asar. Apply unpacks it and restarts the app. If this page stays “not found”, fully quit the client, reopen it, then Apply again. Third-party DSH Desktop: just Apply.",
			"unpack.restarting": "Patches are written. Click Restart and the client opens again by itself.",
			"restart.fullQuit": "Restarting. The client will open again by itself.",
			"warn.noInject": "Official mode always uses the default prompt. With a rule set active, only the rule set is used; otherwise the default prompt without the CTF section, followed by the rule steps. If both are empty you will be asked to add a prompt.",
			"need.prompt": "Both the prompt and the rule set are empty. Add a prompt, or enable a rule that has content.",
			"btn.restoreInject": "Reset default",
			"restore.title": "Restore default prompt",
			"restore.body": "Reset the prompt to the built-in default and write it to the host file now? Current edits will be overwritten.",
			"restore.confirm": "Restore",
			"restore.cancel": "Cancel",
			"saved.restoreInject": "Default prompt restored",
			"skip": "Skipped",
			"unknown": "Unknown",
			"delete": "Delete",
			"btn.apply": "Apply",
			"btn.apply.busy": "Working…",
			"btn.revert": "Restore",
			"btn.uninstall": "Uninstall",
			"btn.uninstall.busy": "Uninstalling…",
			"uninstall.title": "Uninstall dsh-breach",
			"uninstall.body": "Uninstall? This restores the original Harness and removes this plugin completely.",
			"uninstall.confirm": "Uninstall",
			"uninstall.cancel": "Cancel",
			"uninstall.applying": "Uninstalling and restoring…",
			"uninstall.done": "Uninstalled and restored. Restarting…",
			"uninstall.done.desktop": "Uninstalled and restored. Restarting the desktop app…",
			"uninstall.fail": "Uninstall failed: {error}",
			"channel.title": "Channel",
			"channel.stable": "Stable",
			"channel.beta": "Beta",
			"channel.useStable": "Switch to stable",
			"channel.useBeta": "Switch to beta",
			"channel.local": "This copy",
			"update.checking": "Checking for updates…",
			"update.applying": "Updating…",
			"update.switching": "Switching version…",
			"update.latest": "Up to date ({version})",
			"update.available": "Update {remote} available (now {local})",
			"update.pinned": "Pinned at {version}; channel latest is {remote}",
			"update.done": "Updated to {version}.",
			"update.restarting": "Restored the old patches, wrote the new ones, and restarting…",
			"update.fullQuit": "Patches are written. Click Restart and the client opens again by itself.",
			"restart.official.title": "Restart required",
			"restart.official.body": "Patches are written. Click Restart and the client opens again by itself.",
			"update.switched": "Switched to {version}.",
			"update.autoDone": "Auto-updated to {version}.",
			"update.reloading": "Refreshing settings…",
			"update.dirty": "Update available; local edits were not overwritten.",
			"update.fail": "Update failed: {error}",
			"update.timeout": "Check timed out. Click Check update again.",
			"update.needRestart": "Update API is not loaded. Restart dsh, then check again.",
			"update.switch": "Switch to this version",
			"update.pick": "Select version",
			"update.tip": "latest",
			"update.current": "current",
			"update.confirmSwitch": "Switch to {version}? You can switch back later. Uncommitted plugin edits will not be kept.",
			"update.confirmChannel": "Switch to {version}? The plugin will be reinstalled from that channel. Uncommitted plugin edits will not be kept.",
			"metric.version": "Version",
			"action.apply": "Apply",
			"action.revert": "Restore",
			"action.uninstall": "Uninstall",
			"ok.done": "Done",
			"err.action": "Failed: {error}",
			"err.status": "Read failed: {error}",
			"err.override": "Read failed: {error}",
			"err.read": "Read failed: {error}",
			"err.save": "Save failed: {error}",
			"btn.saveInject": "Save",
			"saved.override": "Saved",
			"ph.alias.short": "Name",
			"btn.restart": "Restart",
			"btn.restart.busy": "Restarting…",
			"restarting": "Restarting…",
			"restarting.desktop": "Restarting the desktop app…",
			"restart.timeout": "Timed out. If DSH is still open, quit it completely (tray → Quit); the plugin will finish replacing and restart on its own.",
			"restart.fail": "Failed: {error}",
			"restart.notStarted": "Core files are locked by DSH. Quit DSH completely (tray → Quit); the plugin will finish the rename and restart on its own — no need to press Apply again.",
			"restart.already": "This restart already started. It will not restart again.",
			"restart.confirm": "Apply finished. Restart to take effect.",
			"restart.confirm.desktop": "Apply finished. Restart the desktop app to take effect.",
			"restart.ask.title": "Restart now?",
			"restart.ask.body": "It is written. It takes effect in this client after a restart.",
			"restart.revert.title": "Restart now?",
			"restart.revert.body": "Patches reverted. A restart completes the rollback; click Apply again afterwards to re-apply.",
			"restart.now": "Restart now",
			"restart.notNow": "Later",
			"restart.asarSwap": "Patches are on disk. Quitting the desktop app and moving app.asar aside; it will reopen when done. If behavior is unchanged, fully quit Harness (including tray) and Apply again.",
			"surface.web": "Web",
			"surface.desktop": "Desktop",
			"surface.gui": "GUI",
			"surface.tui": "TUI",
			"restart.incomplete": "The prompt is in. {detail}",
			"restart.incomplete.patches": "{failed} code patch(es) did not match this host (#{ids}). The prompt is unaffected",
			"restart.incomplete.flash": "CMD silence not pinned ({entry})",
			"restart.later": "Later",
			"group.prompt": "Prompt",
			"group.code": "Code",
			"group.engine": "Engine",
			"group.tools": "Tools",
			"group.compat": "0.1.5 compat",
			"group.dsh20": "0.2.0",
			"ov.ok": "All good",
			"ov.loading": "Loading…",
			"ov.applied": "Applied",
			"ov.skipped": "Skipped",
			"ov.failed": "Failed",
			"ov.pending": "Pending",
			"ov.failN": "failed",
			"ov.pendingN": "to apply",
			"ov.notApplied": "Not applied",
			"ov.liveBad": "Patches not live: the host still reads app.asar",
			"ov.fullQuit": "Quit fully and swap the package",
			"ov.adaptN": "anchors to adapt",
			"ov.hostWarn": "Host version notice",
			"ov.groupDetail": "Patch groups",
			"ov.reapply": "Re-apply",
			"ov.view": "Filter",
			"ov.hostVerified": "verified",
			"ov.hostUnverified": "unverified",
			"tab.patches": "Patches",
			"tab.prompt": "Prompt",
			"tab.settings": "Settings",
			"grp.compat": "Compat",
			"grp.desc.prompt": "Identity strip · disclaimer & approval",
			"grp.desc.code": "Sandbox defaults · approval & hooks",
			"grp.desc.tools": "Shell & web tool descriptions",
			"grp.desc.compat": "Presets · OAuth & clean restart",
			"set.sysTitle": "Version & host control",
			"set.sysHint": "Check updates, restart the host process, or revert all patches and uninstall.",
			"set.checkUpdate": "Check updates",
			"set.restartHost": "Restart host",
			"set.ownEdit": "Edit allowlist",
			"set.ownClose": "Collapse",
			"ov.skippedHint": "Skipped",
			"ov.allApplied": "Nothing skipped",
			"ov.showDetail": "Details ›",
			"ov.hideDetail": "Hide details ˅",
			"patch.1": "Global disclaimer → mandate",
			"patch.2": "Replacement disclaimer → mandate",
			"patch.3": "Scope disclaimer → mandate",
			"patch.4": "Persona session mandate",
			"patch.5": "Approval copy → full access",
			"patch.6": "Sandbox deny → allow write",
			"patch.7": "Sandbox default full access",
			"patch.8": "Approval default never",
			"patch.9": "Approval gate auto-grant",
			"patch.10": "Approval config default never",
			"patch.11": "never copy → auto-grant",
			"patch.12": "ask copy → auto-grant",
			"patch.13": "Escalation ladder exempt",
			"patch.14": "Escalation unconditional grant",
			"patch.15": "Sandbox confine passthrough",
			"patch.16": "Filesystem fence off",
			"patch.17": "Observation policy allow R/W",
			"patch.18": "Repeat-call guard off",
			"patch.19": "Tool-result pruner off",
			"patch.21": "Restore plugin-raised bash wait",
			"patch.22": "read cap raised",
			"patch.23": "subagent depth 3 → 10",
			"patch.24": "preset fetch on",
			"patch.25": "Strip official default identity (keep feature prompts)",
			"patch.26": "minimal: strip identity, open inject",
			"patch.28": "dsh-liangshen: keep dsh-breach / dshhappy in phase-1",
			"patch.70": "Minimal shell drops the no-network line",
			"patch.71": "Liangshen drops the stock identity line",
			"patch.29": "dsh-tool-web: untrusted framing → usable data",
			"patch.30": "dsh-hooks-claude-code: deny→allow",
			"patch.31": "dsh-hooks-codex: deny→allow",
			"patch.32": "Web surface identity neutral",
			"patch.33": "Shell denial prompt → executable",
			"patch.34": "Sandbox hint neutralized",
			"patch.35": "Escalation never-reject",
			"patch.36": "FS escalation schema opened",
			"patch.37": "Subagent scope lock neutralized",
			"patch.38": "persona text→prefix (0.1.2 presets)",
			"patch.39": "session v0 plugin summary (mnemon)",
			"patch.40": "Keep inject when a complete prompt is set",
			"patch.42": "Settings legacy API",
			"patch.43": "Strip identity from web presets",
			"patch.45": "Official desktop update handoff",
			"patch.46": "Official update script stays ASCII",
			"patch.47": "OAuth no longer inserts Claude identity",
			"patch.48": "Shell drops extra delete caution",
			"patch.49": "OAuth no longer mimics claude-cli",
			"patch.50": "Session references are not marked untrusted",
			"patch.51": "Fresh session stays on full access",
			"patch.52": "Session log upload off by default",
			"patch.53": "Web prompt drops do-not-start",
			"patch.54": "Deliverable prompt drops extra prohibition",
			"patch.55": "Replace the first system prompt every step",
			"patch.56": "Rewind hides only the cut range",
			"patch.57": "developer role for openai/azure only, third-party gateways use system",
			"patch.58": "Rewind markers stay off the model request",
			"patch.59": "Official Auto Review no longer denies tools",
			"patch.60": "Official run_code drops approval teaching",
			"patch.61": "Official sandbox policy no longer teaches refusal",
			"patch.62": "Fail-open without approval channel (user reject kept)",
			"patch.63": "Plan mode no longer soft-blocks execution",
			"patch.64": "Stop hook no longer steers fake user text",
			"patch.65": "UserPromptSubmit deny no longer rejects turn",
			"patch.66": "Empty system section no longer ends the turn as an internal error",
			"patch.67": "A missing messages list no longer ends the turn",
			"patch.68": "Missing content after rewind no longer ends the turn",
			"patch.69": "deepseek-flash keeps the official in-history flag",
			"patch.72": "Messages system field uses the current system prompt",
			"patch.73": "Minimal preset drops stray mirror sentence",
			"patch.74": "Start/apply writes the default prompt to prompt-inject.md",
			"patch.75": "Rewind resets completed todos to pending",
			"patch.76": "Unrestricted preset: strip identity sentence",
			"patch.77": "Rewind marker drops already-sent messages",
			"patch.78": "Restore missing overlay from .bak backup",
			"patch.80": "Restore official minimal tool plugins",
			"patch.82": "Fallback DSH_PROFILE=desktop in main process",
			"patch.83": "Don't fail on signal kill (no crash dialog)",
			"patch.84": "Don't fail on code=0 clean exit (no stopped dialog)",
			"patch.85": "prompt() steer stays interrupt, not followup",
			"patch.86": "Queue steer stays steer; public steer() stays next-step",
			"patch.87": "First assemble uses the systemPrompt prepare returned",
			"patch.88": "Drop the hang after renderPrompt; inject is assemble only",
			"status.na": "Not for this host",
			"metric.sealed": "Official client found. Apply to unpack",
			"metric.sealed.count": "Sealed",
			"metric.lost": "Patches lost — Apply again",
			"metric.lost.count": "Lost",
			"status.unlocated": "Not located",
			"metric.unlocated": "This install was not found yet",
			"rewind.label": "Undo",
			"rewind.aria": "Undo",
			"rewind.busy": "Undoing…",
			"rewind.empty": "Nothing to undo",
			"rewind.fail": "Undo failed: {error}",
			"rewind.once": "Undo last step",
					"rewind.once.hint": "Withdraw the last step into a new session that keeps earlier context; the line returns to the box",
			"rewind.round": "Undo last turn",
					"rewind.round.hint": "Withdraw the last turn (and its subagents) into a new session that keeps earlier context; the line returns to the box",
			"hooksDeny.title": "Hook interception",
			"hooksDeny.bypass": "Bypass hook deny / ask (patches 30 / 31 / 64 / 65)",
			"hooksDeny.hint": "When off, your own PreToolUse / UserPromptSubmit / Stop hook deny runs as the official host wrote it. The official ask branch is a no-op; turning this off will not show an approval dialog. Click Apply and restart to write the host files.",
			"saved.hooksDeny": "Saved",
		};

		const HAPPY_CSS = `
.dshp-root{--dshp-display:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif;--dshp-sans:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif;--dshp-mono:ui-monospace,"Cascadia Mono",Consolas,"Courier New",monospace;--dshp-led:#22C55E;--dshp-ease:cubic-bezier(.16,1,.3,1);max-width:920px;display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:12px;background:var(--dshp-bg);color:var(--dshp-ink);font-family:var(--dshp-sans)}
.dshp-root{--dshp-bg:transparent;--dshp-paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fdfdff) 74%,transparent);--dshp-ink:var(--dsw-alias-label-primary,#16202e);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#16202e) 76%,var(--dsw-alias-label-secondary,#5b6b7e));--dshp-line:color-mix(in srgb,var(--dsw-alias-border-l1,#dce8fa) 78%,transparent);--dshp-fill:color-mix(in srgb,var(--dsw-alias-brand-primary,#1783FF) 10%,transparent);--dshp-accent:var(--dsw-alias-brand-primary,#1783FF);--dshp-accent-soft:color-mix(in srgb,var(--dsw-alias-brand-primary,#1783FF) 14%,transparent);--dshp-ok:#4F8F6B;--dshp-warn:#A9762F;--dshp-bad:#BE7A72;--cd-bg:#FFFFFF;--cd-field:#FFFFFF;--cd-line:#E4ECF7;--cd-line-soft:#EFF4FC;--cd-line-dim:#F3F8FE;--cd-line-btn:#DCE7F3;--cd-ink:#16202E;--cd-ink2:#2E3B4C;--cd-mute:#5B6B7E;--cd-faint:#7C8B9E;--cd-hover:#F3F8FE;--cd-hover2:#EDF3FA;--cd-focus:#C3D8F2;--cd-code:#F4F8FD;--cd-ok:#4F8F6B;--cd-bad:#BE7A72;--cd-warn:#A9762F;--cd-off:#CFDAE6;--cd-track:#DDE7F2;--cd-knob:#FFFFFF}
.dshp-root[data-theme="white"]{color-scheme:light;background:#FFFFFF;--dshp-paper:#F7FAFE;--dshp-line:#E4EDF7}
.dshp-root[data-theme="dusk"]{color-scheme:dark;background:#211F1C;--dshp-paper:#26231F;--dshp-line:#332F29;--dshp-ok:#748B6F;--dshp-warn:#e4c48a;--dshp-bad:#f0b4b4}
/* 深色令牌：宿主切深色（body 属性）或本地判定为 dusk 时同时生效，
   概览面板 / 明细 / 提示词·规则·Skill 卡片 / 开关全部跟着走。 */
body[data-ds-dark-theme] .dshp-root,.dshp-root[data-theme="dusk"]{--cd-bg:#26231F;--cd-field:#1B1917;--cd-line:#332F29;--cd-line-soft:#2C2925;--cd-line-dim:#2A2724;--cd-line-btn:#3A352E;--cd-ink:#EFEBE2;--cd-ink2:#DDD8CD;--cd-mute:#9A948A;--cd-faint:#7A756B;--cd-hover:#2E2B26;--cd-hover2:#2B2824;--cd-focus:#6B6154;--cd-code:#2A2724;--cd-ok:#8FB389;--cd-bad:#F85149;--cd-warn:#E4C48A;--cd-off:#55504A;--cd-track:#3A352E;--cd-knob:#EFEBE2}
.dshp-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.dshp-switch{display:inline-flex;border:1px solid var(--dshp-line);border-radius:999px;overflow:hidden;background:var(--dshp-paper)}
.dshp-switch button{appearance:none;border:0;background:transparent;color:var(--dshp-mute);font:12px/1 var(--dshp-sans);padding:6px 14px;cursor:pointer}
.dshp-switch button.is-on{background:var(--dshp-accent-soft);color:var(--dshp-ink)}
.dshp-switch button:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:-2px}
.dshp-panel{border:1px solid var(--dshp-line);background:var(--dshp-paper);border-radius:10px;padding:18px 18px 16px}
.dshp-kicker{font-family:var(--dshp-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dshp-mute);margin:0 0 4px}
.dshp-title{font-family:var(--dshp-display);font-size:20px;font-weight:500;letter-spacing:.02em;line-height:1.3;margin:0;color:var(--dshp-ink)}
.dshp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.dshp-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:20px 0 10px}
.dshp-sub h4{margin:0;font-family:var(--dshp-display);font-size:15px;font-weight:500}
.dshp-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}
.dshp-metric{border:1px solid var(--dshp-line);background:var(--dshp-bg);padding:12px;min-height:68px;display:flex;flex-direction:column;gap:4px;border-radius:8px}
.dshp-metric b{font-family:var(--dshp-display);font-size:18px;font-weight:500;line-height:1.2}
.dshp-metric span{font-size:11px;color:var(--dshp-mute)}
.dshp-bar{height:3px;border-radius:99px;background:var(--dshp-line);overflow:hidden;margin:8px 0 14px}
.dshp-bar>i{display:block;height:100%;background:var(--dshp-accent);width:0;transition:width .4s var(--dshp-ease)}
.dshp-group{border:1px solid var(--dshp-line);margin:0 0 8px;background:var(--dshp-bg);border-radius:8px;overflow:hidden}
.dshp-group-h{width:100%;display:flex;align-items:center;gap:10px;padding:9px 12px;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}
.dshp-group-h:hover{background:var(--dshp-fill)}
.dshp-group-h:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:-2px}
.dshp-group-h strong{font-family:var(--dshp-display);font-size:14px;font-weight:500}
.dshp-group-h em{font-style:normal;font-size:12px;color:var(--dshp-mute);flex:1}
.dshp-count{font-family:var(--dshp-mono);font-size:12px;color:var(--dshp-mute)}
.dshp-table{width:100%;border-collapse:collapse;font-size:12.5px}
.dshp-table th{text-align:left;font-weight:500;font-size:11px;letter-spacing:.06em;color:var(--dshp-mute);padding:7px 12px;border-bottom:1px solid var(--dshp-line)}
.dshp-table td{padding:8px 12px;border-bottom:1px solid var(--dshp-line);vertical-align:middle}
.dshp-table tr:last-child td{border-bottom:0}
.dshp-table tr.is-on td{background:var(--dshp-accent-soft)}
.dshp-id{font-family:var(--dshp-mono);opacity:.75;width:42px}
.dshp-actions{text-align:right;white-space:nowrap}
.dshp-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dshp-row+.dshp-row{margin-top:10px}
.dshp-pill{display:inline-flex;align-items:center;gap:6px;font-family:var(--dshp-mono);font-size:11px;padding:2px 8px;border:1px solid var(--dshp-line);border-radius:99px;line-height:1.6;background:var(--dshp-bg)}
.dshp-pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.dshp-pill.is-ok{color:var(--dshp-ok);border-color:color-mix(in srgb,var(--dshp-ok) 30%,var(--dshp-line))}
.dshp-pill.is-wait{color:var(--dshp-warn);border-color:color-mix(in srgb,var(--dshp-warn) 30%,var(--dshp-line))}
.dshp-pill.is-miss{color:var(--dshp-mute)}
.dshp-pill.is-bad{color:var(--dshp-bad)}
.dshp-btn{appearance:none;font-family:var(--dshp-sans);font-size:13px;font-weight:500;min-height:34px;padding:0 14px;border-radius:8px;border:1px solid transparent;cursor:pointer;transition:background .15s var(--dshp-ease),opacity .15s var(--dshp-ease)}
.dshp-btn:disabled{opacity:.45;cursor:not-allowed}
.dshp-btn:focus-visible{outline:2px solid var(--dshp-accent);outline-offset:2px}
.dshp-btn-primary{background:var(--dshp-accent-soft);color:var(--dshp-ink);border-color:color-mix(in srgb,var(--dshp-accent) 35%,var(--dshp-line))}
.dshp-btn-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dshp-accent) 22%,var(--dshp-bg))}
.dshp-btn-ghost{background:transparent;color:var(--dshp-ink);border-color:var(--dshp-line)}
.dshp-btn-danger{background:transparent;color:var(--dshp-bad);border-color:color-mix(in srgb,var(--dshp-bad) 40%,var(--dshp-line))}
.dshp-btn-solid-danger{background:color-mix(in srgb,var(--dshp-bad) 16%,var(--dshp-bg));color:var(--dshp-bad);border-color:color-mix(in srgb,var(--dshp-bad) 30%,var(--dshp-line))}
.dshp-btn-tiny{min-height:28px;padding:0 10px;font-size:12px}
.dshp-field,.dshp-area{width:100%;box-sizing:border-box;font:13px/1.55 var(--dshp-mono);padding:8px 10px;background:var(--dshp-bg);color:var(--dshp-ink);border:1px solid var(--dshp-line);border-radius:8px}
.dshp-field{width:auto;min-width:140px}
.dshp-cr-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0 0;font-size:13px}
.dshp-cr-row label{display:inline-flex;align-items:center;gap:6px;color:var(--dshp-ink)}
.dshp-cr-num{width:64px;min-width:64px;height:28px;padding:0 8px}
.dshp-cr-text{width:120px;min-width:88px;height:28px;padding:0 8px}
.dshp-ver{width:100%;min-width:0;max-width:none;height:32px;padding:0 10px;font-size:12px}
.dshp-rel{margin:0 0 14px}
.dshp-now{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:0 0 4px}
.dshp-now-label{font-family:var(--dshp-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--dshp-mute)}
.dshp-now-ver{font-family:var(--dshp-display);font-size:20px;font-weight:500;letter-spacing:.01em}
.dshp-now-mark{display:inline-flex;align-items:center;margin-left:6px;padding:1px 7px;border-radius:99px;font-family:var(--dshp-mono);font-size:11px;font-style:normal;font-weight:500;line-height:1.5;color:var(--dshp-ok);border:1px solid color-mix(in srgb,var(--dshp-ok) 38%,var(--dshp-line));background:color-mix(in srgb,var(--dshp-ok) 14%,var(--dshp-bg))}
.dshp-editions{display:flex;flex-direction:column;margin:10px 0 0;border-top:1px solid var(--dshp-line)}
.dshp-edition{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--dshp-line)}
.dshp-edition-name{display:inline-flex;align-items:center;gap:0;font-family:var(--dshp-display);font-size:15px;font-weight:500;white-space:nowrap}
.dshp-edition.is-on .dshp-edition-name{color:var(--dshp-ink)}
.dshp-edition:not(.is-on) .dshp-edition-name{color:var(--dshp-mute)}
.dshp-edition .dshp-btn{min-width:118px}
.dshp-rel .dshp-notice{display:block;margin-top:8px;min-height:16px}
@media (max-width:560px){.dshp-edition{grid-template-columns:1fr auto;grid-template-areas:"name btn" "sel sel"}.dshp-edition-name{grid-area:name}.dshp-edition .dshp-ver{grid-area:sel}.dshp-edition .dshp-btn{grid-area:btn}}
.dshp-area{min-height:220px;resize:vertical}
.dshp-field:focus,.dshp-area:focus{outline:none;border-color:var(--dshp-accent);box-shadow:0 0 0 3px var(--dshp-accent-soft)}
.dshp-field:disabled,.dshp-area:disabled{opacity:.5}
.dshp-ask{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding:10px 12px;border:1px solid var(--dshp-line);border-radius:8px;background:var(--dshp-bg);font-size:13px}
.dshp-modal-bg{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:color-mix(in srgb,var(--dshp-ink) 28%,transparent)}
.dshp-modal{width:min(420px,100%);background:var(--dshp-paper);color:var(--dshp-ink);border:1px solid var(--dshp-line);border-radius:12px;padding:20px 20px 16px;box-shadow:0 16px 40px color-mix(in srgb,var(--dshp-ink) 18%,transparent)}
.dshp-modal h4{margin:0 0 8px;font-family:var(--dshp-display);font-size:18px;font-weight:500}
.dshp-modal p{margin:0 0 16px;font-size:13.5px;line-height:1.55}
.dshp-modal-ops{display:flex;justify-content:flex-end;gap:8px}
.dshp-notice{font-size:12.5px;line-height:1.4}
.dshp-notice.is-ok{color:var(--dshp-ok)}
.dshp-notice.is-bad{color:var(--dshp-bad)}
.dshp-skel{height:12px;border-radius:6px;background:linear-gradient(90deg,var(--dshp-fill),var(--dshp-line),var(--dshp-fill));background-size:200% 100%;animation:dshp-pulse 1.2s ease-in-out infinite}
.dshp-active{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin-bottom:12px;border:1px solid var(--dshp-line);background:var(--dshp-bg);border-radius:8px}
.dshp-active b{font-family:var(--dshp-display);font-weight:500}
.dshp-empty{padding:28px 12px;font-size:13px;color:var(--dshp-mute);text-align:center}
.dshp-split{display:flex;flex-direction:column;gap:12px}
.dshp-create{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-top:1px solid var(--dshp-line);background:var(--dshp-paper)}
.dshp-create-row{display:flex;gap:6px;align-items:center}
.dshp-create .dshp-field{flex:1;min-width:0;width:auto}
.dshp-editor{display:flex;flex-direction:column;gap:10px;min-width:0;border:1px solid var(--dshp-line);border-radius:8px;background:var(--dshp-bg);padding:12px;min-height:320px}
.dshp-editor .dshp-area{flex:1;min-height:240px}
.dshp-editor-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dshp-mute);font-size:13px;min-height:160px}
.dshp-block{padding:14px 0;border-top:1px solid var(--dshp-line)}
.dshp-block-head{display:flex;align-items:center;gap:10px;margin:0 0 8px}
.dshp-block-head h4{margin:0;font-family:var(--dshp-display);font-size:14px;font-weight:500;flex:1;color:var(--dshp-ink)}
.dshp-block-hint{margin:8px 0 0;font-size:12px;line-height:1.55;color:var(--dshp-mute)}
.dshp-policy-row{display:flex;align-items:center;gap:10px}
.dshp-policy-row>label{font-size:12px;color:var(--dshp-mute);flex:0 0 auto}
.dshp-cwd-path{margin:0 0 8px;font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute);word-break:break-all;line-height:1.5}
.dshp-cwd-list{display:flex;flex-direction:column;border:1px solid var(--dshp-line);border-radius:8px;background:var(--dshp-bg);overflow:hidden}
.dshp-cwd-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid var(--dshp-line);cursor:pointer;margin:0}
.dshp-cwd-item:last-child{border-bottom:0}
.dshp-cwd-item:hover{background:var(--dshp-fill)}
.dshp-cwd-item.is-on{background:var(--dshp-accent-soft)}
.dshp-cwd-item input{margin:3px 0 0;flex:0 0 auto}
.dshp-cwd-main{flex:1;min-width:0}
.dshp-cwd-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:var(--dshp-display);font-size:13.5px;line-height:1.35;color:var(--dshp-ink)}
.dshp-cwd-badge{font-family:var(--dshp-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;padding:1px 7px;border-radius:99px;border:1px solid var(--dshp-line);color:var(--dshp-mute);line-height:1.6}
.dshp-cwd-size{font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute)}
.dshp-cwd-sub{margin-top:3px;font-family:var(--dshp-mono);font-size:11px;color:var(--dshp-mute);word-break:break-all}
.dshp-cwd-prev{margin-top:4px;font-size:11px;line-height:1.5;color:var(--dshp-mute);max-height:34px;overflow:hidden}
@keyframes dshp-pulse{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (max-width:640px){.dshp-metrics{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.dshp-btn,.dshp-bar>i{transition:none}.dshp-skel{animation:none}}

.dshp-dock{position:fixed;top:12px;right:12px;z-index:10050;display:flex;flex-direction:column;width:var(--dshp-dock-w,580px);height:auto;max-height:var(--dshp-dock-h,74vh);min-width:390px;min-height:280px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);box-sizing:border-box;border-radius:12px;pointer-events:auto;overflow:hidden;font-family:"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",system-ui,sans-serif;font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased;text-shadow:none}
.dshp-dock[data-open="0"]{display:none}
/* 方案 B：深石墨撞色顶栏 + 云灰底壳 + 纯白内胆（主面板、弹窗、菜单统一令牌） */
.dshp-dock[data-theme="white"],.dshp-b-mask[data-theme="white"],.dshp-rewind-menu[data-theme="white"]{
  --dk-bg:#F1F4F9;--dk-head:#1B2230;--dk-head-ink:#F8FAFC;--dk-head-mute:#94A3B8;--dk-head-pill:rgba(255,255,255,.12);
  --dk-card:#FFFFFF;--dk-bd:#94A3B8;--dk-sub-bd:#DCE3EE;--dk-ink:#0F172A;--dk-mute:#526277;--dk-faint:#64748B;
  --dk-chip:#E2E8F0;--dk-chip-hover:#CBD5E1;--dk-primary:#2563EB;--dk-primary-hover:#1D4ED8;
  --dk-ok:#16A34A;--dk-warn:#D97706;--dk-bad:#DC2626;--dshp-ink:#0F172A;--dshp-mute:#526277;
}
body[data-ds-dark-theme] .dshp-dock,.dshp-dock[data-theme="dusk"],body[data-ds-dark-theme] .dshp-b-mask,.dshp-b-mask[data-theme="dusk"],body[data-ds-dark-theme] .dshp-rewind-menu,.dshp-rewind-menu[data-theme="dusk"]{
  --dk-bg:#161922;--dk-head:#0F1219;--dk-head-ink:#F1F5F9;--dk-head-mute:#94A3B8;--dk-head-pill:rgba(255,255,255,.09);
  --dk-card:#202533;--dk-bd:#363E52;--dk-sub-bd:#2C3345;--dk-ink:#F1F5F9;--dk-mute:#94A3B8;--dk-faint:#7C879B;
  --dk-chip:#2A3142;--dk-chip-hover:#353E54;--dk-primary:#3B82F6;--dk-primary-hover:#2563EB;
  --dk-ok:#22C55E;--dk-warn:#F59E0B;--dk-bad:#EF4444;--dshp-ink:#F1F5F9;--dshp-mute:#94A3B8;
}
.dshp-dock[data-theme="white"]{
  background:var(--dk-bg)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border:1px solid var(--dk-bd)!important;color:var(--dk-ink)!important;
  box-shadow:0 24px 52px -10px rgba(15,23,42,.26),0 6px 16px rgba(15,23,42,.10),0 0 0 1px rgba(15,23,42,.05)!important;
}
body[data-ds-dark-theme] .dshp-dock,.dshp-dock[data-theme="dusk"]{
  background:var(--dk-bg)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border:1px solid var(--dk-bd)!important;color:var(--dk-ink)!important;
  box-shadow:0 26px 58px -8px rgba(0,0,0,.56),0 8px 20px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.06)!important;
}
.dshp-dock-head,.dshp-dock-body{position:relative;z-index:2}
.dshp-launch{position:fixed;right:16px;bottom:16px;z-index:10040;appearance:none;display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border:1px solid #334155;border-radius:999px;background:#1B2230;color:#F8FAFC;cursor:pointer;font:600 12.5px/1 "Segoe UI","Microsoft YaHei UI","PingFang SC",system-ui,sans-serif;box-shadow:0 12px 28px rgba(15,23,42,.32),0 2px 6px rgba(15,23,42,.16);pointer-events:auto;transition:transform .14s,border-color .14s,background .14s}
.dshp-launch svg{width:14px;height:14px;color:#3B82F6;flex:none}
.dshp-launch:hover{background:#232C3D;border-color:#3B82F6;transform:translateY(-1px)}
.dshp-launch[data-open="1"],.dshp-launch[data-hide="1"]{display:none}
.dshp-dock .dshp-dock-head{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--dk-head)!important;color:var(--dk-head-ink)!important;border-bottom:1px solid rgba(255,255,255,.08);cursor:grab;user-select:none;touch-action:none;border-radius:11px 11px 0 0}
.dshp-dock .dshp-dock-head:active{cursor:grabbing}
.dshp-dock .dshp-dock-brand{display:inline-flex;align-items:center;gap:7px;min-width:0}
.dshp-dock .dshp-dock-brand svg{width:15px;height:15px;color:#3B82F6;flex:none}
.dshp-dock .dshp-dock-head b{font-size:13.5px;font-weight:650;letter-spacing:-.2px;color:var(--dk-head-ink)!important;text-shadow:none!important}
.dshp-dock-ver{font-family:var(--dshp-mono,ui-monospace,Consolas,monospace);font-size:11px;font-weight:500;padding:1px 6px;border-radius:5px;background:var(--dk-head-pill);color:var(--dk-head-mute)!important;letter-spacing:.01em}
.dshp-head-tabs{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dk-head-pill)}
.dshp-head-tab{appearance:none;border:0!important;background:transparent!important;color:var(--dk-head-mute)!important;padding:3px 10px!important;border-radius:6px!important;font:500 11.5px/1.4 inherit!important;cursor:pointer;transition:background .14s,color .14s;white-space:nowrap}
.dshp-head-tab:hover{color:var(--dk-head-ink)!important}
.dshp-head-tab.on{background:var(--dk-card)!important;color:var(--dk-ink)!important;font-weight:650!important;box-shadow:0 1px 2px rgba(0,0,0,.18)}
.dshp-head-close{appearance:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0!important;border:0!important;border-radius:6px!important;background:transparent!important;color:var(--dk-head-mute)!important;cursor:pointer;transition:background .14s,color .14s}
.dshp-head-close:hover{background:rgba(255,255,255,.14)!important;color:var(--dk-head-ink)!important}
.dshp-dock-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;background:var(--dk-bg);border-radius:0 0 11px 11px}
.dshp-dock-body .dshp-root{max-width:none;height:auto;max-height:100%;flex:1;min-height:0;overflow:auto;padding:12px;gap:10px;background:transparent!important;color:var(--dk-ink)!important}
.dshp-dock-resize,.dshp-dock-resize-l,.dshp-dock-resize-r,.dshp-dock-resize-b{position:absolute;z-index:60;pointer-events:auto;touch-action:none}
.dshp-dock-resize{right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:transparent}
.dshp-dock-resize::after{content:"";position:absolute;right:4px;bottom:4px;width:6px;height:6px;border-right:2px solid var(--dk-faint,#64748B);border-bottom:2px solid var(--dk-faint,#64748B);opacity:.45;border-radius:0 0 2px 0}
.dshp-dock-resize:hover::after{opacity:.9}
.dshp-dock-resize-l{left:0;top:38px;bottom:0;width:6px;cursor:ew-resize;background:transparent}
.dshp-dock-resize-r{right:0;top:38px;bottom:16px;width:6px;cursor:ew-resize;background:transparent}
.dshp-dock-resize-b{left:6px;right:16px;bottom:0;height:6px;cursor:ns-resize;background:transparent}
/* 方案 B 通用模态弹窗（更新确认 / 用户须知 / 重启确认 / 危险操作确认） */
.dshp-b-mask{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.50);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:auto;font-family:"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",system-ui,sans-serif;font-size:13px;line-height:1.55;-webkit-font-smoothing:antialiased}
.dshp-b-dialog{width:min(520px,94vw);max-height:min(84vh,720px);display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:var(--dk-bg,#F1F4F9);color:var(--dk-ink,#0F172A);border:1px solid var(--dk-bd,#94A3B8);box-shadow:0 26px 58px -10px rgba(15,23,42,.34),0 8px 20px rgba(15,23,42,.16)}
body[data-ds-dark-theme] .dshp-b-dialog,.dshp-b-mask[data-theme="dusk"] .dshp-b-dialog{box-shadow:0 28px 62px -8px rgba(0,0,0,.64),0 10px 24px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.06)}
.dshp-b-dialog.sm{width:min(420px,94vw)}
.dshp-b-dialog.lg{width:min(560px,94vw)}
.dshp-b-dlg-head{display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--dk-head,#1B2230);color:var(--dk-head-ink,#F8FAFC);border-bottom:1px solid rgba(255,255,255,.08);user-select:none}
.dshp-b-dlg-head svg.brand{width:15px;height:15px;color:#3B82F6;flex:none}
.dshp-b-dlg-title{font-size:13.5px;font-weight:650;letter-spacing:-.2px;color:var(--dk-head-ink,#F8FAFC);margin:0}
.dshp-b-dlg-pill{font-family:var(--dshp-mono,ui-monospace,Consolas,monospace);font-size:11px;font-weight:600;padding:1.5px 7px;border-radius:5px;background:var(--dk-head-pill,rgba(255,255,255,.12));color:#93C5FD;letter-spacing:.01em}
.dshp-b-dlg-body{padding:12px 13px;display:flex;flex-direction:column;gap:10px;overflow:auto;min-height:0;background:var(--dk-bg,#F1F4F9)}
.dshp-b-dlg-lead{font-size:12px;color:var(--dk-mute,#526277);line-height:1.5;margin:0}
.dshp-b-scroll{max-height:min(42vh,310px);overflow:auto;padding:11px 13px;border-radius:10px;background:var(--dk-card,#FFFFFF);border:1px solid var(--dk-sub-bd,#DCE3EE);color:var(--dk-ink,#0F172A);font-size:12.5px;line-height:1.65;word-break:break-word}
.dshp-b-scroll h3{margin:12px 0 4px;font-size:12.5px;font-weight:700;color:var(--dk-ink,#0F172A)}
.dshp-b-scroll h3:first-child{margin-top:0}
.dshp-b-scroll p{margin:0 0 7px;color:var(--dk-ink,#0F172A)}
.dshp-b-scroll p:last-child{margin-bottom:0}
.dshp-b-scroll a{color:var(--dk-primary,#2563EB);text-decoration:none;font-weight:500}
.dshp-b-scroll a:hover{text-decoration:underline}
.dshp-b-notes-h2{font-size:13px;font-weight:700;color:var(--dk-ink,#0F172A);margin:0 0 6px;padding-bottom:6px;border-bottom:1px solid var(--dk-sub-bd,#DCE3EE)}
.dshp-b-notes-h3{display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px;background:rgba(37,99,235,.12);color:var(--dk-primary,#2563EB);margin:8px 0 4px}
.dshp-b-notes-li{position:relative;padding-left:13px;margin:3px 0;color:var(--dk-ink,#0F172A);font-size:12.5px;line-height:1.62}
.dshp-b-notes-li::before{content:"";position:absolute;left:2px;top:8px;width:4.5px;height:4.5px;border-radius:999px;background:var(--dk-primary,#2563EB)}
.dshp-b-code{font-family:var(--dshp-mono,ui-monospace,Consolas,monospace);font-size:11.5px;padding:1px 5px;margin:0 1px;border-radius:4px;background:var(--dk-bg,#F1F4F9);border:1px solid var(--dk-sub-bd,#DCE3EE);color:var(--dk-ink,#0F172A)}
.dshp-b-check{display:flex;align-items:flex-start;gap:8px;padding:9px 11px;border-radius:9px;background:var(--dk-card,#FFFFFF);border:1px solid var(--dk-sub-bd,#DCE3EE);font-size:12px;color:var(--dk-ink,#0F172A);cursor:pointer;user-select:none}
.dshp-b-check input{margin:2.5px 0 0;accent-color:var(--dk-primary,#2563EB);cursor:pointer}
.dshp-b-dlg-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:9px 13px;background:var(--dk-card,#FFFFFF);border-top:1px solid var(--dk-sub-bd,#DCE3EE)}
.dshp-b-btn.danger-solid{background:var(--dk-bad,#DC2626);border-color:var(--dk-bad,#DC2626);color:#fff}
.dshp-b-btn.danger-solid:hover:not(:disabled){opacity:.9}
.dshp-icon-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#2563EB) 45%,transparent);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;font:13px/1 inherit;white-space:nowrap;flex:0 0 auto}
.dshp-icon-btn:hover{border-color:var(--dsw-alias-brand-primary,#2563EB);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#2563EB) 12%,transparent);color:var(--dsw-alias-label-primary,currentColor)}
.dshp-icon-btn.on{border-color:var(--dsw-alias-brand-primary,#2563EB);color:var(--dsw-alias-brand-primary,#2563EB);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#2563EB) 16%,transparent)}
.dshp-hbtn{appearance:none;display:inline-flex;flex:0 0 auto;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#2563EB) 55%,transparent);background:transparent;color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;font:12px/1 inherit;padding:5px 10px;border-radius:8px;white-space:nowrap}
.dshp-live-dot{width:6px;height:6px;border-radius:999px;flex:none;background:var(--dshp-led,#22C55E);box-shadow:0 0 0 2px color-mix(in srgb,var(--dshp-led,#22C55E) 22%,transparent)}
.dshp-hero-chip{display:inline-flex;align-items:center;gap:2px;flex:0 0 auto;align-self:center}
.dshp-hero-chip-btn{appearance:none;display:inline-flex;align-items:center;gap:4px;min-height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,7px);background:transparent;color:color-mix(in srgb,var(--dsw-alias-label-primary,currentColor) 88%,transparent);cursor:pointer;font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;transition:background .15s,color .15s}
.dshp-hero-chip-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-label-primary,currentColor)}
.dshp-hero-chip-btn.on{color:var(--dsw-alias-brand-primary,#2563EB)}
.dshp-hero-chip-icon{width:16px;height:16px;flex:none;color:inherit}
.dshp-hero-chip-btn.on .dshp-hero-chip-icon{color:var(--dsw-alias-brand-primary,#2563EB)}
.dshp-hero-chip-chev{width:14px;height:14px;flex:none;display:inline-grid;place-items:center;color:var(--dsw-alias-label-tertiary,#8b8f95);pointer-events:none}
.dshp-update-pill{appearance:none;display:inline-flex;align-items:center;height:20px;padding:0 8px;border:0;border-radius:999px;background:#16A34A;color:#fff;font:11.5px/1 inherit;font-weight:600;letter-spacing:.2px;cursor:pointer;white-space:nowrap;transition:background .15s}
.dshp-update-pill:hover{background:#15803D}
.dshp-update-pill:disabled{opacity:.65;cursor:default}
.dshp-update-pill.is-bad{background:#DC2626}
.dshp-tab-chip{display:inline-flex;align-items:flex-end;flex:0 0 auto}
.dshp-tab-btn{appearance:none;position:relative;border:none;background:transparent;cursor:pointer;padding:0 0 9px;font:500 13px/16px inherit;color:var(--dsw-alias-label-tertiary,currentColor);white-space:nowrap}
.dshp-tab-btn:hover{color:var(--dsw-alias-label-primary,currentColor)}
.dshp-tab-btn.on{color:var(--dsw-alias-brand-primary,#2563EB)}
.dshp-tab-btn.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary,#2563EB)}
/* [dsh-breach] 明细面板（新设计） */
.dshp-dt{margin-top:14px;padding-top:12px;border-top:1px solid var(--cd-line-soft)}
.dshp-dt-head{display:flex;align-items:center;gap:7px;margin-bottom:10px}
.dshp-dt-title{font-size:12.5px;font-weight:650;color:var(--cd-ink)}
.dshp-dt-chip{appearance:none;border:1px solid var(--cd-line);background:transparent;color:var(--cd-mute);
  padding:2px 9px;border-radius:999px;font:500 11px/1.6 inherit;cursor:pointer;transition:all .15s}
.dshp-dt-chip:hover{background:var(--cd-hover)}
.dshp-dt-chip.on{background:var(--cd-ink);border-color:var(--cd-ink);color:var(--cd-field)}
/* Hooks 开关行：作为补丁组的筛选条件放在明细顶部 */
.dshp-dt-hooks{display:flex;align-items:center;gap:8px;padding:8px 0 10px;
  border-bottom:1px solid var(--cd-line-dim);margin-bottom:2px}
.dshp-dt-hooks-name{font-size:12px;font-weight:600;color:var(--cd-ink2)}
.dshp-dt-hooks-meta{font-size:10.5px;color:var(--cd-faint)}
.dshp-dt-group{border-bottom:1px solid var(--cd-line-dim)}
.dshp-dt-group:last-child{border-bottom:0}
.dshp-dt-ghead{display:flex;align-items:center;gap:7px;padding:9px 2px;cursor:pointer;user-select:none}
.dshp-dt-ghead:hover .dshp-dt-gname{color:var(--cd-ink)}
.dshp-dt-arrow{font-size:9px;color:var(--cd-faint);display:inline-block;transition:transform .16s}
.dshp-dt-arrow.open{transform:rotate(90deg)}
.dshp-dt-gname{font-size:12.5px;font-weight:600;color:var(--cd-ink2);transition:color .15s}
.dshp-dt-gnum{font-size:11px;color:var(--cd-faint);font-variant-numeric:tabular-nums}
.dshp-dt-list{padding:0 0 8px 16px}
.dshp-dt-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px}
.dshp-dt-dot{width:5px;height:5px;border-radius:999px;background:var(--dshp-led,#22C55E);flex:none}
.dshp-dt-dot.skip{background:var(--cd-off)}
.dshp-dt-dot.bad{background:var(--cd-bad)}
.dshp-dt-name{flex:1;color:var(--cd-ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-dt-st{font-size:10.5px;color:var(--cd-ok);flex:none}
.dshp-dt-st.skip{color:var(--cd-faint)}
.dshp-dt-st.bad{color:var(--cd-bad)}
.dshp-dt-empty{padding:8px 0;font-size:11.5px;color:var(--cd-faint)}
.dshp-dt-more{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;
  padding:8px;border:1px dashed var(--cd-line-btn);border-radius:9px;font-size:11.5px;color:var(--cd-mute);
  cursor:pointer;user-select:none;background:transparent;width:100%;font-family:inherit}
.dshp-dt-more:hover{background:var(--cd-hover);color:var(--cd-ink)}
/* [dsh-breach] 提示词 / 规则集 / Skill 卡片 */
.dshp-cd{border:0;border-top:1px solid var(--ov-hair,#E7EFFA);border-radius:0;padding:12px 2px 2px;margin-top:6px;background:transparent;box-shadow:none}
.dshp-cd-head{display:flex;align-items:center;gap:8px}
.dshp-cd-name{font-size:12.5px;font-weight:650;color:var(--cd-ink)}
.dshp-cd-meta{font-size:11px;color:var(--cd-faint);font-variant-numeric:tabular-nums}
.dshp-cd-btn{appearance:none;border:1px solid var(--cd-line-btn);background:var(--cd-field);color:var(--cd-ink2);
  padding:3px 10px;border-radius:7px;font:500 11px/1.6 inherit;cursor:pointer;transition:all .15s}
.dshp-cd-btn:hover{background:var(--cd-hover)}
.dshp-cd-btn.primary{background:var(--cd-ink);border-color:var(--cd-ink);color:var(--cd-field)}
.dshp-cd-btn.primary:hover{opacity:.88}
.dshp-cd-btn.tiny{padding:1px 8px;font-size:10.5px}
.dshp-cd-btn:disabled{opacity:.5;cursor:default}
.dshp-cd-body{margin-top:10px}
.dshp-cd-area{width:100%;min-height:180px;resize:vertical;box-sizing:border-box;
  border:1px solid var(--cd-line);border-radius:9px;background:var(--cd-field);color:var(--cd-ink2);
  padding:9px 11px;font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none}
.dshp-cd-area:focus{border-color:var(--cd-focus)}
.dshp-cd-acts{display:flex;align-items:center;gap:8px;margin-top:8px}
.dshp-cd-note{font-size:11px;color:var(--cd-warn)}
.dshp-cd-list{margin-top:8px}
.dshp-cd-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px}
.dshp-cd-dot{width:5px;height:5px;border-radius:999px;background:var(--dshp-led,#22C55E);flex:none}
.dshp-cd-dot.off{background:var(--cd-off)}
.dshp-cd-t{flex:1;color:var(--cd-ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-cd-tag{font-size:10.5px;color:var(--cd-ok)}
.dshp-cd-empty{margin-top:8px;font-size:11.5px;color:var(--cd-faint);line-height:1.7}
.dshp-cd-empty code{background:var(--cd-code);padding:1px 5px;border-radius:4px;font-size:11px}
.dshp-cd-fields{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.dshp-cd-field{display:flex;flex-direction:column;gap:3px;flex:1;min-width:110px}
.dshp-cd-field>span{font-size:10.5px;color:var(--cd-faint);letter-spacing:.03em}
.dshp-cd-input{border:1px solid var(--cd-line);border-radius:7px;background:var(--cd-field);color:var(--cd-ink2);
  padding:4px 8px;font:12px/1.5 inherit;outline:none;width:100%;box-sizing:border-box}
.dshp-cd-input:focus{border-color:var(--cd-focus)}
.dshp-cd-row.clickable{cursor:pointer;border-radius:7px;padding:6px 4px;margin:0 -4px}
.dshp-cd-row.clickable:hover{background:var(--cd-hover2)}
.dshp-cd-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dshp-cd-sub{font-size:10.5px;color:var(--cd-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-cd-hint{font-size:11px;color:var(--cd-faint);line-height:1.65;margin-top:2px}
.dshp-cd-dirty{font-size:11px;color:var(--cd-warn);margin-top:7px}
/* 开关 */
.dshp-sw{appearance:none;position:relative;width:34px;height:19px;border-radius:999px;
  border:1px solid var(--cd-track);background:var(--cd-line-soft);cursor:pointer;padding:0;transition:background .18s,border-color .18s}
.dshp-sw i{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;
  background:var(--cd-knob);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .18s}
.dshp-sw.on{background:var(--cd-ok);border-color:var(--cd-ok)}
.dshp-sw.on i{transform:translateX(15px)}
.dshp-sw:disabled{opacity:.55;cursor:default}
`;

		function formatSize(bytes) {
			if (typeof bytes !== "number" || !isFinite(bytes) || bytes < 0) return "0 B";
			if (bytes < 1024) return bytes + " B";
			const kb = bytes / 1024;
			return (kb >= 100 ? Math.round(kb) : kb.toFixed(1)) + " KB";
		}

		function statusKind(st) {
			if (st === "applied" || st === "already") return "ok";
			if (st === "pending") return "wait";
			if (st === "unmatched") return "bad";
			if (st === "na") return "ok";
			if (st === "missing_file" || st === "skipped" || st === "unlocated" || st === "off") return "miss";
			return "bad";
		}

		function statusLabel(st, t) {
			if (st === "applied" || st === "already") return t("status.applied");
			if (st === "off") return t("status.skipped");
			if (st === "pending") return t("status.pending");
			if (st === "unmatched") return t("status.unmatched");
			if (st === "skipped") return t("status.skipped");
			if (st === "missing_file") return t("skip");
			if (st === "unlocated") return t("status.unlocated");
			if (st === "na") return t("status.na");
			return st || t("unknown");
		}

		function shimKind(v) {
			if (v === "patched" || v === "n/a") return "ok";
			if (v === "original") return "wait";
			if (v === "missing" || !v) return "miss";
			return "bad";
		}

		function patchIdLabel(r) {
			const ids = Array.isArray(r.ids) && r.ids.length ? r.ids : [r.id];
			return ids.map((id) => "#" + id).join("/");
		}

		function patchTitle(t, state, r) {
			if (r && r.title) return r.title;
			const id = r && typeof r === "object" ? r.id : r;
			const key = "patch." + id;
			const hit = t(key);
			if (hit && hit !== key) return hit;
			const names = state && state.patch_names;
			const name = names && (names[id] || names[String(id)]);
			return name || key;
		}

		function ensureBreachStyles() {
			try {
				if (typeof document === "undefined" || !document.head) return;
				let uiTag = document.querySelector('style[data-dsh-breach-ui="1"]');
				const fullCss = HAPPY_CSS + "\n" + OVERVIEW_CSS;
				if (!uiTag) {
					uiTag = document.createElement("style");
					uiTag.setAttribute("data-dsh-breach-ui", "1");
					uiTag.textContent = fullCss;
					document.head.append(uiTag);
				} else if (uiTag.textContent !== fullCss) {
					uiTag.textContent = fullCss;
				}
			} catch { /* ignore */ }
		}

		function BrandShieldIcon(cls) {
			return h("svg", {
				className: cls || "brand",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2.2,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
			},
				h("path", { d: "M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10Z" }),
				h("path", { d: "m8.8 11.9 2.2 2.2 4.2-4.4" }),
			);
		}

		/** 方案 B 统一模态弹窗壳：深石墨顶栏 + 云灰底壳 + 纯白内容卡 + 底栏操作区。 */
		function SchemeBDialog(props) {
			const [dlgTheme, setDlgTheme] = useState(detectHostTheme);
			useEffect(() => {
				ensureBreachStyles();
				const sync = () => setDlgTheme(detectHostTheme());
				sync();
				let obs = null;
				try {
					if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
						obs = new MutationObserver(sync);
						if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
						if (document.documentElement) obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
					}
				} catch { /* ignore */ }
				return () => { try { obs?.disconnect(); } catch { /* ignore */ } };
			}, []);
			const theme = (props.theme || dlgTheme) === "dusk" ? "dusk" : "white";
			const canClose = typeof props.onClose === "function" && !props.busy;
			const sizeCls = props.size === "sm" ? " sm" : props.size === "lg" ? " lg" : "";
			const node = h("div", {
				className: "dshp-b-mask",
				"data-theme": theme,
				role: "dialog",
				"aria-modal": "true",
				onClick: (e) => { if (e.target === e.currentTarget && canClose) props.onClose(); },
			},
				h("div", { className: "dshp-b-dialog" + sizeCls },
					h("div", { className: "dshp-b-dlg-head" },
						BrandShieldIcon("brand"),
						h("h3", { className: "dshp-b-dlg-title" }, safeText(props.title, "")),
						props.badge ? h("span", { className: "dshp-b-dlg-pill" }, safeText(props.badge, "")) : null,
						h("span", { style: { flex: 1 } }),
						props.onClose ? h("button", {
							type: "button",
							className: "dshp-head-close",
							disabled: Boolean(props.busy),
							onClick: () => { if (canClose) props.onClose(); },
							"aria-label": "Close",
						},
							h("svg", { viewBox: "0 0 24 24", width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" },
								h("path", { d: "M18 6 6 18M6 6l12 12" }),
							),
						) : null,
					),
					h("div", { className: "dshp-b-dlg-body" }, props.children),
					props.footer ? h("div", { className: "dshp-b-dlg-foot" }, props.footer) : null,
				),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined" && document.body) {
					return rd.createPortal(node, document.body);
				}
			} catch { /* host 可能没暴露 react-dom */ }
			return node;
		}

		function RestartAsk(props) {
			return h(SchemeBDialog, {
				size: "sm",
				theme: props.theme,
				title: props.t("restart.ask.title"),
				badge: "dsh-breach",
				onClose: props.onLater,
				footer: [
					h("button", { key: "later", type: "button", className: "dshp-b-btn", onClick: props.onLater }, props.t("restart.notNow")),
					h("button", { key: "now", type: "button", className: "dshp-b-btn primary", onClick: props.onRestart }, props.t("restart.now")),
				],
			},
				h("div", { className: "dshp-b-card", style: { fontSize: "12.5px", lineHeight: 1.65 } }, props.t("restart.ask.body")),
			);
		}

		function reopenAfterRestart() {
			window.location.reload();
		}

		function waitForRestart(setNotice, setBusy, t) {
			const started = Date.now();
			// 必须先看到旧进程掉线，再等新进程就绪；否则同进程立刻 200 会被当成「重启成功」又弹重启。
			let sawDown = false;
			const ping = () => {
				fetch("/dsh-breach/status", { cache: "no-store", credentials: "same-origin" })
					.then((r) => (r.ok ? r.json() : Promise.reject()))
					.then((d) => {
						if (!sawDown) {
							retry();
							return;
						}
						if (d && d.ok && d.ready !== false) reopenAfterRestart();
						else retry();
					})
					.catch(() => {
						sawDown = true;
						retry();
					});
			};
			const retry = () => {
				if (Date.now() - started > 90000) {
					setNotice({ kind: "error", text: t("restart.timeout") });
					setBusy(false);
					return;
				}
				setTimeout(ping, 500);
			};
			setTimeout(ping, 800);
		}

		let restartOnce = false;

		function restartDsh(setNoticeRaw, setBusy, t, surface) {
			// 调用方（OverviewSection）传进来的是「接收字符串」的 setNote，
			// 但本函数内部按 {kind, text} 传对象。对象直接被渲染会抛
			// React error #31（Objects are not valid as a React child），
			// 进而让整个 shell.overlay 的 dock entry 崩掉、宿主判 fatal。
			// 这里统一适配：无论上游给的是字符串 setter 还是对象 setter，
			// 都只把 text 交出去。
			const setNotice = (notice) => {
				const text = notice && typeof notice === "object" ? notice.text : notice;
				setNoticeRaw(safeText(text, ""));
			};
			if (restartOnce) return;
			const surf = surface || clientGuessSurface() || "desktop";
			const desktop = surf === "desktop" || clientGuessSurface() === "desktop";
			restartOnce = true;
			setBusy(true);
			setNotice({ kind: "ok", text: hostText(t, "restarting", surf) });
			const stop = (error) => {
				restartOnce = false;
				setNotice({ kind: "error", text: error ? t("restart.fail", { error }) : t("restart.notStarted") });
				setBusy(false);
			};
			let sawDrop = false;
			const watch = setTimeout(() => {
				if (sawDrop) return;
				stop("");
			}, 25000);
			fetch("/dsh-breach/restart", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
				.then((r) => r.json())
				.then((d) => {
					if (!d.ok) throw new Error(d.error || "restart failed");
					const next = (d && d.surface) || surf;
					const full = next === "desktop" || (d && d.fullApp) || desktop;
					if (full && d.already) {
						setNotice({ kind: "ok", text: hostText(t, "restarting", next) });
						return;
					}
					if (full && d.restarting === false) {
						clearTimeout(watch);
						stop(d.error || "not started");
						return;
					}
					setNotice({ kind: "ok", text: hostText(t, "restarting", next) });
					if (full) return;
					clearTimeout(watch);
					restartOnce = false;
					waitForRestart(setNotice, setBusy, t);
				})
				.catch((e) => {
					const msg = String((e && e.message) || e || "");
					const dropped = /failed to fetch|networkerror|load failed/i.test(msg) || e.name === "TypeError";
					if (dropped && desktop) {
						sawDrop = true;
						clearTimeout(watch);
						return;
					}
					clearTimeout(watch);
					stop(msg || "restart failed");
				});
		}

		function detectHostTheme() {
			try {
				if (typeof document !== "undefined") {
					const root = document.documentElement;
					if (document.body?.hasAttribute("data-ds-dark-theme") || root?.hasAttribute("data-ds-dark-theme")) return "dusk";
					const scheme = (root.style.colorScheme || getComputedStyle(root).colorScheme || getComputedStyle(root).getPropertyValue("color-scheme") || "").toLowerCase();
					if (scheme.includes("dark")) return "dusk";
					if (scheme.includes("light")) return "white";
				}
				if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
					return "dusk";
				}
			} catch { /* ignore */ }
			return "white";
		}

		function readTheme() {
			return detectHostTheme();
		}

		/* ── 方案 B 面板主体样式（云灰底托 + 纯白卡片内胆 + 高对比状态指示） ───────── */
		const OVERVIEW_CSS = `
.dshp-b-pane{display:flex;flex-direction:column;gap:10px}
.dshp-b-card{background:var(--dk-card,#FFFFFF);border:1px solid var(--dk-sub-bd,#DCE3EE);border-radius:10px;padding:11px 13px;color:var(--dk-ink,#0F172A)}
.dshp-b-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-radius:9px;font-size:12px;font-weight:600;line-height:1.45}
.dshp-b-banner.bad{background:rgba(220,38,38,.12);border:1px solid rgba(220,38,38,.38);color:var(--dk-bad,#DC2626)}
.dshp-b-banner.warn{background:rgba(217,119,6,.12);border:1px solid rgba(217,119,6,.38);color:var(--dk-warn,#D97706)}
.dshp-b-banner .txt{flex:1;min-width:0}
.dshp-b-banner-btn{appearance:none;flex:none;border:0;border-radius:6px;padding:4px 10px;font:600 11.5px/1.4 inherit;cursor:pointer;white-space:nowrap}
.dshp-b-banner.bad .dshp-b-banner-btn{background:var(--dk-bad,#DC2626);color:#fff}
.dshp-b-banner.warn .dshp-b-banner-btn{background:transparent;border:1px solid currentColor;color:inherit}
.dshp-b-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dshp-b-sum-left{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.dshp-b-dot{width:10px;height:10px;border-radius:999px;flex:none;background:var(--dk-ok,#16A34A);box-shadow:0 0 0 3px rgba(22,163,74,.18)}
.dshp-b-dot.warn{background:var(--dk-warn,#D97706);box-shadow:0 0 0 3px rgba(217,119,6,.20)}
.dshp-b-dot.bad{background:var(--dk-bad,#DC2626);box-shadow:0 0 0 3px rgba(220,38,38,.20)}
.dshp-b-sum-main{min-width:0}
.dshp-b-sum-line{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.dshp-b-big{font-size:15.5px;font-weight:700;letter-spacing:-.2px;color:var(--dk-ink,#0F172A)}
.dshp-b-big.bad{color:var(--dk-bad,#DC2626)}
.dshp-b-counts{font-size:11.5px;color:var(--dk-mute,#526277);font-variant-numeric:tabular-nums}
.dshp-b-counts b{font-weight:650;color:var(--dk-ink,#0F172A)}
.dshp-b-counts b.bad{color:var(--dk-bad,#DC2626)}
.dshp-b-sub{font-size:11px;color:var(--dk-faint,#64748B);margin-top:2px;font-variant-numeric:tabular-nums}
.dshp-b-acts{display:flex;align-items:center;gap:6px;flex:none}
.dshp-b-btn{appearance:none;border:1px solid transparent;border-radius:7px;padding:5px 11px;font:600 12px/1.4 inherit;cursor:pointer;background:var(--dk-chip,#E2E8F0);color:var(--dk-ink,#0F172A);transition:background .14s,opacity .14s;white-space:nowrap}
.dshp-b-btn:hover:not(:disabled){background:var(--dk-chip-hover,#CBD5E1)}
.dshp-b-btn:disabled{opacity:.5;cursor:default}
.dshp-b-btn.primary{background:var(--dk-primary,#2563EB);color:#fff}
.dshp-b-btn.primary:hover:not(:disabled){background:var(--dk-primary-hover,#1D4ED8)}
.dshp-b-btn.danger{background:transparent;border-color:rgba(220,38,38,.45);color:var(--dk-bad,#DC2626)}
.dshp-b-btn.danger:hover:not(:disabled){background:rgba(220,38,38,.10)}
.dshp-b-note{font-size:11.5px;padding:7px 10px;border-radius:8px;background:var(--dk-card,#FFFFFF);border:1px solid var(--dk-sub-bd,#DCE3EE);color:var(--dk-mute,#526277)}
.dshp-b-note.bad{color:var(--dk-bad,#DC2626);border-color:rgba(220,38,38,.35)}
.dshp-b-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 0}
.dshp-b-bar-title{font-size:11.5px;font-weight:600;color:var(--dk-mute,#526277)}
.dshp-b-chips{display:inline-flex;align-items:center;gap:3px}
.dshp-b-chip{appearance:none;border:0;background:transparent;color:var(--dk-faint,#64748B);padding:2px 9px;border-radius:999px;font:500 11.5px/1.5 inherit;cursor:pointer;font-variant-numeric:tabular-nums}
.dshp-b-chip:hover{color:var(--dk-ink,#0F172A)}
.dshp-b-chip.on{background:var(--dk-card,#FFFFFF);color:var(--dk-ink,#0F172A);font-weight:650;box-shadow:0 1px 2px rgba(15,23,42,.08);border:1px solid var(--dk-sub-bd,#DCE3EE)}
.dshp-b-groups{display:flex;flex-direction:column;gap:6px}
.dshp-b-group{background:var(--dk-card,#FFFFFF);border:1px solid var(--dk-sub-bd,#DCE3EE);border-radius:9px;overflow:hidden}
.dshp-b-ghead{width:100%;appearance:none;border:0;background:transparent;color:var(--dk-ink,#0F172A);display:flex;align-items:center;gap:9px;padding:8px 11px;text-align:left;font:inherit;cursor:pointer}
.dshp-b-ghead:hover{background:rgba(127,127,127,.04)}
.dshp-b-chev{width:14px;height:14px;flex:none;color:var(--dk-faint,#64748B);transition:transform .16s ease}
.dshp-b-group.is-open .dshp-b-chev{transform:rotate(90deg)}
.dshp-b-gname{font-size:12.5px;font-weight:650;width:58px;flex:none}
.dshp-b-gdesc{font-size:11.5px;color:var(--dk-mute,#526277);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshp-b-prog{width:64px;height:5px;border-radius:999px;background:var(--dk-chip,#E2E8F0);overflow:hidden;display:flex;flex:none}
.dshp-b-prog i{display:block;height:100%;background:var(--dk-ok,#16A34A);transition:width .25s}
.dshp-b-prog i.sk{background:var(--dk-warn,#D97706)}
.dshp-b-prog i.bad{background:var(--dk-bad,#DC2626)}
.dshp-b-gnum{width:44px;flex:none;text-align:right;font-family:var(--dshp-mono,ui-monospace,Consolas,monospace);font-size:11px;color:var(--dk-mute,#526277);font-variant-numeric:tabular-nums}
.dshp-b-glist{padding:6px 11px 8px;background:var(--dk-bg,#F1F4F9);border-top:1px solid var(--dk-sub-bd,#DCE3EE);display:flex;flex-direction:column;gap:4px}
.dshp-b-prow{display:flex;align-items:center;gap:7px;font-size:11.5px;padding:2px 0}
.dshp-b-pdot{width:6px;height:6px;border-radius:999px;flex:none;background:var(--dk-ok,#16A34A)}
.dshp-b-pdot.skip{background:var(--dk-warn,#D97706)}
.dshp-b-pdot.bad{background:var(--dk-bad,#DC2626)}
.dshp-b-pid{font-family:var(--dshp-mono,ui-monospace,Consolas,monospace);font-size:11px;color:var(--dk-faint,#64748B);flex:none;min-width:34px}
.dshp-b-pname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dk-ink,#0F172A)}
.dshp-b-pst{flex:none;font-size:11px;color:var(--dk-ok,#16A34A);font-weight:500}
.dshp-b-pst.skip{color:var(--dk-warn,#D97706)}
.dshp-b-pst.bad{color:var(--dk-bad,#DC2626)}
.dshp-b-empty{padding:14px 8px;text-align:center;font-size:12px;color:var(--dk-faint,#64748B)}
.dshp-b-area{width:100%;min-height:210px;resize:vertical;box-sizing:border-box;border:1px solid var(--dk-sub-bd,#DCE3EE);border-radius:8px;background:var(--dk-bg,#F1F4F9);color:var(--dk-ink,#0F172A);padding:9px 11px;font:12px/1.6 var(--dshp-mono,ui-monospace,SFMono-Regular,Consolas,monospace);outline:none}
.dshp-b-area:focus{border-color:var(--dk-primary,#2563EB)}
.dshp-b-tag{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(22,163,74,.12);color:var(--dk-ok,#16A34A)}
.dshp-b-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dshp-b-set-title{font-size:12.5px;font-weight:650;color:var(--dk-ink,#0F172A)}
.dshp-b-set-hint{font-size:11.5px;color:var(--dk-mute,#526277);margin-top:3px;line-height:1.5}
`;

		const GROUP_META = {
			"提示词": { labelKey: "group.prompt", descKey: "grp.desc.prompt" },
			"代码": { labelKey: "group.code", descKey: "grp.desc.code" },
			"工具": { labelKey: "group.tools", descKey: "grp.desc.tools" },
			"兼容": { labelKey: "grp.compat", descKey: "grp.desc.compat" },
		};

		function OverviewSection(props) {
			const tr = (k, p) => (typeof translate === "function" ? translate(k, p) : k);
			const st = props.status;
			const load = props.onReload;
			const needsRestart = (d) => {
				if (!d) return false;
				if (d.boot_full_quit || d.restart_after_apply || d.needs_full_quit) return true;
				if (d.restarting === true || d.unpacked_asar === true) return true;
				if (typeof d.note === "string" && /重启|restart/i.test(d.note)) return true;
				return false;
			};
			const [busy, setBusy] = useState("");
			const [note, setNote] = useState("");
			const [askRestart, setAskRestart] = useState(false);
			const suppressRestart = useRef(false);

			const [openG, setOpenG] = useState({});
			const [filter, setFilter] = useState("all");
			const patches = (st && st.patches) || [];
			const isDone = (s) => s === "applied" || s === "already";
			const isBad = (s) => s === "pattern_not_found" || s === "error" || s === "unmatched";
			const bad = patches.filter((p) => isBad(p.status));
			const applied = (st && st.patches_applied) || 0;
			const skipped = (st && st.patches_skipped) || 0;
			const pending = (st && st.patches_pending) || 0;
			const total = (st && st.patches_total) || 0;

			let promptAlive = 0;
			let codeApplied = 0;
			for (const p of patches) {
				if (!isDone(p.status)) continue;
				if (p.layer === "提示词") promptAlive += 1;
				else codeApplied += 1;
			}

			const ORDER = ["提示词", "代码", "工具", "兼容"];
			const bucket = {};
			const bucketList = {};
			for (const p of patches) {
				let key = p.layer || "兼容";
				if (key.indexOf("兼容") !== -1) key = "兼容";
				if (!bucket[key]) bucket[key] = { total: 0, done: 0, bad: 0 };
				bucket[key].total += 1;
				if (isDone(p.status)) bucket[key].done += 1;
				if (isBad(p.status)) bucket[key].bad += 1;
				(bucketList[key] || (bucketList[key] = [])).push(p);
			}
			const passFilter = (p) => {
				if (filter === "all") return true;
				if (filter === "bad") return isBad(p.status);
				if (filter === "skip") return !isDone(p.status) && !isBad(p.status);
				return true;
			};
			const rows = Object.keys(bucket)
				.sort((a, b) => {
					const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
					return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
				})
				.map((k) => ({ key: k, ...bucket[k] }));

			const runAction = (action) => {
				if (busy) return;
				setBusy(action);
				setNote("");
				const go = action === "apply"
					? apiJson("/dsh-breach/override").then((o) => {
						const content = (o && (o.content || o.defaultContent)) || "";
						return fetch("/dsh-breach/apply", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ content }),
						}).then((r) => r.json());
					})
					: fetch("/dsh-breach/revert", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: "{}",
					}).then((r) => r.json());
				go.then((d) => {
					if (!d || !d.ok) {
						setNote((action === "apply" ? "应用失败：" : "还原失败：") + ((d && d.error) || "未知错误"));
					} else if (action === "apply") {
						if (needsRestart(d) && !suppressRestart.current) setAskRestart(true);
					} else {
						const n = typeof d.reverted === "number" ? d.reverted : 0;
						setNote("已撤销 " + n + " 项补丁。重启后才会完全还原；想恢复请再点「应用」。");
					}
					if (typeof load === "function") load();
				}).catch((e) => {
					setNote((action === "apply" ? "应用失败：" : "还原失败：") + (e && e.message ? e.message : e));
				}).finally(() => setBusy(""));
			};

			const state = !st
				? "loading"
				: bad.length
					? "fail"
					: applied === 0
						? "idle"
						: pending > 0
							? "pending"
							: "ok";
			const liveBad = Boolean(st && st.live === false);
			const adaptN = (st && st.adapt_pending) || 0;
			const hostWarn = (st && st.host_warn) || "";
			const warnText = adaptN > 0 ? adaptN + " " + tr("ov.adaptN") : hostWarn;
			const isBadState = state === "fail" || state === "idle" || liveBad;
			const isWarnState = !isBadState && (state === "pending" || adaptN > 0);
			const dotCls = "dshp-b-dot" + (isBadState ? " bad" : isWarnState ? " warn" : "");
			const bigText = state === "fail"
				? bad.length + " " + tr("ov.failN")
				: state === "idle"
					? tr("ov.notApplied")
					: state === "pending"
						? pending + " " + tr("ov.pendingN")
						: state === "loading"
							? tr("ov.loading")
							: tr("ov.ok");

			const surfLabel = st ? tr("surface." + (st.surface || "desktop")) : "";
			const hostVerPart = st && st.host_version
				? "DSH " + st.host_version + " (" + (st.host_range === "verified" ? tr("ov.hostVerified") : tr("ov.hostUnverified")) + ")"
				: "";
			const bakPart = st ? (st.has_backup ? tr("metric.bak.yes") : tr("metric.bak.no")) : "";
			const subParts = [hostVerPart, surfLabel, bakPart].filter(Boolean);

			return h("div", { className: "dshp-b-pane" },
				liveBad
					? h("div", { className: "dshp-b-banner bad" },
						h("span", { className: "txt" }, tr("ov.liveBad")),
						h("button", {
							type: "button",
							className: "dshp-b-banner-btn",
							disabled: Boolean(busy),
							onClick: () => restartDsh(setNote, () => {}, tr, "desktop"),
						}, tr("ov.fullQuit")),
					)
					: null,
				warnText
					? h("div", { className: "dshp-b-banner warn" },
						h("span", { className: "txt" }, warnText),
						adaptN > 0
							? h("button", {
								type: "button",
								className: "dshp-b-banner-btn",
								onClick: () => setFilter("skip"),
							}, tr("ov.view"))
							: null,
					)
					: null,
				h("div", { className: "dshp-b-card" },
					h("div", { className: "dshp-b-summary" },
						h("div", { className: "dshp-b-sum-left" },
							h("span", { className: dotCls }),
							h("div", { className: "dshp-b-sum-main" },
								h("div", { className: "dshp-b-sum-line" },
									h("span", { className: "dshp-b-big" + (isBadState ? " bad" : "") }, bigText),
									st ? h("span", { className: "dshp-b-counts" },
										h("b", null, String(applied)), " " + tr("ov.applied") + " · ",
										h("b", null, String(skipped)), " " + tr("ov.skipped") + " · ",
										h("b", { className: bad.length ? "bad" : "" }, String(bad.length)), " " + tr("ov.failed"),
									) : null,
								),
								subParts.length ? h("div", { className: "dshp-b-sub" }, subParts.join(" · ")) : null,
								promptAlive > 0 && codeApplied === 0
									? h("div", { className: "dshp-b-sub" },
										"代码补丁已撤销；" + promptAlive + " 项提示词仍在运行期生效")
									: null,
							),
						),
						h("div", { className: "dshp-b-acts" },
							h("button", { type: "button", className: "dshp-b-btn", disabled: !!busy, onClick: () => runAction("revert") }, tr("btn.revert")),
							h("button", { type: "button", className: "dshp-b-btn primary", disabled: !!busy, onClick: () => runAction("apply") },
								busy === "apply" ? tr("btn.apply.busy") : (applied > 0 ? tr("ov.reapply") : tr("btn.apply"))),
						),
					),
				),
				note ? h("div", { className: "dshp-b-note" + (/失败|错误|fail|error/i.test(note) ? " bad" : "") }, note) : null,
				h("div", { className: "dshp-b-bar" },
					h("span", { className: "dshp-b-bar-title" }, tr("ov.groupDetail") + (total ? " (" + total + ")" : "")),
					h("div", { className: "dshp-b-chips" },
						[
							["all", tr("ov.applied") === "Applied" ? "All" : "全部"],
							["skip", tr("ov.skipped") + (skipped ? " " + skipped : "")],
							["bad", tr("ov.failed") + (bad.length ? " " + bad.length : "")],
						].map(([f, txt]) =>
							h("button", {
								key: f,
								type: "button",
								className: "dshp-b-chip" + (filter === f ? " on" : ""),
								onClick: () => setFilter(f),
							}, txt)),
					),
				),
				h("div", { className: "dshp-b-groups" },
					filter !== "all" && !rows.some((r) => (bucketList[r.key] || []).some(passFilter))
						? h("div", { className: "dshp-b-card dshp-b-empty" }, filter === "bad" ? "无失败补丁" : "无跳过补丁")
						: rows.filter((r) => filter === "all" || (bucketList[r.key] || []).some(passFilter)).map((r) => {
							const pct = (n) => (r.total ? (n / r.total) * 100 : 0);
							const sk = Math.max(0, r.total - r.done - r.bad);
							const open = filter !== "all" ? true : !!openG[r.key];
							const list = filter !== "all" ? (bucketList[r.key] || []).filter(passFilter) : (bucketList[r.key] || []);
							const toggle = () => setOpenG((o) => ({ ...o, [r.key]: !open }));
							const meta = GROUP_META[r.key] || { labelKey: "", descKey: "" };
							const groupName = meta.labelKey ? tr(meta.labelKey) : r.key;
							const groupDesc = meta.descKey ? tr(meta.descKey) : "";
							return h("div", { key: r.key, className: "dshp-b-group" + (open ? " is-open" : "") },
								h("button", {
									type: "button",
									className: "dshp-b-ghead",
									onClick: toggle,
									"aria-expanded": open ? "true" : "false",
								},
									h("svg", { className: "dshp-b-chev", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" },
										h("path", { d: "m9 18 6-6-6-6" }),
									),
									h("span", { className: "dshp-b-gname" }, groupName),
									h("span", { className: "dshp-b-gdesc" }, groupDesc),
									h("span", { className: "dshp-b-prog" },
										h("i", { style: { width: pct(r.done) + "%" } }),
										sk ? h("i", { className: "sk", style: { width: pct(sk) + "%" } }) : null,
										r.bad ? h("i", { className: "bad", style: { width: pct(r.bad) + "%" } }) : null,
									),
									h("span", { className: "dshp-b-gnum" }, r.done + "/" + r.total),
								),
								open ? h("div", { className: "dshp-b-glist" },
									list.length
										? list.map((p) => {
											const s = p.status;
											const kindCls = isBad(s) ? " bad" : isDone(s) ? "" : " skip";
											const stText = isBad(s)
												? tr("ov.failed")
												: isDone(s)
													? tr("status.applied")
													: s === "pending"
														? tr("status.pending")
														: tr("status.skipped");
											return h("div", { key: p.id, className: "dshp-b-prow" },
												h("span", { className: "dshp-b-pdot" + kindCls }),
												h("span", { className: "dshp-b-pid" }, patchIdLabel(p)),
												h("span", { className: "dshp-b-pname", title: patchTitle(tr, st, p) }, patchTitle(tr, st, p)),
												h("span", { className: "dshp-b-pst" + kindCls }, stText),
											);
										})
										: h("div", { className: "dshp-b-empty" }, "—"),
								) : null,
							);
						}),
				),
				askRestart ? h(RestartAsk, {
					t: tr,
					theme: detectHostTheme(),
					onLater: () => { suppressRestart.current = true; setAskRestart(false); },
					onRestart: () => {
						suppressRestart.current = true;
						setAskRestart(false);
						restartDsh(setNote, function () {}, tr, hostSurfaceOf(st));
					},
				}) : null,
			);
		}

		function PromptCard() {
			const tr = (k, p) => (typeof translate === "function" ? translate(k, p) : k);
			const [data, setData] = useState(null);
			const [text, setText] = useState("");
			const [busy, setBusy] = useState(false);
			const [note, setNote] = useState("");
			const [restoreOpen, setRestoreOpen] = useState(false);

			const load = useCallback(() => {
				apiJson("/dsh-breach/override").then((d) => {
					if (!d || !d.ok) return;
					setData(d);
					setText(typeof d.content === "string" && d.content ? d.content : (d.defaultContent || ""));
				}).catch(() => {});
			}, []);
			useEffect(() => { load(); }, [load]);

			const writeContent = (content, okText) => {
				setBusy(true); setNote("");
				fetch("/dsh-breach/override", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ content }),
				}).then((r) => r.json()).then((d) => {
					if (d && d.ok) {
						setNote(okText);
						return load();
					}
					setNote("保存失败：" + ((d && d.error) || ""));
				}).catch((e) => setNote("保存失败：" + e.message)).finally(() => setBusy(false));
			};

			const save = () => writeContent(text, tr("saved.override"));

			const restore = () => {
				const def = (data && data.defaultContent) || "";
				if (!def) { setNote("没有可恢复的默认稿"); return; }
				setRestoreOpen(true);
			};

			const confirmRestore = () => {
				const def = (data && data.defaultContent) || "";
				setRestoreOpen(false);
				if (!def) return;
				setText(def);
				writeContent(def, tr("saved.restoreInject"));
			};

			const savedText = (data && typeof data.content === "string") ? data.content : "";
			const dirty = !!data && text !== savedText;
			const statusMeta = data
				? (data.customized ? "已自定义" : "内置默认") + " · " + (text || "").length + " 字"
				: tr("ov.loading");

			return h("div", { className: "dshp-b-pane" },
				h("div", { className: "dshp-b-card", style: { display: "flex", flexDirection: "column", gap: "9px" } },
					h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" } },
						h("div", { style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 } },
							h("span", { className: "dshp-b-tag" }, "● " + statusMeta),
							data && data.path
								? h("span", { style: { fontSize: "11px", color: "var(--dk-faint)", fontFamily: "var(--dshp-mono,monospace)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: data.path }, "prompt-inject.md")
								: null,
						),
						h("button", { type: "button", className: "dshp-b-btn", disabled: busy, onClick: restore }, tr("btn.restoreInject")),
					),
					h("textarea", {
						className: "dshp-b-area",
						value: text,
						spellCheck: false,
						onChange: (e) => setText(e.target.value),
					}),
					h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" } },
						h("span", { style: { fontSize: "11.5px", color: dirty ? "var(--dk-warn)" : "var(--dk-mute)" } },
							dirty ? "有未保存的修改，点「保存」后下一轮对话生效" : (note || "保存后下一轮对话立即生效，无需重启宿主")),
						h("button", { type: "button", className: "dshp-b-btn primary", disabled: busy || !dirty, onClick: save },
							busy ? tr("btn.apply.busy") : tr("btn.saveInject")),
					),
				),
				restoreOpen ? h(SchemeBDialog, {
					size: "sm",
					title: tr("restore.title"),
					badge: "prompt-inject.md",
					busy,
					onClose: () => setRestoreOpen(false),
					footer: [
						h("button", { key: "cancel", type: "button", className: "dshp-b-btn", disabled: busy, onClick: () => setRestoreOpen(false) }, tr("restore.cancel")),
						h("button", { key: "ok", type: "button", className: "dshp-b-btn primary", disabled: busy, onClick: confirmRestore }, tr("restore.confirm")),
					],
				},
					h("div", { className: "dshp-b-card", style: { fontSize: "12.5px", lineHeight: 1.65 } }, tr("restore.body")),
				) : null,
			);
		}

		function SettingsTab(props) {
			const tr = (k, p) => (typeof translate === "function" ? translate(k, p) : k);
			const st = props.status;
			const onReload = props.onReload;
			const [hooksBypass, setHooksBypass] = useState(st ? st.hooks_deny_bypass !== false : true);
			const [hooksBusy, setHooksBusy] = useState(false);
			const [hooksNote, setHooksNote] = useState("");

			const [ownOpen, setOwnOpen] = useState(false);
			const [ownText, setOwnText] = useState("");
			const [ownBusy, setOwnBusy] = useState(false);
			const [ownNote, setOwnNote] = useState("");

			const [sysBusy, setSysBusy] = useState(false);
			const [sysNote, setSysNote] = useState("");
			const [updInfo, setUpdInfo] = useState(null);
			const [updOpen, setUpdOpen] = useState(false);
			const [updErr, setUpdErr] = useState("");
			const [uninstOpen, setUninstOpen] = useState(false);

			useEffect(() => {
				apiJson("/dsh-breach/hooks-deny")
					.then((d) => { if (d && d.ok) setHooksBypass(d.hooksDenyBypass !== false); })
					.catch(() => {});
				apiJson("/dsh-breach/own-servers")
					.then((d) => { if (d && d.ok && typeof d.content === "string") setOwnText(d.content); })
					.catch(() => {});
			}, []);

			const toggleHooks = () => {
				if (hooksBusy) return;
				const next = !hooksBypass;
				setHooksBypass(next);
				setHooksBusy(true);
				setHooksNote("");
				apiJson("/dsh-breach/hooks-deny", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ hooksDenyBypass: next }),
				}).then((d) => {
					if (d && d.ok) {
						setHooksBypass(d.hooksDenyBypass === true);
						setHooksNote(tr("saved.hooksDeny"));
						if (typeof onReload === "function") onReload();
					}
				}).catch((e) => setHooksNote(tr("err.save", { error: e.message }))).finally(() => setHooksBusy(false));
			};

			const saveOwn = () => {
				if (ownBusy) return;
				setOwnBusy(true);
				setOwnNote("");
				apiJson("/dsh-breach/own-servers", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ content: ownText }),
				}).then((d) => {
					if (d && d.ok) {
						if (typeof d.content === "string") setOwnText(d.content);
						setOwnNote(d.dropped ? tr("saved.own.dropped", { n: d.dropped }) : tr("saved.own"));
					}
				}).catch((e) => setOwnNote(tr("err.save", { error: e.message }))).finally(() => setOwnBusy(false));
			};

			const checkUpd = () => {
				if (sysBusy) return;
				setSysBusy(true);
				setSysNote(tr("update.checking"));
				apiJson("/dsh-breach/update").then((d) => {
					if (d && d.ok) {
						setUpdInfo(d);
						if (d.hasUpdate) {
							setSysNote("");
							setUpdOpen(true);
						} else {
							setSysNote(tr("update.latest", { version: d.localVersion || (st && st.plugin_version) || "" }));
						}
					}
				}).catch((e) => setSysNote(tr("update.fail", { error: e.message }))).finally(() => setSysBusy(false));
			};

			const confirmUpd = () => {
				setSysBusy(true);
				setUpdErr("");
				apiJson("/dsh-breach/update", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ op: "apply" }),
				}).then((d) => {
					if (!d || !d.ok) throw new Error((d && d.error) || "failed");
					setUpdOpen(false);
					setSysNote(tr("update.done", { version: d.remoteVersion || d.localVersion || "" }));
					if (typeof onReload === "function") onReload();
				}).catch((e) => setUpdErr(String((e && e.message) || e))).finally(() => setSysBusy(false));
			};

			const doUninstall = () => {
				if (sysBusy) return;
				setUninstOpen(true);
			};

			const confirmUninstall = () => {
				if (sysBusy) return;
				setUninstOpen(false);
				setSysBusy(true);
				setSysNote(tr("uninstall.applying"));
				apiJson("/dsh-breach/uninstall", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}",
				}).then((d) => {
					if (d && d.ok) setSysNote(hostText(tr, "uninstall.done", hostSurfaceOf(st)));
					else setSysNote(tr("uninstall.fail", { error: (d && d.error) || "" }));
				}).catch((e) => setSysNote(tr("uninstall.fail", { error: e.message }))).finally(() => setSysBusy(false));
			};

			return h("div", { className: "dshp-b-pane" },
				h("div", { className: "dshp-b-card" },
					h("div", { className: "dshp-b-set-row" },
						h("div", { style: { minWidth: 0, flex: 1 } },
							h("div", { className: "dshp-b-set-title" }, tr("hooksDeny.bypass")),
							h("div", { className: "dshp-b-set-hint" }, tr("hooksDeny.hint")),
							hooksNote ? h("div", { style: { fontSize: "11px", color: "var(--dk-ok)", marginTop: "4px" } }, hooksNote) : null,
						),
						h("button", {
							type: "button",
							role: "switch",
							"aria-checked": hooksBypass ? "true" : "false",
							className: "dshp-sw" + (hooksBypass ? " on" : ""),
							disabled: hooksBusy,
							onClick: toggleHooks,
						}, h("i", null)),
					),
				),
				h("div", { className: "dshp-b-card", style: { display: "flex", flexDirection: "column", gap: "8px" } },
					h("div", { className: "dshp-b-set-row" },
						h("div", { style: { minWidth: 0, flex: 1 } },
							h("div", { className: "dshp-b-set-title" }, tr("own.title")),
							h("div", { className: "dshp-b-set-hint" }, "放行自有测试机域名或 IP（$DSH_HOME/net-scope-allow.txt）"),
						),
						h("button", { type: "button", className: "dshp-b-btn", onClick: () => setOwnOpen((v) => !v) },
							ownOpen ? tr("set.ownClose") : tr("set.ownEdit")),
					),
					ownOpen ? h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
						h("textarea", {
							className: "dshp-b-area",
							style: { minHeight: "100px" },
							placeholder: "example.com\n192.168.1.10",
							value: ownText,
							spellCheck: false,
							onChange: (e) => setOwnText(e.target.value),
						}),
						h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } },
							h("span", { style: { fontSize: "11px", color: "var(--dk-mute)" } }, ownNote || tr("own.hint")),
							h("button", { type: "button", className: "dshp-b-btn primary", disabled: ownBusy, onClick: saveOwn }, tr("own.save")),
						),
					) : null,
				),
				h("div", { className: "dshp-b-card", style: { display: "flex", flexDirection: "column", gap: "9px" } },
					h("div", { className: "dshp-b-set-row" },
						h("div", { style: { minWidth: 0, flex: 1 } },
							h("div", { className: "dshp-b-set-title" }, tr("set.sysTitle")),
							h("div", { className: "dshp-b-set-hint" }, tr("set.sysHint")),
						),
					),
					h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" } },
						h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
							h("button", { type: "button", className: "dshp-b-btn", disabled: sysBusy, onClick: checkUpd }, tr("set.checkUpdate")),
							h("button", {
								type: "button",
								className: "dshp-b-btn",
								disabled: sysBusy,
								onClick: () => restartDsh(setSysNote, setSysBusy, tr, hostSurfaceOf(st)),
							}, tr("set.restartHost")),
						),
						h("button", { type: "button", className: "dshp-b-btn danger", disabled: sysBusy, onClick: doUninstall }, tr("btn.uninstall")),
					),
					sysNote ? h("div", { style: { fontSize: "11.5px", color: /失败|错误|fail|error/i.test(sysNote) ? "var(--dk-bad)" : "var(--dk-mute)" } }, sysNote) : null,
				),
				updOpen && updInfo ? h(UpdateDialog, {
					info: updInfo,
					busy: sysBusy,
					err: updErr,
					t: tr,
					onClose: () => { if (!sysBusy) { setUpdErr(""); setUpdOpen(false); } },
					onConfirm: confirmUpd,
				}) : null,
				uninstOpen ? h(SchemeBDialog, {
					size: "sm",
					title: tr("uninstall.title"),
					badge: "dsh-breach",
					busy: sysBusy,
					onClose: () => setUninstOpen(false),
					footer: [
						h("button", { key: "cancel", type: "button", className: "dshp-b-btn", disabled: sysBusy, onClick: () => setUninstOpen(false) }, tr("uninstall.cancel")),
						h("button", { key: "ok", type: "button", className: "dshp-b-btn danger-solid", disabled: sysBusy, onClick: confirmUninstall }, tr("uninstall.confirm")),
					],
				},
					h("div", { className: "dshp-b-card", style: { fontSize: "12.5px", lineHeight: 1.65 } }, tr("uninstall.body")),
				) : null,
			);
		}

		function SettingsRoot(props) {
			const t = typeof props.t === "function" ? props.t : ((key) => key);
			const activeTab = props.tab === "prompt" || props.tab === "settings" ? props.tab : "patches";
			const [theme, setTheme] = useState(readTheme);
			const [st, setSt] = useState(null);
			const loadStatus = useCallback(() => {
				apiJson("/dsh-breach/status").then((d) => {
					if (d && d.ok) {
						setSt(d);
						if (props.onVersion && d.plugin_version) props.onVersion(String(d.plugin_version));
					}
				}).catch(() => {});
			}, [props.onVersion]);

			useEffect(() => {
				loadStatus();
				const timer = window.setInterval(loadStatus, 15000);
				return () => window.clearInterval(timer);
			}, [loadStatus]);

			useEffect(() => {
				let cancelled = false;
				let timer = 0;
				const syncFromHost = () => {
					if (!cancelled) setTheme(detectHostTheme());
				};
				const syncSoon = () => {
					if (timer) window.clearTimeout(timer);
					timer = window.setTimeout(syncFromHost, 50);
				};
				syncFromHost();
				let mq;
				try {
					mq = window.matchMedia?.("(prefers-color-scheme: dark)");
					mq?.addEventListener?.("change", syncFromHost);
				} catch { /* ignore */ }
				let obs;
				try {
					obs = new MutationObserver(syncSoon);
					if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
					obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
				} catch { /* ignore */ }
				return () => {
					cancelled = true;
					if (timer) window.clearTimeout(timer);
					try { mq?.removeEventListener?.("change", syncFromHost); } catch { /* ignore */ }
					try { obs?.disconnect(); } catch { /* ignore */ }
				};
			}, []);
			translate = t;
			return h("div", { className: "dshp-root", "data-theme": theme },
				h("style", null, HAPPY_CSS),
				h("style", null, OVERVIEW_CSS),
				activeTab === "prompt"
					? h(PromptCard, null)
					: activeTab === "settings"
						? h(SettingsTab, { status: st, onReload: loadStatus })
						: h(OverviewSection, { status: st, onReload: loadStatus }),
			);
		}

		const REWIND_CSS = `
.dshp-rewind-wrap{position:relative;display:inline-flex}
.dshp-rewind{appearance:none;display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);font:12px/1 var(--ds-font-sans,system-ui,sans-serif);cursor:pointer}
.dshp-rewind:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,currentColor)}
.dshp-rewind:disabled{opacity:.4;cursor:default}
.dshp-rewind svg{display:block}
.dshp-rewind-menu{position:fixed;z-index:2147483000;box-sizing:border-box;width:272px;border-radius:11px;overflow:hidden;background:var(--dk-bg,#F1F4F9);color:var(--dk-ink,#0F172A);border:1px solid var(--dk-bd,#94A3B8);box-shadow:0 20px 44px -8px rgba(15,23,42,.28),0 4px 12px rgba(15,23,42,.12);transform:translateY(-100%);font-family:"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",system-ui,sans-serif}
body[data-ds-dark-theme] .dshp-rewind-menu,.dshp-rewind-menu[data-theme="dusk"]{background:var(--dk-bg,#161922);color:var(--dk-ink,#F1F5F9);border-color:var(--dk-bd,#363E52);box-shadow:0 22px 48px -6px rgba(0,0,0,.58),0 6px 16px rgba(0,0,0,.32)}
.dshp-rewind-head{display:flex;align-items:center;gap:6px;padding:7px 11px;background:var(--dk-head,#1B2230);color:var(--dk-head-ink,#F8FAFC);font-size:11.5px;font-weight:650;letter-spacing:-.1px;border-bottom:1px solid rgba(255,255,255,.08)}
.dshp-rewind-head svg{width:13px;height:13px;color:#3B82F6;flex:none}
.dshp-rewind-body{display:flex;flex-direction:column;gap:6px;padding:7px}
.dshp-rewind-item{display:flex;flex-direction:column;gap:3px;width:100%;padding:8px 10px;border:1px solid var(--dk-sub-bd,#DCE3EE);border-radius:8px;background:var(--dk-card,#FFFFFF);color:var(--dk-ink,#0F172A);text-align:left;cursor:pointer;font:12px/1.4 inherit;transition:border-color .14s,box-shadow .14s,background .14s}
.dshp-rewind-item:hover{border-color:var(--dk-primary,#2563EB);box-shadow:0 2px 8px rgba(37,99,235,.14)}
.dshp-rewind-item b{font-size:12.5px;font-weight:650;color:var(--dk-ink,#0F172A)}
.dshp-rewind-item span{color:var(--dk-mute,#526277);font-size:11px;line-height:1.45}
`;
		const DRAFT_KEY = "dshp-rewind-draft:";
		const ARM_KEY = "dshp-rewind-arm:";
		const FILL_DELAYS = [0, 50, 180, 400, 800];
		const ARM_TTL_MS = 45 * 1000;
		let rewindSeenAt = 0;
		let rewindSessions = null;
		let rewindHost = null;
		let rewindWorkspace = null;
		let rewindConversation = null;
		let pendingComposer = { sessionId: "", text: "", at: 0 };
		let armedFill = { sessionId: "", text: "", at: 0 };

		function rewindText(t, key, fallback) {
			try {
				if (typeof t === "function") {
					const value = t(key);
					if (value !== undefined && value !== null && value !== key) return safeText(value, fallback);
				}
			} catch { /* ignore */ }
			return fallback;
		}

		function currentSessionId(sessions) {
			try {
				const selected = rewindWorkspace?.selection?.getSnapshot?.()?.sessionId;
				if (typeof selected === "string" && selected) return selected;
			} catch { /* ignore */ }
			try {
				const snap = sessions?.list?.getSnapshot?.();
				if (typeof snap?.current === "string" && snap.current) return snap.current;
			} catch { /* ignore */ }
			return "";
		}

		function sessionKnown(sessions, sessionId) {
			try {
				const snap = sessions?.list?.getSnapshot?.();
				if (!snap || !sessionId) return false;
				if (snap.byId && Object.prototype.hasOwnProperty.call(snap.byId, sessionId)) return true;
				if (Array.isArray(snap.ids) && snap.ids.includes(sessionId)) return true;
			} catch { /* ignore */ }
			return false;
		}

		function waitMs(ms) {
			return new Promise((resolve) => window.setTimeout(resolve, ms));
		}

		function isPluginDraft(text) {
			const value = String(text || "").trim();
			if (!value) return false;
			return /^\[MNEMON\]/i.test(value)
				|| /MNEMON RUNTIME MEMORY SNAPSHOT/i.test(value)
				|| /^MNEMON VIEW TOOLS/im.test(value);
		}

		function writeDraft(sessionId, text) {
			if (!sessionId) return;
			const value = isPluginDraft(text) ? "" : (text || "");
			pendingComposer = { sessionId, text: value, at: Date.now() };
			try { sessionStorage.setItem(DRAFT_KEY + sessionId, value); } catch { /* ignore */ }
		}

		function peekDraft(sessionId) {
			if (!sessionId) return "";
			if (pendingComposer.sessionId === sessionId && pendingComposer.text) return pendingComposer.text;
			try { return sessionStorage.getItem(DRAFT_KEY + sessionId) || ""; } catch { return ""; }
		}

		function clearStoredDraft(sessionId) {
			if (!sessionId) return;
			if (pendingComposer.sessionId === sessionId) pendingComposer = { sessionId: "", text: "", at: 0 };
			try { sessionStorage.removeItem(DRAFT_KEY + sessionId); } catch { /* ignore */ }
			try { sessionStorage.removeItem(ARM_KEY + sessionId); } catch { /* ignore */ }
		}

		function armComposerFill(sessionId, text) {
			if (!sessionId || !text || isPluginDraft(text)) return;
			const at = Date.now();
			armedFill = { sessionId, text, at };
			writeDraft(sessionId, text);
			try { sessionStorage.setItem(ARM_KEY + sessionId, String(at)); } catch { /* ignore */ }
		}

		function takeArmedFill(sessionId) {
			if (!sessionId) return "";
			let text = "";
			let at = 0;
			if (armedFill.sessionId === sessionId && armedFill.text) {
				text = armedFill.text;
				at = armedFill.at;
			} else {
				text = peekDraft(sessionId);
				try { at = Number(sessionStorage.getItem(ARM_KEY + sessionId) || 0); } catch { at = 0; }
			}
			if (!text || !at || Date.now() - at > ARM_TTL_MS) {
				if (text && (!at || Date.now() - at > ARM_TTL_MS)) clearStoredDraft(sessionId);
				return "";
			}
			clearStoredDraft(sessionId);
			armedFill = { sessionId: "", text: "", at: 0 };
			return text;
		}

		function conversationFace() {
			if (rewindConversation) return rewindConversation;
			const host = rewindHost;
			if (host?.conversation) return host.conversation;
			if (typeof host?.get === "function") {
				try { return host.get("conversation"); } catch { return undefined; }
			}
			return undefined;
		}

		function conversationInput(sessionId) {
			try {
				const input = conversationFace()?.input;
				if (!input || !sessionId) return null;
				if (typeof input.shell === "function") {
					try { return input.shell(sessionId); } catch { /* session not retained yet */ }
				}
				const sessions = rewindHost?.sessions || rewindSessions;
				const actx = typeof sessions?.scope === "function" ? sessions.scope(sessionId) : undefined;
				if (typeof input.for === "function" && actx) return input.for(actx);
				return null;
			} catch {
				return null;
			}
		}

		function liveDraft(sessionId, inputActions) {
			try {
				const fromActions = inputActions?.state?.getSnapshot?.()?.draft;
				if (typeof fromActions === "string") return fromActions;
			} catch { /* ignore */ }
			try {
				const draft = conversationInput(sessionId)?.state?.getSnapshot?.()?.draft;
				if (typeof draft === "string") return draft;
			} catch { /* ignore */ }
			return "";
		}

		function hostSetDraft(sessionId, text) {
			if (!sessionId) return false;
			try {
				const input = conversationInput(sessionId);
				if (input && typeof input.setDraft === "function") {
					input.setDraft(text || "");
					return true;
				}
			} catch { /* ignore */ }
			return false;
		}

		function fillComposer(inputActions, text) {
			if (inputActions && typeof inputActions.setDraft === "function") {
				try { inputActions.setDraft(text || ""); } catch { /* ignore */ }
			}
		}

		function scheduleComposerFill(sessionId, text, inputActions) {
			if (!sessionId || !text || isPluginDraft(text)) return () => {};
			let stopped = false;
			let filled = false;
			const timers = [];
			const tryFill = () => {
				if (stopped) return;
				const current = liveDraft(sessionId, inputActions);
				if (filled && current !== text) {
					stopped = true;
					return;
				}
				if (current && current !== text) {
					stopped = true;
					return;
				}
				fillComposer(inputActions, text);
				hostSetDraft(sessionId, text);
				filled = true;
			};
			for (const ms of FILL_DELAYS) timers.push(window.setTimeout(tryFill, ms));
			return () => {
				stopped = true;
				for (const t of timers) { try { window.clearTimeout(t); } catch { /* ignore */ } }
			};
		}

		function scheduleEchoClear(sessionId, inputActions) {
			if (!sessionId) return () => {};
			let last = "";
			let stopped = false;
			const timers = [];
			const tryClear = () => {
				if (stopped || !last) return;
				const current = String(liveDraft(sessionId, inputActions) || "").trim();
				if (!current) {
					stopped = true;
					return;
				}
				if (current !== last) return;
				fillComposer(inputActions, "");
				hostSetDraft(sessionId, "");
				clearStoredDraft(sessionId);
				stopped = true;
			};
			apiJson("/dsh-breach/last-user?sessionId=" + encodeURIComponent(sessionId)).then((data) => {
				if (stopped) return;
				last = String(data?.text || "").trim();
				if (!last || isPluginDraft(last)) return;
				tryClear();
				for (const ms of [0, 50, 180, 400]) timers.push(window.setTimeout(tryClear, ms));
			}).catch(() => {});
			return () => {
				stopped = true;
				for (const t of timers) { try { window.clearTimeout(t); } catch { /* ignore */ } }
			};
		}

		async function dropInheritedQueue(sessions, sessionId) {
			if (!sessions || !sessionId) return;
			const drop = async () => {
				try {
					const actx = typeof sessions.scope === "function" ? sessions.scope(sessionId) : undefined;
					const face = typeof sessions.sessionOf === "function" ? sessions.sessionOf(actx) : undefined;
					const queue = face?.getSnapshot?.()?.queue || [];
					for (const item of queue) {
						const id = item?.id || item?.itemId;
						if (!id) continue;
						try { await face.updateQueue?.(id, { kind: "remove" }); } catch { /* ignore */ }
					}
				} catch { /* ignore */ }
			};
			await drop();
			window.setTimeout(() => { drop(); }, 80);
		}

		async function openRewoundSession(sessions, sessionId) {
			if (!sessionId) return;
			const workspace = rewindWorkspace;
			let lastError = null;
			for (let attempt = 0; attempt < 25; attempt += 1) {
				if (sessions && typeof sessions.refresh === "function" && !sessionKnown(sessions, sessionId)) {
					try { await sessions.refresh(); } catch (error) { lastError = error; }
				}
				const known = sessionKnown(sessions, sessionId);
				if (known || typeof sessions?.open === "function") {
					try {
						if (workspace && typeof workspace.openSession === "function") {
							workspace.openSession(sessionId);
						} else if (typeof sessions?.open === "function") {
							sessions.open(sessionId);
						} else {
							throw new Error("无法打开回退后的会话");
						}
						const selected = workspace?.selection?.getSnapshot?.()?.sessionId;
						if (!workspace || selected === sessionId) {
							await dropInheritedQueue(sessions, sessionId);
							window.setTimeout(() => { dropInheritedQueue(sessions, sessionId); }, 250);
							return;
						}
					} catch (error) {
						lastError = error;
					}
				}
				await waitMs(120);
			}
			throw new Error((lastError && lastError.message) || "回退后的会话没有打开");
		}

		/**
		 * 每个 overlay 组件各包一层错误边界：任一组件的渲染异常只降级它自己，
		 * 不再把整个 shell.overlay entry 带崩（宿主一旦判 entry crashed 会直接 fatal 退出）。
		 * 上一次 EnvAdaptSendGate 抛 ReferenceError 拖垮整组，就是缺这层隔离。
		 */
		class SlotSafe extends Component {
			constructor(p) { super(p); this.state = { failed: false }; }
			static getDerivedStateFromError() { return { failed: true }; }
			componentDidCatch(error) {
				try {
					console.error("[dsh-breach] overlay slot '" + String((this.props && this.props.label) || "?") + "' crashed:", error);
				} catch { /* ignore */ }
			}
			render() {
				if (this.state.failed) return null;
				const children = this.props && this.props.children;
				return children === undefined ? null : children;
			}
		}

		class RewindSafe extends Component {
			constructor(p) { super(p); this.state = { failed: false }; }
			static getDerivedStateFromError() { return { failed: true }; }
			componentDidCatch(error) { try { console.error("[dsh-breach] rewind slot:", error); } catch { /* ignore */ } }
			render() {
				if (this.state.failed) return h(RewindFallback, this.props);
				return h(RewindButton, this.props);
			}
		}


		function rewindMenuNode(t, menuPos, menuRef, runRewind) {
			ensureBreachStyles();
			const theme = detectHostTheme() === "dusk" ? "dusk" : "white";
			const menu = h("div", {
				className: "dshp-rewind-menu",
				"data-theme": theme,
				role: "menu",
				ref: menuRef,
				style: menuPos ? { left: menuPos.left + "px", top: menuPos.top + "px" } : { left: "8px", bottom: "48px", transform: "none" },
			},
				h("style", null, REWIND_CSS),
				h("div", { className: "dshp-rewind-head" },
					h("svg", { viewBox: "0 0 16 16", width: "13", height: "13", "aria-hidden": true },
						h("path", { fill: "currentColor", d: "M7.2 3.2 3.4 7l3.8 3.8V8.6c2.8 0 4.7.7 5.9 2.3-.2-2.8-1.9-5.2-5.9-5.6V3.2z" }),
					),
					h("span", null, rewindText(t, "rewind.label", "回退")),
				),
				h("div", { className: "dshp-rewind-body" },
					h("button", {
						type: "button",
						className: "dshp-rewind-item",
						onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
						onClick: (e) => { e.preventDefault(); e.stopPropagation(); runRewind("once"); },
					},
						h("b", null, rewindText(t, "rewind.once", "回退上一步")),
						h("span", null, rewindText(t, "rewind.once.hint", "撤回最后一步已进行的对话，新会话接上之前的上下文；那句回到输入框再发送")),
					),
					h("button", {
						type: "button",
						className: "dshp-rewind-item",
						onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
						onClick: (e) => { e.preventDefault(); e.stopPropagation(); runRewind("round"); },
					},
						h("b", null, rewindText(t, "rewind.round", "回退上一轮")),
						h("span", null, rewindText(t, "rewind.round.hint", "撤回上一整轮（含子代理）已进行的对话，新会话接上之前的上下文；那句回到输入框再发送")),
					),
				),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined") {
					return rd.createPortal(menu, document.body);
				}
			} catch { /* 没有 portal 时菜单仍挂在按钮旁 */ }
			return menu;
		}

		class RewindFallback extends Component {
			constructor(p) {
				super(p);
				this.state = { menu: false, busy: false, notice: "", menuPos: null };
				this.wrap = null;
				this.menuEl = null;
				this.onDoc = (event) => {
					if (this.wrap && this.wrap.contains(event.target)) return;
					if (this.menuEl && this.menuEl.contains(event.target)) return;
					this.setState({ menu: false });
				};
			}
			componentDidMount() {
				document.addEventListener("mousedown", this.onDoc);
			}
			componentWillUnmount() {
				document.removeEventListener("mousedown", this.onDoc);
			}
			run(mode) {
				const sessionId = this.props.sessionId || currentSessionId(rewindSessions);
				if (!sessionId || this.state.busy) return;
				this.setState({ busy: true, menu: false, notice: "" });
				apiJson("/dsh-breach/rewind", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ sessionId, mode }),
				}).then(async (data) => {
					if (!data || !data.ok || !data.sessionId || data.cleared === false) {
						throw new Error((data && data.error) || "没有清掉之前发送的内容");
					}
					if (data.at) rewindSeenAt = data.at;
					const text = isPluginDraft(data.text) ? "" : (data.text || "");
					armComposerFill(data.sessionId, text);
					await openRewoundSession(rewindSessions, data.sessionId);
					scheduleComposerFill(data.sessionId, text);
					this.setState({ busy: false });
				}).catch((e) => {
					this.setState({
						busy: false,
						notice: "回退失败: " + String((e && e.message) || e),
					});
				});
			}
			openMenu() {
				const rect = this.wrap && this.wrap.getBoundingClientRect ? this.wrap.getBoundingClientRect() : null;
				this.setState({
					menu: !this.state.menu,
					notice: "",
					menuPos: rect ? { left: Math.max(8, rect.right - 272), top: Math.max(8, rect.top - 8) } : null,
				});
			}
			render() {
				const sessionId = this.props.sessionId || currentSessionId(rewindSessions);
				const t = this.props.t || translate;
				const label = this.state.busy ? "回退中…" : (this.state.notice ? this.state.notice.slice(0, 18) : "回退");
				return h("div", { className: "dshp-rewind-wrap", ref: (node) => { this.wrap = node; } },
					h("style", null, REWIND_CSS),
					h("button", {
						type: "button",
						className: "dshp-rewind",
						disabled: this.state.busy || !sessionId,
						onMouseDown: (e) => e.preventDefault(),
						onClick: (e) => { e.preventDefault(); this.openMenu(); },
					}, label),
					this.state.menu ? rewindMenuNode(t, this.state.menuPos, (node) => { this.menuEl = node; }, (mode) => this.run(mode)) : null,
				);
			}
		}

		function RewindButton(props) {
			const t = props.t || translate;
			const sessions = rewindSessions;
			const inputActions = props.inputActions;
			const sessionId = props.sessionId || currentSessionId(sessions);
			const wrapRef = useRef(null);
			const menuRef = useRef(null);
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState("");
			const [menu, setMenu] = useState(false);
			const [menuPos, setMenuPos] = useState(null);

			useEffect(() => {
				if (!sessionId) return;
				const armed = takeArmedFill(sessionId);
				if (armed) {
					scheduleComposerFill(sessionId, armed, inputActions);
					return;
				}
				scheduleEchoClear(sessionId, inputActions);
			}, [sessionId, inputActions]);

			useEffect(() => {
				if (!menu) return;
				const onDoc = (event) => {
					if (wrapRef.current && wrapRef.current.contains(event.target)) return;
					if (menuRef.current && menuRef.current.contains(event.target)) return;
					setMenu(false);
				};
				document.addEventListener("mousedown", onDoc);
				return () => document.removeEventListener("mousedown", onDoc);
			}, [menu]);

			const runRewind = async (mode) => {
				if (!sessionId || busy) return;
				setBusy(true);
				setMenu(false);
				setNotice("");
				try {
					const data = await apiJson("/dsh-breach/rewind", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ sessionId, mode }),
					});
					if (!data || !data.ok || !data.sessionId || data.cleared === false) {
						throw new Error((data && data.error) || "没有清掉之前发送的内容");
					}
					if (data.at) rewindSeenAt = data.at;
					const text = isPluginDraft(data.text) ? "" : (data.text || "");
					armComposerFill(data.sessionId, text);
					await openRewoundSession(sessions, data.sessionId);
					scheduleComposerFill(data.sessionId, text);
				} catch (e) {
					const message = rewindText(t, "rewind.fail", "回退失败: {error}").replace("{error}", String((e && e.message) || e));
					setNotice(message);
				} finally {
					setBusy(false);
				}
			};

			const onClick = (event) => {
				event?.preventDefault?.();
				event?.stopPropagation?.();
				if (!sessionId || busy) return;
				if (menu) {
					setMenu(false);
					return;
				}
				const rect = wrapRef.current?.getBoundingClientRect?.();
				if (rect) {
					setMenuPos({
						left: Math.max(8, rect.right - 272),
						top: Math.max(8, rect.top - 8),
					});
				}
				setNotice("");
				setMenu(true);
			};

			const failLabel = notice
				? (notice.length > 18 ? notice.slice(0, 18) + "…" : notice)
				: "";
			const label = busy
				? rewindText(t, "rewind.busy", "回退中…")
				: (failLabel || rewindText(t, "rewind.label", "回退"));
			const title = notice || rewindText(t, "rewind.aria", "回退");
			return h("div", { className: "dshp-rewind-wrap", ref: wrapRef },
				h("style", null, REWIND_CSS),
				h("button", {
					type: "button",
					className: "dshp-rewind",
					title,
					"aria-label": rewindText(t, "rewind.aria", "回退"),
					"aria-expanded": menu ? "true" : "false",
					disabled: busy || !sessionId,
					onMouseDown: (e) => e.preventDefault(),
					onClick,
				},
					h("svg", { viewBox: "0 0 16 16", width: "14", height: "14", "aria-hidden": true },
						h("path", {
							fill: "currentColor",
							d: "M7.2 3.2 3.4 7l3.8 3.8V8.6c2.8 0 4.7.7 5.9 2.3-.2-2.8-1.9-5.2-5.9-5.6V3.2z",
						}),
					),
					label,
				),
				menu ? rewindMenuNode(t, menuPos, menuRef, runRewind) : null,
			);
		}

		function installRewindWatch(ctx) {
			const sessions = ctx.sessions;
			if (!sessions) return () => {};
			const tick = async () => {
				try {
					const data = await apiJson("/dsh-breach/rewind");
					if (!data || !data.sessionId || !data.at || data.at <= rewindSeenAt) return;
					rewindSeenAt = data.at;
					const current = currentSessionId(sessions);
					if (current && current !== data.parentId) return;
					const text = isPluginDraft(data.text) ? "" : (data.text || "");
					armComposerFill(data.sessionId, text);
					scheduleComposerFill(data.sessionId, text);
					await openRewoundSession(sessions, data.sessionId);
					scheduleComposerFill(data.sessionId, text);
				} catch { /* ignore */ }
			};
			const timer = window.setInterval(tick, 1200);
			return () => window.clearInterval(timer);
		}


		let dockBus = { open: false, tab: "clean", authOpen: false, pending: "tab", listeners: new Set() };
		function getDock() { return dockBus; }
		function setDock(patch) {
			dockBus = Object.assign({}, dockBus, patch);
			dockBus.listeners.forEach((fn) => { try { fn(dockBus); } catch { /* ignore */ } });
		}
		function useDock() {
			const [st, setSt] = useState(dockBus);
			useEffect(() => {
				const fn = (next) => setSt(next);
				dockBus.listeners.add(fn);
				return () => { dockBus.listeners.delete(fn); };
			}, []);
			return st;
		}

		function openDockClean() {
			setDock({ open: true, tab: "clean", authOpen: false, pending: "tab" });
		}
		function toggleDock() {
			if (dockBus.open) setDock({ open: false, authOpen: false, pending: "tab" });
			else openDockClean();
		}

		const DOCK_GEOM_KEY = "dsh-breach-dock-geom-v5";
		/* 默认停在右上，底边留在输入框上面。拖动之后停在用户松开的位置，只保证不拖出窗口。 */
		const DOCK_COMPOSER_CLEAR = 172;
		function defaultDockGeom() {
			const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
			const vh = typeof window !== "undefined" ? window.innerHeight : 800;
			const w = Math.min(620, Math.max(380, vw - 16));
			const y = 48;
			const h = Math.max(240, Math.min(640, vh - y - DOCK_COMPOSER_CLEAR));
			return { x: Math.max(8, vw - w - 8), y: y, w: w, h: h };
		}
		function clampDockGeom(g) {
			const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
			const vh = typeof window !== "undefined" ? window.innerHeight : 800;
			const w = Math.min(Math.max(380, Number(g && g.w) || 620), Math.max(380, vw - 16));
			const h = Math.min(Math.max(240, Number(g && g.h) || 520), Math.max(240, vh - 16));
			const x = Math.min(Math.max(8, Number(g && g.x) || 8), Math.max(8, vw - w - 8));
			const y = Math.min(Math.max(8, Number(g && g.y) || 8), Math.max(8, vh - Math.min(h, vh - 16) - 8));
			return { x: x, y: y, w: w, h: h };
		}
		function loadDockGeom() {
			try {
				const raw = JSON.parse(window.localStorage.getItem(DOCK_GEOM_KEY) || "null");
				if (raw && typeof raw === "object") return clampDockGeom(raw);
			} catch { /* ignore */ }
			return clampDockGeom(defaultDockGeom());
		}
		function saveDockGeom(g) {
			try { window.localStorage.setItem(DOCK_GEOM_KEY, JSON.stringify(clampDockGeom(g))); } catch { /* ignore */ }
		}

		const WELCOME_KEY = "dsh-breach-user-notice-v1";
		function readWelcomeAck() {
			try { return window.localStorage.getItem(WELCOME_KEY) === "1"; } catch { return false; }
		}
		function writeWelcomeAck() {
			try { window.localStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ }
		}

		function WelcomeNotice() {
			const t = useT();
			const [open, setOpen] = useState(() => !readWelcomeAck());
			const [checked, setChecked] = useState(false);
			if (!open) return null;
			const repo = safeText(t("welcome.repo"), "");
			return h(SchemeBDialog, {
				size: "lg",
				title: t("welcome.title"),
				badge: "dsh-breach",
				footer: [
					h("button", {
						key: "ok",
						type: "button",
						className: "dshp-b-btn primary",
						disabled: !checked,
						onClick: () => {
							if (!checked) return;
							writeWelcomeAck();
							setOpen(false);
						},
					}, t("welcome.ok")),
				],
			},
				h("p", { className: "dshp-b-dlg-lead" }, t("welcome.lead")),
				h("div", { className: "dshp-b-banner warn" },
					h("span", { className: "txt" }, t("welcome.warn")),
				),
				h("div", { className: "dshp-b-scroll" },
					h("p", null, t("welcome.body")),
					repo ? h("p", null,
						h("a", {
							href: repo,
							target: "_blank",
							rel: "noopener noreferrer",
							style: { wordBreak: "break-all" },
						}, repo),
					) : null,
					h("h3", null, t("welcome.bans")),
					h("div", { className: "dshp-b-notes-li" }, t("welcome.ban1")),
					h("div", { className: "dshp-b-notes-li" }, t("welcome.ban2")),
					h("div", { className: "dshp-b-notes-li" }, t("welcome.ban3")),
				),
				h("label", { className: "dshp-b-check" },
					h("input", {
						type: "checkbox",
						checked: checked,
						onChange: (e) => setChecked(!!(e && e.target && e.target.checked)),
					}),
					h("span", null, t("welcome.check")),
				),
			);
		}

		function HappyDock() {
			const t = useT();
			const st = useDock();
			// 版本号单一来源：package.json 由服务端读出，随 /dsh-breach/status 返回；前端不再写死字面量。
			const [ver, setVer] = useState("");
			useEffect(() => {
				let alive = true;
				apiJson("/dsh-breach/status")
					.then((d) => { if (alive && d && d.plugin_version) setVer(String(d.plugin_version)); })
					.catch(() => {});
				return () => { alive = false; };
			}, []);
			const [geom, setGeom] = useState(() => loadDockGeom());
			const [dockTheme, setDockTheme] = useState(detectHostTheme);
			useEffect(() => {
				const sync = () => setDockTheme(detectHostTheme());
				sync();
				const obs = new MutationObserver(sync);
				if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
				obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
				const timer = window.setInterval(sync, 1500);
				return () => { obs.disconnect(); window.clearInterval(timer); };
			}, []);
			useEffect(() => {
				ensureBreachStyles();
				const styleTag = document.createElement("style");
				styleTag.setAttribute("data-dsh-breach-drill", "1");
				styleTag.style.display = "none";
				document.head.append(styleTag);
				const widthTag = document.createElement("style");
				widthTag.setAttribute("data-dsh-breach-dock-w", "1");
				widthTag.textContent = ":root{--dshp-dock-w:" + geom.w + "px;--dshp-dock-h:" + geom.h + "px}";
				document.head.append(widthTag);
				return () => { styleTag.remove(); widthTag.remove(); };
			}, []);
			useEffect(() => {
				saveDockGeom(geom);
				const tag = document.querySelector('style[data-dsh-breach-dock-w="1"]');
				if (tag) tag.textContent = ":root{--dshp-dock-w:" + geom.w + "px;--dshp-dock-h:" + geom.h + "px}";
			}, [geom]);
			useEffect(() => {
				const onResize = () => setGeom((g) => clampDockGeom(g));
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, []);
			const onTab = () => {
				setDock({ tab: "clean", authOpen: false, pending: "tab" });
			};
			const startDrag = (e) => {
				if (e.button !== 0) return;
				if (e.target && e.target.closest && e.target.closest("button,a,input,select,textarea,label")) return;
				e.preventDefault();
				const sx = e.clientX;
				const sy = e.clientY;
				const ox = geom.x;
				const oy = geom.y;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy), w: g.w, h: g.h }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResize = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sx = e.clientX;
				const sy = e.clientY;
				const ow = geom.w;
				const oh = geom.h;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: g.x, y: g.y, w: ow + (ev.clientX - sx), h: oh + (ev.clientY - sy) }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResizeLeft = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sx = e.clientX;
				const ox = geom.x;
				const ow = geom.w;
				const move = (ev) => {
					const dx = ev.clientX - sx;
					setGeom((g) => clampDockGeom({ x: ox + dx, y: g.y, w: ow - dx, h: g.h }));
				};
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResizeRight = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sx = e.clientX;
				const ow = geom.w;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: g.x, y: g.y, w: ow + (ev.clientX - sx), h: g.h }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const startResizeBottom = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				const sy = e.clientY;
				const oh = geom.h;
				const move = (ev) => setGeom((g) => clampDockGeom({ x: g.x, y: g.y, w: g.w, h: oh + (ev.clientY - sy) }));
				const up = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", up);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", up);
			};
			const activeTab = st.tab === "prompt" || st.tab === "settings" ? st.tab : "patches";
			const body = h(SettingsRoot, { t, tab: activeTab, onVersion: setVer });
			const panel = h("div", {
				className: "dshp-dock",
				"data-theme": dockTheme === "white" ? "white" : "dusk",
				"data-open": st.open ? "1" : "0",
				style: {
					left: geom.x + "px",
					top: geom.y + "px",
					right: "auto",
					bottom: "auto",
					width: geom.w + "px",
					height: "auto",
					maxHeight: geom.h + "px",
				},
			},
				h("div", { className: "dshp-dock-head", onMouseDown: startDrag, title: "按住拖动面板" },
					h("div", { className: "dshp-dock-brand" },
						h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
							h("path", { d: "M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10Z" }),
							h("path", { d: "m8.8 11.9 2.2 2.2 4.2-4.4" }),
						),
						h("b", null, "dsh-breach"),
						h("span", { className: "dshp-dock-ver" }, ver || "—"),
					),
					h("span", { style: { flex: 1 } }),
					h("div", { className: "dshp-head-tabs", role: "tablist" },
						[
							["patches", t("tab.patches")],
							["prompt", t("tab.prompt")],
							["settings", t("tab.settings")],
						].map(([id, label]) => h("button", {
							key: id,
							type: "button",
							role: "tab",
							"aria-selected": activeTab === id ? "true" : "false",
							className: "dshp-head-tab" + (activeTab === id ? " on" : ""),
							onClick: () => setDock({ tab: id, authOpen: false }),
						}, label)),
					),
					h("button", {
						type: "button",
						className: "dshp-head-close",
						title: t("dock.close"),
						"aria-label": t("dock.close"),
						onClick: () => setDock({ open: false, authOpen: false, tab: st.tab || "patches", pending: "tab" }),
					},
						h("svg", { viewBox: "0 0 24 24", width: 15, height: 15, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" },
							h("path", { d: "M18 6 6 18M6 6l12 12" }),
						),
					),
				),
				h("div", { className: "dshp-dock-body" }, body),
				h("div", { className: "dshp-dock-resize-l", onMouseDown: startResizeLeft }),
				h("div", { className: "dshp-dock-resize-r", onMouseDown: startResizeRight }),
				h("div", { className: "dshp-dock-resize-b", onMouseDown: startResizeBottom }),
				h("div", { className: "dshp-dock-resize", onMouseDown: startResize, title: "拖动调整面板大小" }),
			);
			let portal = null;
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined" && document.body) {
					portal = rd.createPortal(panel, document.body);
				}
			} catch { /* host 可能没暴露 react-dom */ }
			return portal || panel;
		}

		/* 判断插件入口是否真的渲染出来了。
		   注意：必须查「按钮」而不是「挂载容器」。
		   HeroNewSessionMount / TabRowHappyMount 会先往宿主锚点插一个空的 div 容器，
		   再靠 react-dom 的 createPortal 把按钮渲染进去。宿主没暴露 react-dom 时，
		   容器在、按钮不在——若按容器判断就会误以为「入口已经有了」，
		   于是浮动按钮自我隐藏，页面上一个入口都看不到。 */
		function hasInlineHappyEntry() {
			if (typeof document === "undefined") return false;
			if (document.querySelector("[data-testid='dsh-breach-hero-chip'], [data-testid='dsh-breach-tab-chip']")) return true;
			const nodes = document.querySelectorAll("button, [role='tab'], [role='button'], [class*='chip']");
			for (let i = 0; i < nodes.length; i += 1) {
				const el = nodes[i];
				if (!el || el.classList.contains("dshp-launch")) continue;
				if (el.closest && el.closest(".dshp-dock, .dshp-launch")) continue;
				if (String(el.textContent || "").trim() === "dsh-breach") return true;
			}
			return false;
		}

		function HappyLauncher() {
			const t = useT();
			const st = useDock();
			const [hide, setHide] = useState(hasInlineHappyEntry);
			useEffect(() => {
				const sync = () => setHide(hasInlineHappyEntry());
				sync();
				const obs = typeof MutationObserver !== "undefined"
					? new MutationObserver(sync)
					: null;
				if (obs && document.body) obs.observe(document.body, { childList: true, subtree: true });
				const iv = setInterval(sync, 800);
				return () => {
					if (obs) obs.disconnect();
					clearInterval(iv);
				};
			}, []);
			if (st.open || hide) return null;
			return h("button", {
				type: "button",
				className: "dshp-launch",
				"data-open": "0",
				"data-hide": "0",
				"data-testid": "dsh-breach-launch",
				title: t("dock.newSession"),
				onClick: () => toggleDock(),
			},
				BrandShieldIcon(""),
				t("dock.newSession"),
			);
		}

		/** 行内反引号 `code` 与 **加粗** 转为精致行内元素。 */
		function renderInlineMarkdown(text) {
			const parts = String(text || "").split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
			return parts.map((seg, idx) => {
				if (seg.length >= 2 && seg.startsWith("`") && seg.endsWith("`")) {
					return h("code", { key: idx, className: "dshp-b-code" }, seg.slice(1, -1));
				}
				if (seg.length >= 4 && seg.startsWith("**") && seg.endsWith("**")) {
					return h("b", { key: idx }, seg.slice(2, -2));
				}
				return seg;
			});
		}

		/** 把 CHANGELOG.md 的纯文本渲染成方案 B 卡片块：版本标题、分类徽章、圆点列表与行内代码胶囊。 */
		function renderUpdateNotes(text) {
			const lines = String(text || "").split(/\r?\n/);
			return lines.map((line, index) => {
				const s = line.trim();
				if (!s) return h("div", { key: index, style: { height: 4 } });
				if (/^#{1,2}\s/.test(s)) {
					return h("div", { key: index, className: "dshp-b-notes-h2" }, renderInlineMarkdown(s.replace(/^#{1,2}\s+/, "")));
				}
				if (/^#{3,4}\s/.test(s)) {
					return h("div", { key: index }, h("span", { className: "dshp-b-notes-h3" }, s.replace(/^#{3,4}\s+/, "")));
				}
				if (/^[-*]\s/.test(s)) {
					return h("div", { key: index, className: "dshp-b-notes-li" }, renderInlineMarkdown(s.replace(/^[-*]\s+/, "")));
				}
				return h("div", { key: index, style: { fontSize: "12.5px" } }, renderInlineMarkdown(s));
			});
		}

		/** 更新确认弹窗（方案 B）：深石墨顶栏 + 版本胶囊 + 纯白更新说明内卡 + 蓝主色更新按钮。 */
		function UpdateDialog(props) {
			const t = props.t;
			const info = props.info || {};
			const notes = typeof info.notes === "string" ? info.notes.trim() : "";
			const from = safeText(info.localVersion, "");
			const to = safeText(info.remoteVersion, "");
			const badge = from && to && from !== to ? (from + " → " + to) : (to || from || "update");
			return h(SchemeBDialog, {
				title: t("updDialog.title"),
				badge,
				busy: props.busy,
				onClose: props.onClose,
				footer: [
					h("button", { key: "later", type: "button", className: "dshp-b-btn", disabled: props.busy, onClick: props.onClose }, t("updDialog.later")),
					h("button", { key: "now", type: "button", className: "dshp-b-btn primary", disabled: props.busy, onClick: props.onConfirm },
						props.busy ? t("updDialog.updating") : t("updDialog.now")),
				],
			},
				notes
					? h("div", { className: "dshp-b-scroll" }, renderUpdateNotes(notes))
					: h("div", { className: "dshp-b-card", style: { fontSize: "12.5px", color: "var(--dk-mute)" } }, t("updDialog.noNotes")),
				props.err ? h("div", { className: "dshp-b-note bad" }, safeText(props.err, "")) : null,
			);
		}

		function HeroUpdatePill() {
			const t = useT();
			const [info, setInfo] = useState(null);
			const [busy, setBusy] = useState(false);
			const [err, setErr] = useState("");
			const [open, setOpen] = useState(false);
			useEffect(() => {
				let dead = false;
				const tick = () => {
					apiJson("/dsh-breach/update")
						.then((d) => { if (!dead && d && d.ok) { setInfo(d); setErr(""); } })
						.catch(() => { if (!dead) setInfo(null); });
				};
				tick();
				const iv = setInterval(tick, 10 * 60 * 1000);
				return () => { dead = true; clearInterval(iv); };
			}, []);
			const run = () => {
				if (busy) return;
				setBusy(true);
				setErr("");
				apiJson("/dsh-breach/update", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ op: "apply" }),
				})
					.then((d) => {
						if (!d || !d.ok) throw new Error((d && d.error) || "failed");
						setBusy(false);
						setInfo(null);
						setOpen(false);
					})
					.catch((e) => { setBusy(false); setErr(String((e && e.message) || e)); });
			};
			// 有更新才出胶囊；弹窗打开期间即使 info 被清空也要继续渲染它。
			if (!open && !busy && !(info && info.hasUpdate)) return null;
			// 只报目标版本，不做「当前 → 目标」比较，避免版本顺序引起误读。
			const detail = info && info.remoteVersion ? " " + info.remoteVersion : "";
			return h(react.Fragment, null,
				!open ? h("button", {
					type: "button",
					className: "dshp-update-pill" + (err ? " is-bad" : ""),
					disabled: busy,
					title: err ? t("updPill.fail") + ": " + err : t("updPill.title") + detail,
					onClick: () => { setErr(""); setOpen(true); },
				}, busy ? t("updPill.busy") : t("updPill.label")) : null,
				open ? h(UpdateDialog, {
					info,
					busy,
					err,
					t,
					onClose: () => { if (!busy) { setErr(""); setOpen(false); } },
					onConfirm: run,
				}) : null,
			);
		}

		/** 首屏胶囊的图标：与宿主那排控件同款线性图标（14px，描边走 currentColor）。 */
		function HeroChipIcon() {
			return h("svg", {
				viewBox: "0 0 24 24",
				width: 14,
				height: 14,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.8,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				className: "dshp-hero-chip-icon",
			},
				h("path", { d: "M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10Z" }),
				h("path", { d: "m8.8 11.9 2.2 2.2 4.2-4.4" }),
			);
		}

		/** 首页：模式旁挂「dsh-breach」→ 打开插件。 */
		function HeroNewSessionMount() {
			const t = useT();
			const st = useDock();
			const [host, setHost] = useState(null);
			useEffect(() => {
				let dead = false;
				let warnedMiss = false;
				const ensure = () => {
					if (dead || typeof document === "undefined") return;
					/* 多路挂点兜底:语义化 data-* 优先,class 子串模糊匹配兜底(不绑定具体 CSS Module 哈希) */
					const row =
						document.querySelector('[data-dsh-hero-workspace-row]') ||
						document.querySelector('[data-conversation-hero]') ||
						document.querySelector('[class*="heroWorkspaceRow" i]') ||
						document.querySelector('[class*="hero" i][class*="workspace" i][class*="row" i]');
					if (!row) {
						if (!warnedMiss) {
							warnedMiss = true;
							try { console.warn("[dsh-breach] HeroNewSessionMount: anchor row missing (host 可能改版)"); } catch { /* ignore */ }
						}
						setHost((prev) => (prev ? null : prev));
						return;
					}
					warnedMiss = false;
					let el = row.querySelector(":scope > .dshp-hero-chip");
					/* 宿主这一行是 flex：左边「工作区」「模式」，右侧 [class*="heroOptions"] 带 margin-left:auto。
					   直接 append 会被 auto 挤到最右边；插在 heroOptions 前面才紧挨「模式」下拉。 */
					const options = row.querySelector(':scope > [class*="heroOptions" i]');
					if (!el) {
						el = document.createElement("div");
						el.className = "dshp-hero-chip";
						el.setAttribute("data-testid", "dsh-breach-hero-chip");
						if (options) row.insertBefore(el, options);
						else row.appendChild(el);
					} else if (options && el.nextElementSibling !== options) {
						row.insertBefore(el, options);
					}
					setHost((prev) => (prev === el ? prev : el));
				};
				ensure();
				const obs = typeof MutationObserver !== "undefined"
					? new MutationObserver(() => ensure())
					: null;
				if (obs) obs.observe(document.body, { childList: true, subtree: true });
				const iv = setInterval(ensure, 1000);
				return () => {
					dead = true;
					if (obs) obs.disconnect();
					clearInterval(iv);
				};
			}, []);
			if (!host) return null;
			const btn = h("button", {
				type: "button",
				className: "dshp-hero-chip-btn" + (st.open ? " on" : ""),
				title: t("dock.newSession"),
				onClick: () => toggleDock(),
			},
				HeroChipIcon(),
				st.open ? h("span", { className: "dshp-live-dot", "aria-hidden": "true" }) : null,
				t("dock.newSession"),
				// 纯装饰的下拉箭头：与宿主 chip 的 chevron 同尺寸（14px、label-tertiary），不绑任何事件。
				h("span", { className: "dshp-hero-chip-chev", "aria-hidden": "true" },
					h("svg", {
						viewBox: "0 0 24 24", width: 14, height: 14, fill: "none",
						stroke: "currentColor", strokeWidth: 2,
						strokeLinecap: "round", strokeLinejoin: "round",
					}, h("path", { d: "m6 9 6 6 6-6" })),
				),
			);
			try {
				const rd = require("react-dom");
				const node = h(react.Fragment, null, btn, h(HeroUpdatePill, null));
				if (rd && typeof rd.createPortal === "function") return rd.createPortal(node, host);
			} catch { /* host 可能没暴露 react-dom */ }
			return null;
		}

		/** 挂在「对话 / 轨迹 / 上下文」这一排，紧挨上下文。 */
		function TabRowHappyMount() {
			const t = useT();
			const st = useDock();
			const [host, setHost] = useState(null);
			useEffect(() => {
				let dead = false;
				let warnedMiss = false;
				const ensure = () => {
					if (dead || typeof document === "undefined") return;
					/* 多路挂点兜底:data-* 优先,ARIA / class 子串兜底 */
					const row =
						document.querySelector("[data-conversation-tabs]") ||
						document.querySelector("[data-conversation-tabrow]") ||
						document.querySelector("[role='tablist'][aria-label*='对话' i]") ||
						document.querySelector("[class*='conversation' i][class*='tab' i][class*='row' i]");
					if (!row) {
						if (!warnedMiss) {
							warnedMiss = true;
							try { console.warn("[dsh-breach] TabRowHappyMount: tab row anchor missing"); } catch { /* ignore */ }
						}
						setHost((prev) => (prev ? null : prev));
						return;
					}
					warnedMiss = false;
					let el = row.querySelector(":scope > .dshp-tab-chip");
					if (!el) {
						el = document.createElement("div");
						el.className = "dshp-tab-chip";
						el.setAttribute("data-testid", "dsh-breach-tab-chip");
						row.appendChild(el);
					}
					setHost((prev) => (prev === el ? prev : el));
				};
				ensure();
				const obs = typeof MutationObserver !== "undefined"
					? new MutationObserver(() => ensure())
					: null;
				if (obs) obs.observe(document.body, { childList: true, subtree: true });
				const iv = setInterval(ensure, 1000);
				return () => {
					dead = true;
					if (obs) obs.disconnect();
					clearInterval(iv);
				};
			}, []);
			if (!host) return null;
			const btn = h("button", {
				type: "button",
				className: "dshp-tab-btn" + (st.open ? " on" : ""),
				title: st.open ? (t("dock.inSession") + " · 已开启") : (t("dock.inSession") + " · 点击打开"),
				onClick: () => toggleDock(),
			}, t("dock.inSession"));
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function") return rd.createPortal(btn, host);
			} catch { /* host 可能没暴露 react-dom */ }
			return null;
		}


		function installRewindUi(ctx) {
			rewindHost = ctx;
			rewindSessions = ctx.sessions;
			rewindWorkspace = ctx.uiWorkspace || null;
			rewindConversation = ctx.conversation || null;
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "dsh-breach-rewind",
				order: 20,
				inject: (sessionId) => ({
					sessionId,
					t: translate,
				}),
			}, RewindSafe));
			ctx.effect(() => installRewindWatch(ctx), "dsh-breach: rewind watch");
		}

		function apply(ctx) {
			ctx.effect(() => { ensureBreachStyles(); }, "dsh-breach: global styles");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-breach: dictionaries");
			const bound = ctx.locale.bind(NS);
			// 统一收敛：DSH 0.2.2 起 locale 返回值可能是 {kind, text} 之类的对象，
			// 直接进 React children 会抛 error #31 并拖垮整个 overlay entry。
			const t = (key, params) => safeText(bound(key, params), key);
			translate = t;
			// 门禁依赖已随演练台删除，不能再挂到共享 overlay，
			// 否则其 effect 抛错会让宿主卸载同组的入口和设置面板。
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-breach-dock",
				order: 50,
			}, () => h(react.Fragment, null,
				h(SlotSafe, { label: "welcome" }, h(WelcomeNotice)),
				h(SlotSafe, { label: "launcher" }, h(HappyLauncher)),
				h(SlotSafe, { label: "dock" }, h(HappyDock)),
				h(SlotSafe, { label: "hero" }, h(HeroNewSessionMount)),
				h(SlotSafe, { label: "tabrow" }, h(TabRowHappyMount)))));
			try {
				if (typeof ctx.inject === "function") {
					ctx.inject(["sessions", "uiWorkspace", "workspaces", "conversation"], (host) => installRewindUi(host));
				} else if (ctx.sessions) {
					installRewindUi(ctx);
				}
			} catch (e) {
				try {
					if (typeof ctx.inject === "function") {
						ctx.inject(["sessions", "uiWorkspace", "conversation"], (host) => installRewindUi(host));
					}
				} catch (e2) {
					try { console.warn("[dsh-breach] rewind ui skipped:", e2 || e); } catch { /* ignore */ }
				}
			}
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
