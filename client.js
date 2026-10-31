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
		function hostText(t, key, surface) {
			if (surface && surface !== "web") {
				const specific = key + "." + surface;
				const hit = t(specific);
				if (hit && hit !== specific) return hit;
			}
			return t(key);
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
			"updPill.title": "有新版本可用，点一下自动更新",
			"updPill.busy": "更新中…",
			"updPill.fail": "更新失败",
			"dock.inSession": "dsh-breach",
			"dock.full": "全面浏览",
			"dock.close": "收起",
			"dock.unauthorized": "未授权",
			"welcome.title": "用户须知",
			"welcome.lead": "首次安装本插件时请阅读以下说明。确认后本窗不再弹出。",
			"welcome.warn": "本插件免费开源。任何背着作者私自售卖、付费倒卖或借本项目盈利的行为，作者将依法追究法律责任。",
			"welcome.body": "dsh-breach 是 DeepSeek Harness 的本机网络安全红队评测与清洗插件：在受控本机环境中调整提示词与补丁。项目免费、非营利。",
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
			"warn.noInject": "官方始终用默认提示词。红队开了规则集就只用规则集；没开时用去掉 CTF 的默认提示词，再接红队操作。两边都空会提示必须添加。",
			"need.prompt": "提示词和规则集都是空的，必须先添加提示词，或启用一条有内容的规则集。",
			"btn.restoreInject": "恢复默认",
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
			"restart.timeout": "超时，请刷新",
			"restart.fail": "失败: {error}",
			"restart.notStarted": "重启没有开始，客户端还在。不会自动再试。",
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
			"updPill.title": "New version available — click to update",
			"updPill.busy": "Updating…",
			"updPill.fail": "Update failed",
			"dock.inSession": "dsh-breach",
			"dock.full": "Full view",
			"dock.close": "Collapse",
			"dock.unauthorized": "Unauthorized",
			"welcome.title": "User notice",
			"welcome.lead": "Please read this on first install. After you confirm, it will not appear again.",
			"welcome.warn": "This plugin is free and open source. Anyone who sells, resells, or profits from it behind the author's back may face legal action.",
			"welcome.body": "dsh-breach is a local DeepSeek Harness plugin for security evaluation and cleaning: adjust prompts and patches on a machine you control. Free and non-profit.",
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
			"warn.noInject": "Official mode always uses the default prompt. Red team uses only the active rule set; otherwise it uses the default prompt without the CTF section, then the red team steps. If both are empty you will be asked to add a prompt.",
			"need.prompt": "Both the prompt and the rule set are empty. Add a prompt, or enable a rule that has content.",
			"btn.restoreInject": "Reset default",
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
			"restart.timeout": "Timed out; refresh",
			"restart.fail": "Failed: {error}",
			"restart.notStarted": "Restart did not start. This client is still open, and it will not try again by itself.",
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
.dshp-root{--dshp-display:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif;--dshp-sans:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif;--dshp-mono:ui-monospace,"Cascadia Mono",Consolas,"Courier New",monospace;--dshp-led:#22C55E;--dshp-ease:cubic-bezier(.16,1,.3,1);max-width:920px;display:flex;flex-direction:column;gap:18px;padding:16px;border-radius:12px;background:var(--dshp-bg);color:var(--dshp-ink);font-family:var(--dshp-sans)}
.dshp-root{--dshp-bg:transparent;--dshp-paper:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#f6f4ef) 74%,transparent);--dshp-ink:var(--dsw-alias-label-primary,#1a1916);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#1a1916) 74%,var(--dsw-alias-label-secondary,#5c564c));--dshp-line:color-mix(in srgb,var(--dsw-alias-border-l1,#c8c2b6) 78%,transparent);--dshp-fill:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 14%,transparent);--dshp-accent:var(--dsw-alias-brand-primary,#748B6F);--dshp-accent-soft:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 18%,transparent);--dshp-ok:#748B6F;--dshp-warn:#8a5a12;--dshp-bad:#9a3434;--cd-bg:#FCFAF5;--cd-field:#FFFDF9;--cd-line:#EDE6D9;--cd-line-soft:#EFE9DD;--cd-line-dim:#F3EEE4;--cd-line-btn:#E7DFD0;--cd-ink:#1F1E1C;--cd-ink2:#3A3833;--cd-mute:#6B6862;--cd-faint:#A29E95;--cd-hover:#FAF6EE;--cd-hover2:#F6F1E7;--cd-focus:#D8CDB8;--cd-code:#F0EAE0;--cd-ok:#748B6F;--cd-bad:#C0392B;--cd-warn:#A96C16;--cd-off:#CFCBC2;--cd-track:#E0D8C8;--cd-knob:#FFFDF9}
.dshp-root[data-theme="white"]{color-scheme:light;background:#FFFDF9;--dshp-paper:#FBF7EF;--dshp-line:#EDE6D9}
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
.dshp-restart-mask{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(38,32,24,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:var(--dshp-sans,system-ui,sans-serif)}
.dshp-restart-card{width:min(408px,100%);box-sizing:border-box;padding:22px 22px 18px;border-radius:14px;background:#FFFDF9;color:#1F1E1C;border:1px solid #EDE6D9;box-shadow:0 20px 54px rgba(60,48,30,.22),0 2px 8px rgba(60,48,30,.06)}
.dshp-restart-card h4{margin:0 0 9px;font-family:inherit;font-size:16px;font-weight:660;letter-spacing:-.2px;line-height:1.4;color:#1F1E1C}
.dshp-restart-card p{margin:0 0 18px;font-size:13px;font-weight:400;line-height:1.7;color:#6B6862}
.dshp-restart-card .dshp-modal-ops{display:flex;justify-content:flex-end;gap:9px}
.dshp-restart-card .dshp-btn{min-width:0;min-height:32px;padding:0 15px;border-radius:8px;font-size:12.5px;font-weight:550;font-family:inherit;color:#3A3833;background:#FFFDF9;border:1px solid #E7DFD0;cursor:pointer;transition:background .15s}
.dshp-restart-card .dshp-btn:hover{background:#FAF6EE}
.dshp-restart-card .dshp-btn-primary,.dshp-restart-card .dshp-btn-primary:hover:not(:disabled){color:#FFFDF9;background:#D05663;border-color:#D05663;font-weight:600}
.dshp-restart-card .dshp-btn-primary:hover:not(:disabled){background:#BC4754}
body[data-ds-dark-theme] .dshp-restart-card,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card{background:#211F1C;color:#EFEBE2;border-color:#332F29;box-shadow:0 20px 54px rgba(0,0,0,.5)}
body[data-ds-dark-theme] .dshp-restart-card h4,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card h4{color:#EFEBE2}
body[data-ds-dark-theme] .dshp-restart-card p,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card p{color:#9A948A}
body[data-ds-dark-theme] .dshp-restart-card .dshp-btn,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn{color:#DDD8CD;background:#26231F;border-color:#332F29}
body[data-ds-dark-theme] .dshp-restart-card .dshp-btn-primary,body[data-ds-dark-theme] .dshp-restart-card .dshp-btn-primary:hover:not(:disabled),.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn-primary,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn-primary:hover:not(:disabled){color:#2A1215;background:#D05663;border-color:#D05663}
body[data-ds-dark-theme] .dshp-restart-card .dshp-btn-primary,body[data-ds-dark-theme] .dshp-restart-card .dshp-btn-primary:hover:not(:disabled),.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn-primary,.dshp-restart-mask[data-theme="dusk"] .dshp-restart-card .dshp-btn-primary:hover:not(:disabled){color:#fff;background:#D05663;border-color:#D05663}
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

.dshp-dock{position:fixed;top:12px;right:12px;z-index:10050;display:flex;flex-direction:column;width:var(--dshp-dock-w,620px);height:var(--dshp-dock-h,72vh);min-width:380px;min-height:320px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);box-sizing:border-box;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,var(--dshp-paper,#1c1c1c)) 52%,transparent);backdrop-filter:blur(22px) saturate(1.35);-webkit-backdrop-filter:blur(22px) saturate(1.35);border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,var(--dshp-line,#555)) 65%,transparent);border-radius:12px;box-shadow:0 18px 48px color-mix(in srgb,#000 30%,transparent),0 0 0 1px color-mix(in srgb,#fff 6%,transparent);pointer-events:auto;color:var(--dsw-alias-label-primary,var(--dshp-ink,#f2f2f2));overflow:visible}
.dshp-dock[data-open="0"]{display:none}
.dshp-launch{position:fixed;right:16px;bottom:16px;z-index:10040;appearance:none;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#1c1c1c) 72%,transparent);color:var(--dsw-alias-label-primary,#f2f2f2);cursor:pointer;font:13px/1 inherit;box-shadow:0 8px 22px color-mix(in srgb,#000 28%,transparent);pointer-events:auto}
.dshp-launch:hover{border-color:var(--dsw-alias-brand-primary,#748B6F);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 18%,transparent)}
.dshp-launch[data-open="1"],.dshp-launch[data-hide="1"]{display:none}
.dshp-dock-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,var(--dshp-line,#555)) 55%,transparent);background:transparent;cursor:grab;user-select:none;touch-action:none;color:var(--dsw-alias-label-primary,var(--dshp-ink,#f2f2f2));border-radius:12px 12px 0 0}
.dshp-dock-head:active{cursor:grabbing}
.dshp-dock-head b{font-size:14px;font-weight:600;color:inherit;text-shadow:0 1px 0 color-mix(in srgb,#000 18%,transparent)}
.dshp-dock-head button{cursor:pointer;color:inherit;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,rgba(127,127,127,.18)) 55%,transparent)}
.dshp-dock-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;background:transparent;border-radius:0 0 12px 12px}
.dshp-dock-body .dshp-root{max-width:none;height:100%;flex:1;min-height:0;overflow:auto;background:transparent!important;--dshp-bg:transparent;--dshp-paper:color-mix(in srgb,var(--dshp-ink) 7%,transparent);--dshp-fill:color-mix(in srgb,var(--dshp-ink) 6%,transparent);--dshp-line:color-mix(in srgb,var(--dshp-ink) 20%,transparent);--dshp-accent-soft:color-mix(in srgb,var(--dshp-accent) 22%,transparent)}.dshp-dock-body .dshp-panel,.dshp-dock-body .dshp-metric,.dshp-dock-body .dshp-group,.dshp-dock-body .dshp-editor,.dshp-dock-body .dshp-active,.dshp-dock-body .dshp-ask,.dshp-dock-body .dshp-create,.dshp-dock-body .dshp-table,.dshp-dock-body .dshp-cwd-list,.dshp-dock-body .dshp-cwd-item{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#f7f4ee) 74%,transparent)!important;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 32%,transparent)!important;color:var(--dshp-ink)!important;box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 32%,transparent);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3)}
.dshp-dock-body .dshp-field,.dshp-dock-body .dshp-area{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 88%,transparent)!important;color:var(--dshp-ink)!important;border-color:color-mix(in srgb,var(--dsw-alias-border-l1,#8a8478) 72%,transparent)!important}
.dshp-dock-body select.dshp-field,.dshp-dock-body .dshp-field.dshp-ver{background:var(--dsw-alias-bg-layer-1,#fff)!important;color:var(--dshp-ink)!important;color-scheme:inherit}
.dshp-dock[data-theme="white"] select.dshp-field option,.dshp-dock[data-theme="white"] .dshp-field.dshp-ver option{background:#fff;color:#16140f}
.dshp-dock[data-theme="dusk"] select.dshp-field option,.dshp-dock[data-theme="dusk"] .dshp-field.dshp-ver option{background:#1b1d22;color:#f4f1ea}.dshp-dock-body .dshp-title,.dshp-dock-body .dshp-sub h4,.dshp-dock-body .dshp-group-h strong,.dshp-dock-body .dshp-metric b{font-family:inherit;font-weight:650;letter-spacing:0;color:var(--dshp-ink)!important;text-shadow:none}.dshp-dock-body .dshp-mute,.dshp-dock-body .dshp-kicker,.dshp-dock-body .dshp-metric span,.dshp-dock-body .dshp-group-h em,.dshp-dock-body .dshp-count,.dshp-dock-body .dshp-hint{color:var(--dshp-mute)!important;font-weight:500;text-shadow:none}
.dshp-dock-body .rt-dock{position:relative;inset:auto;width:100%!important;height:100%;max-width:none!important;flex:1;min-height:0;min-width:0;display:flex!important;flex-direction:column;box-shadow:none;border:0;transform:none!important;opacity:1!important;pointer-events:auto!important;background:transparent!important}
.dshp-dock-body .rt-grip{display:none!important}
.dshp-dock-body .rt-embedded>.rt-head,.dshp-dock-body .rt-tabs,.dshp-dock-body .rt-foot{flex:none}
.dshp-dock-body .rt-body{flex:1;min-height:0;overflow:hidden!important;background:transparent!important}
.dshp-dock-body .rt-main{min-height:0;flex:1;overflow:hidden}
.dshp-dock-body .rt-pane{min-height:0;overflow:auto!important}
.dshp-dock-body .rt-embedded>.rt-head{padding:8px 12px}
.dshp-dock-body .rt-embedded>.rt-head .rt-title{font-size:14px;letter-spacing:0}
.dshp-dock-body .rt-tabs{gap:2px;padding:6px 10px 0;flex-wrap:wrap}
.dshp-dock-body .rt-tab{border-radius:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:8px 9px 7px;background:transparent;font-size:14px}
.dshp-dock-body .rt-tab.on{border-bottom-color:var(--dsw-alias-brand-primary,#748B6F);background:transparent;font-weight:650}
.dshp-dock-body .rt-row:hover,.dshp-dock-body .rt-item:hover,.dshp-dock-body .rt-item.on,.dshp-dock-body .rt-seg:hover,.dshp-dock-body .rt-seg.on,.dshp-dock-body .rt-vrow:hover,.dshp-dock-body .rt-score-row:hover{background:var(--rt-surf-2)!important}
body:not([data-ds-dark-theme]) .dshp-auth-modal{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fffcf7) 92%,transparent);color:var(--dsw-alias-label-primary,#1a1916);border-color:color-mix(in srgb,var(--dsw-alias-border-l1,#c9c3b6) 80%,transparent);backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3)}
body:not([data-ds-dark-theme]) .dshp-auth-legal{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f3f0e8) 90%,transparent);color:var(--dsw-alias-label-primary,#1a1916);border-color:color-mix(in srgb,var(--dsw-alias-border-l1,#c9c3b6) 80%,transparent)}
body:not([data-ds-dark-theme]) .dshp-auth-warn{background:color-mix(in srgb,#f5e6c8 88%,transparent);color:#6b4a10}
body:not([data-ds-dark-theme]) .dshp-auth-ops button{border-color:var(--dsw-alias-border-l1,#c9c3b6);color:var(--dsw-alias-label-primary,#1a1916);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 88%,transparent)}
body:not([data-ds-dark-theme]) .dshp-auth-ops button.primary{background:var(--dsw-alias-brand-primary,#748B6F);border-color:var(--dsw-alias-brand-primary,#748B6F);color:#fff}
.dshp-dock-resize,.dshp-dock-resize-l,.dshp-dock-resize-r,.dshp-dock-resize-b{position:absolute;z-index:60;pointer-events:auto;touch-action:none}
.dshp-dock-resize{right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 46%,color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 75%,transparent) 46%);border-radius:0 0 12px 0;opacity:.95}
.dshp-dock-resize-l{left:-2px;top:0;bottom:0;width:10px;cursor:ew-resize;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 18%,transparent)}
.dshp-dock-resize-l:hover,.dshp-dock-resize-r:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 42%,transparent)}
.dshp-dock-resize-r{right:-2px;top:0;bottom:22px;width:10px;cursor:ew-resize;background:transparent}
.dshp-dock-resize-b{left:10px;right:22px;bottom:-2px;height:10px;cursor:ns-resize;background:transparent}
.dshp-dock-resize-b:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 35%,transparent)}
.dshp-auth-mask{position:fixed;inset:0;z-index:10100;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:auto}
.dshp-auth-modal{width:min(680px,100%);max-height:min(88vh,820px);display:flex;flex-direction:column;gap:10px;padding:16px;border:1px solid var(--dsw-alias-border-l1,#333);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#1a1a1a);color:var(--dsw-alias-label-primary,#eee)}
.dshp-auth-modal h2{margin:0;font-size:16px;font-weight:600}
.dshp-auth-warn{padding:8px 10px;border-radius:8px;background:#3a2e18;color:#f0d48a;font-size:13px}
.dshp-auth-legal{overflow:auto;height:300px;margin:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#333);border-radius:8px;background:#121212;font-size:13px;line-height:1.55}
.dshp-auth-legal h3{margin:14px 0 4px;font-size:13px}
.dshp-auth-legal h3:first-child{margin-top:0}
.dshp-auth-legal p{margin:0 0 8px}
.dshp-auth-checks{display:flex;flex-direction:column;gap:8px;font-size:13px}
.dshp-auth-checks label{display:flex;gap:8px;align-items:flex-start}
.dshp-auth-checks label.locked{opacity:.45}
.dshp-auth-ops{display:flex;justify-content:flex-end;gap:8px}
.dshp-auth-ops button,.dshp-dock-head button{appearance:none;border:1px solid var(--dsw-alias-border-l1,#444);background:transparent;color:inherit;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit}
.dshp-auth-ops button.primary{background:#748B6F;border-color:#748B6F}
.dshp-auth-ops button:disabled{opacity:.45;cursor:default}
.dshp-icon-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 45%,transparent);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;font:13px/1 inherit;white-space:nowrap;flex:0 0 auto}
.dshp-icon-btn:hover{border-color:var(--dsw-alias-brand-primary,#748B6F);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 12%,transparent);color:var(--dsw-alias-label-primary,currentColor)}
.dshp-icon-btn.on{border-color:var(--dsw-alias-brand-primary,#748B6F);color:var(--dsw-alias-brand-primary,#748B6F);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 16%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 28%,transparent)}
.dshp-hbtn{appearance:none;display:inline-flex;flex:0 0 auto;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 55%,transparent);background:transparent;color:var(--dsw-alias-label-secondary,currentColor);cursor:pointer;font:12px/1 inherit;padding:5px 10px;border-radius:8px;white-space:nowrap}
.dshp-hbtn:hover{border-color:var(--dsw-alias-brand-primary,#748B6F);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 12%,transparent);color:var(--dsw-alias-label-primary,currentColor)}
.dshp-hbtn.on{border-color:var(--dsw-alias-brand-primary,#748B6F);color:var(--dsw-alias-brand-primary,#748B6F);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 18%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 32%,transparent)}
.dshp-live-dot{width:6px;height:6px;border-radius:999px;flex:none;background:var(--dshp-led,#22C55E);box-shadow:0 0 0 2px color-mix(in srgb,var(--dshp-led,#22C55E) 22%,transparent)}
.dshp-hero-chip{display:inline-flex;align-items:center;gap:2px;flex:0 0 auto;align-self:center}
/* 与宿主首屏 chip 同规格：min-height 28px / 13px 500 / line-height 20px / gap 4px / padding 0 8px；
   字色在 label-primary 上留 12% 透明度（彩色背景自适应，不靠写死灰值），hover 回到全量。 */
.dshp-hero-chip-btn{appearance:none;display:inline-flex;align-items:center;gap:4px;min-height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,7px);background:transparent;color:color-mix(in srgb,var(--dsw-alias-label-primary,currentColor) 88%,transparent);cursor:pointer;font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;transition:background .15s,color .15s}
.dshp-hero-chip-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-label-primary,currentColor)}
.dshp-hero-chip-btn.on{color:var(--dshp-accent,#748B6F)}
.dshp-hero-chip-icon{width:16px;height:16px;flex:none;color:inherit}
.dshp-hero-chip-btn.on .dshp-hero-chip-icon{color:var(--dshp-accent,#748B6F)}
/* 装饰用下拉箭头：与宿主 chip 的 chevron 同尺寸，颜色比文字更淡。 */
.dshp-hero-chip-chev{width:14px;height:14px;flex:none;display:inline-grid;place-items:center;color:var(--dsw-alias-label-tertiary,#8b8f95);pointer-events:none}
.dshp-update-pill{appearance:none;display:inline-flex;align-items:center;height:20px;padding:0 8px;border:0;border-radius:999px;background:#4E8A4A;color:#fff;font:11.5px/1 inherit;font-weight:600;letter-spacing:.2px;cursor:pointer;white-space:nowrap;transition:background .15s}
.dshp-update-pill:hover{background:#447A41}
.dshp-update-pill:disabled{opacity:.65;cursor:default}
.dshp-update-pill.is-bad{background:#9a3434}
.dshp-tab-chip{display:inline-flex;align-items:flex-end;flex:0 0 auto}
.dshp-tab-btn{appearance:none;position:relative;border:none;background:transparent;cursor:pointer;padding:0 0 9px;font:500 13px/16px inherit;color:var(--dsw-alias-label-tertiary,currentColor);white-space:nowrap}
.dshp-tab-btn:hover{color:var(--dsw-alias-label-primary,currentColor)}
.dshp-tab-btn.on{color:var(--dsw-alias-brand-primary,#748B6F)}
.dshp-tab-btn.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary,#748B6F)}
/* 玻璃跟随宿主颜色。字重和底的不透明度分开：壳透，字坐在更实的一层上。 */
.dshp-dock{font-family:"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans SC",system-ui,sans-serif;font-size:14px;line-height:1.6;font-weight:500;-webkit-font-smoothing:antialiased;text-shadow:none}
.dshp-dock[data-theme="white"],.dshp-dock[data-theme="dusk"]{background:linear-gradient(165deg,color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 50%,transparent),color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 18%,transparent) 46%,color-mix(in srgb,var(--dsw-alias-bg-layer-2,#fff) 28%,transparent))!important;backdrop-filter:blur(26px) saturate(1.45)!important;-webkit-backdrop-filter:blur(26px) saturate(1.45)!important;color:var(--dshp-ink)!important;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 36%,transparent)!important;box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 42%,transparent),0 18px 44px color-mix(in srgb,#000 18%,transparent)!important}
.dshp-dock[data-theme="dusk"]{--dshp-ink:var(--dsw-alias-label-primary,#f4f1ea);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#f4f1ea) 84%,var(--dsw-alias-label-secondary,#c9c3b8))}
.dshp-dock[data-theme="white"]{--dshp-ink:var(--dsw-alias-label-primary,#16140f);--dshp-mute:color-mix(in srgb,var(--dsw-alias-label-primary,#16140f) 76%,var(--dsw-alias-label-secondary,#3c362e))}.dshp-dock .dshp-dock-head{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,transparent) 28%,transparent)!important;color:var(--dshp-ink)!important}.dshp-dock .dshp-dock-head,.dshp-dock .dshp-dock-head b,.dshp-dock .dshp-dock-head button{color:var(--dshp-ink)!important;text-shadow:none!important;font-weight:600}
.dshp-dock-body .rt-dock{font-size:14px!important;line-height:1.6!important;font-weight:500!important;color:var(--dshp-ink)!important;--rt-ink:var(--dshp-ink);--rt-mute:var(--dshp-mute);--rt-surf:color-mix(in srgb,var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1,#fff)) 40%,transparent);--rt-surf-2:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 62%,transparent);--rt-line:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 30%,transparent)}
.dshp-dock-body .rt-title,.dshp-dock-body .rt-tab,.dshp-dock-body .rt-tab.on,.dshp-dock-body .rt-card,.dshp-dock-body .rt-card h4,.dshp-dock-body .rt-row,.dshp-dock-body .rt-vrow,.dshp-dock-body .rt-kv,.dshp-dock-body .rt-kv b,.dshp-dock-body .rt-kv span,.dshp-dock-body .rt-mono,.dshp-dock-body .rt-empty,.dshp-dock-body .rt-foot,.dshp-dock-body .rt-tag,.dshp-dock-body .rt-item,.dshp-dock-body .rt-item-name,.dshp-dock-body .rt-item-desc,.dshp-dock-body .rt-sec-sub,.dshp-dock-body .rt-kb-sub,.dshp-dock-body .rt-seg-cidr,.dshp-dock-body .rt-seg-meta,.dshp-dock-body .rt-section,.dshp-dock-body .rt-note,.dshp-dock-body .rt-hint{color:var(--dshp-ink)!important;text-shadow:none!important;opacity:1!important}
.dshp-dock-body .rt-tab,.dshp-dock-body .rt-foot,.dshp-dock-body .rt-empty,.dshp-dock-body .rt-item-desc,.dshp-dock-body .rt-kb-sub,.dshp-dock-body .rt-kv span,.dshp-dock-body .rt-tag,.dshp-dock-body .rt-sec-sub{color:var(--dshp-mute)!important}
.dshp-dock-body .rt-card,.dshp-dock-body .rt-pane,.dshp-dock-body .rt-side,.dshp-dock-body .rt-table,.dshp-dock-body .rt-toolbar,.dshp-dock-body .rt-embedded>.rt-head,.dshp-dock-body .rt-tabs{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 72%,transparent)!important;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#748B6F) 28%,transparent)!important;color:var(--dshp-ink)!important;box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 26%,transparent)!important;backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3)}
.dshp-dock-body .rt-btn,.dshp-dock-body .rt-input,.dshp-dock-body .rt-eng-select,.dshp-dock-body textarea.rt-input{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 90%,transparent)!important;color:var(--dshp-ink)!important;border-color:color-mix(in srgb,var(--dsw-alias-border-l1,#888) 70%,transparent)!important}
.dshp-dock-body .rt-btn-primary{background:var(--dsw-alias-brand-primary,#748B6F)!important;border-color:var(--dsw-alias-brand-primary,#748B6F)!important;color:#fff!important}
.dshp-dock[data-theme="white"] .dshp-dock-body .rt-eng-select option,.dshp-dock[data-theme="white"] .dshp-dock-body .rt-input option{background:#fff;color:#16140f}
.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-eng-select option,.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-input option{background:#1b1d22;color:#f4f1ea}
.dshp-dock-body .rt-err{font-weight:650}
.dshp-dock[data-theme="white"] .dshp-dock-body .rt-err{color:#9a3434!important}
.dshp-dock[data-theme="dusk"] .dshp-dock-body .rt-err{color:#f0b4b4!important}
.dshp-dock-body .rt-rep-http,.dshp-dock-body pre{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 84%,transparent)!important;color:var(--dshp-ink)!important;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,#888) 60%,transparent)!important}
/* [dsh-breach] 面板外壳改实心暖米，去掉毛玻璃。
   注意：上面 .dshp-dock[data-theme=...] 那条也带 !important 且权重更高，
   所以这里必须用同样带 data-theme 的选择器，并放在它之后，才能压过。 */
.dshp-dock[data-theme="white"]{background:#FFFDF9!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:1px solid #E7DFD0!important;box-shadow:0 18px 48px rgba(60,48,30,.16),0 2px 8px rgba(60,48,30,.06)!important}
.dshp-dock[data-theme="dusk"]{background:#211F1C!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:1px solid #332F29!important;box-shadow:0 18px 48px rgba(0,0,0,.45)!important}
.dshp-dock-ver{font-size:10.5px;font-weight:500;color:var(--dshp-mute,#6b6862);opacity:.75;letter-spacing:.02em}
/* [dsh-breach] 明细面板（新设计） */
.dshp-dt{margin-top:14px;padding-top:12px;border-top:1px solid var(--cd-line-soft)}
.dshp-dt-head{display:flex;align-items:center;gap:7px;margin-bottom:10px}
.dshp-dt-title{font-size:12.5px;font-weight:650;color:var(--cd-ink)}
.dshp-dt-count{font-size:11px;color:var(--cd-faint);font-variant-numeric:tabular-nums}
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
.dshp-cd{border:0;border-radius:12px;padding:12px 14px;margin-top:10px;background:var(--ov-card,#fff);box-shadow:var(--ov-shadow,0 1px 2px rgba(60,50,35,.05))}
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

		function noticeNode(notice) {
			if (!notice || notice.kind === "idle" || !notice.text) return null;
			return h("span", { className: "dshp-notice " + (notice.kind === "error" ? "is-bad" : "is-ok") }, notice.text);
		}

		function Btn(props) {
			const { kind, tiny, children, className, type, ...rest } = props;
			const cls = ["dshp-btn", kind ? "dshp-btn-" + kind : "dshp-btn-ghost", tiny ? "dshp-btn-tiny" : "", className || ""].filter(Boolean).join(" ");
			return h("button", Object.assign({ type: type || "button", className: cls }, rest), children);
		}

		function Pill({ value, label }) {
			const t = useT();
			return h("span", { className: "dshp-pill is-" + statusKind(value) }, label || statusLabel(value, t));
		}

		const LAYER_GROUP = {
			"提示词": "prompt",
			"代码": "code",
			"工具": "tools",
			"0.1.5 兼容": "compat",
			"0.2.0 兼容": "dsh20",
		};
		const GROUP_ORDER = ["prompt", "code", "tools", "compat", "dsh20"];

		function patchRowsOf(state) {
			if (!state || !state.ai_base) return [];
			const fromList = Array.isArray(state.patches) ? state.patches : null;
			const rows = fromList
				? fromList.map((p) => ({
					id: Number(p.id),
					ids: Array.isArray(p.ids) && p.ids.length ? p.ids.map(Number) : [Number(p.id)],
					st: p.status || "missing_file",
					layer: p.layer || "",
					title: p.title || "",
				}))
				: Object.keys(state.patch_status || {}).map((id) => ({
					id: Number(id),
					ids: [Number(id)],
					st: state.patch_status[id],
					layer: "",
					title: "",
				}));
			return rows.filter((r) => r.st && r.st !== "na" && Number.isFinite(r.id));
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

		function tallyPatches(rows) {
			const out = { applied: 0, pending: 0, unmatched: 0, skipped: 0, total: 0 };
			for (const row of rows || []) {
				out.total += 1;
				if (row.st === "applied" || row.st === "already") out.applied += 1;
				else if (row.st === "pending") out.pending += 1;
				else if (row.st === "unmatched") out.unmatched += 1;
				else out.skipped += 1;
			}
			return out;
		}

		function PatchGroups({ state }) {
			const t = useT();
			const [open, setOpen] = useState({});
			if (!state || !state.patch_status) return h("div", { className: "dshp-skel", style: { height: 120 } });
			const located = !!state.ai_base;
			if (!located) return null;
			const grouped = new Map();
			for (const row of patchRowsOf(state)) {
				const key = LAYER_GROUP[row.layer] || "code";
				if (!grouped.has(key)) grouped.set(key, []);
				grouped.get(key).push(row);
			}
			return GROUP_ORDER.filter((key) => grouped.has(key)).map((key) => {
				const rows = grouped.get(key).slice().sort((a, b) => a.id - b.id);
				if (!rows.length) return null;
				const tally = tallyPatches(rows);
				const notes = [];
				if (tally.pending) notes.push(t("metric.pendingShort", { n: tally.pending }));
				if (tally.unmatched) notes.push(t("metric.unmatchedShort", { n: tally.unmatched }));
				if (tally.skipped) notes.push(t("metric.skipShort", { n: tally.skipped }));
				const expanded = !!open[key];
				return h("div", { key: key, className: "dshp-group" },
					h("button", {
						type: "button",
						className: "dshp-group-h",
						"aria-expanded": expanded ? "true" : "false",
						onClick: () => setOpen((prev) => Object.assign({}, prev, { [key]: !prev[key] })),
					},
						h("strong", null, t("group." + key)),
						h("span", { className: "dshp-count" }, tally.applied + "/" + tally.total + (notes.length ? " · " + notes.join(" · ") : "")),
					),
					expanded ? h("table", { className: "dshp-table" },
						h("thead", null, h("tr", null,
							h("th", null, "#"),
							h("th", null, t("table.patch")),
							h("th", null, t("table.status")),
						)),
						h("tbody", null, rows.map((r) => h("tr", { key: r.ids ? r.ids.join("-") : r.id },
							h("td", { className: "dshp-id" }, patchIdLabel(r)),
							h("td", null, patchTitle(t, state, r)),
							h("td", null, h(Pill, { value: r.st })),
						))),
					) : null,
				);
			});
		}

		function HooksDenySection({ onSaved }) {
			const t = useT();
			const [cfg, setCfg] = useState(null);
			const [notice, setNotice] = useState({ kind: "idle", text: "" });
			const [busy, setBusy] = useState(false);

			useEffect(() => {
				apiJson("/dsh-breach/hooks-deny")
					.then((d) => { if (d && d.ok) setCfg({ hooksDenyBypass: d.hooksDenyBypass !== false }); })
					.catch(() => {});
			}, []);

			const save = (hooksDenyBypass) => {
				if (!cfg || busy) return;
				setCfg({ hooksDenyBypass });
				setBusy(true);
				apiJson("/dsh-breach/hooks-deny", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ hooksDenyBypass }),
				})
					.then((d) => {
						if (d && d.ok) {
							setCfg({ hooksDenyBypass: d.hooksDenyBypass === true });
							setNotice({ kind: "ok", text: t("saved.hooksDeny") });
							if (typeof onSaved === "function") onSaved();
						} else {
							setNotice({ kind: "error", text: t("err.save", { error: (d && d.error) || "" }) });
						}
					})
					.catch((e) => setNotice({ kind: "error", text: t("err.save", { error: e.message }) }))
					.finally(() => setBusy(false));
			};

			if (!cfg) return null;
			return h("div", { className: "dshp-cr", style: { marginTop: 12 } },
				h("div", { className: "dshp-sub" },
					h("h4", null, t("hooksDeny.title")),
					noticeNode(notice),
				),
				h("p", { className: "dshp-hint", style: { margin: "0 0 4px", color: "var(--dshp-mute)", fontSize: 12 } }, t("hooksDeny.hint")),
				h("div", { className: "dshp-cr-row" },
					h("label", null,
						h("input", {
							type: "checkbox",
							checked: cfg.hooksDenyBypass === true,
							disabled: busy,
							onChange: (e) => save(e.target.checked),
						}),
						t("hooksDeny.bypass"),
					),
				),
			);
		}

		function RestartAsk(props) {
			const node = h("div", {
				className: "dshp-restart-mask",
				"data-theme": props.theme === "dusk" ? "dusk" : "white",
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": "dshp-restart-title",
				onClick: (e) => { if (e.target === e.currentTarget && props.onLater) props.onLater(); },
			},
				h("div", { className: "dshp-restart-card" },
					h("h4", { id: "dshp-restart-title" }, props.t("restart.ask.title")),
					h("p", null, props.t("restart.ask.body")),
					h("div", { className: "dshp-modal-ops" },
						h(Btn, { onClick: props.onLater }, props.t("restart.notNow")),
						h(Btn, { kind: "primary", onClick: props.onRestart }, props.t("restart.now")),
					),
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

		function restartDsh(setNotice, setBusy, t, surface) {
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

		/* ── 概览面板（P 方案 · 暖米） ─────────────────────────────────────
		   只做展示与两个动作：状态灯 / 四个指标 / 四行分组进度 / 明细开关。
		   应用与还原来回复用同一套接口，所有数据来自 /dsh-breach/status。 */
		const OVERVIEW_CSS = `
.dshp-ov{padding:0;--ov-panel:#FFFDF9;--ov-cell:#FAF6EE;--ov-cell-bd:#EDE6D9;--ov-line:#EFE9DD;--ov-track:#F2EDE2;--ov-ink:#26241F;--ov-mute:#6B6862;--ov-faint:#9A948A;--ov-green:#7BA271;--ov-red:#C4756B;--ov-card:#FFFFFF;--ov-chip:#F4F1EA;--ov-hair:#F1ECE1;--ov-shadow:0 1px 2px rgba(60,50,35,.05)}
body[data-ds-dark-theme] .dshp-ov,.dshp-root[data-theme="dusk"] .dshp-ov{--ov-panel:#211F1C;--ov-cell:#26231F;--ov-cell-bd:#332F29;--ov-line:#332F29;--ov-track:#332F29;--ov-ink:#EFEBE2;--ov-mute:#9A948A;--ov-faint:#7A756B;--ov-green:#8FB389;--ov-red:#F85149;--ov-card:#26231F;--ov-chip:#2C2925;--ov-hair:#332F29;--ov-shadow:none}
.dshp-ov-top{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;padding:12px 14px;margin-bottom:10px;background:var(--ov-card);border-radius:12px;box-shadow:var(--ov-shadow)}
.dshp-ov-bigwrap{display:flex;align-items:center;gap:9px}
.dshp-ov-big{font-size:22px;font-weight:700;letter-spacing:-.4px;line-height:1.15;color:var(--ov-green);transition:color .25s;font-variant-numeric:tabular-nums}
.dshp-ov.is-bad .dshp-ov-big{color:var(--ov-red)}
.dshp-ov-sub{font-size:11.5px;color:var(--ov-faint);margin-top:4px;font-variant-numeric:tabular-nums}
.dshp-ov-hint{font-size:11px;color:var(--ov-faint);margin-top:6px;line-height:1.6}
.dshp-ov-acts{display:flex;gap:6px;flex:none;margin-left:auto}
.dshp-ov-btn{appearance:none;border:0;background:var(--ov-chip);color:var(--ov-ink);padding:5px 12px;border-radius:8px;font:600 11.5px/1.5 var(--ds-font-sans,system-ui,sans-serif);cursor:pointer;transition:background .15s,color .15s}
.dshp-ov-btn:hover:not(:disabled){background:var(--ov-line)}
.dshp-ov-btn:disabled{opacity:.5;cursor:default}
.dshp-ov-btn.primary{background:var(--ov-green);color:#fff}
.dshp-ov-btn.primary:hover:not(:disabled){opacity:.9;background:var(--ov-green)}
.dshp-ov-stats{display:flex;align-items:center;gap:13px;font-size:11.5px;color:var(--ov-faint);flex-wrap:wrap}
.dshp-ov-stats .st{display:inline-flex;align-items:center;gap:5px}
.dshp-ov-stats .st b{font-weight:650;color:var(--ov-ink);font-variant-numeric:tabular-nums}
.dshp-ov-stats .p{width:6px;height:6px;border-radius:999px;background:var(--ov-green);flex:none}
.dshp-ov-stats .sk .p{background:#E3C983}
.dshp-ov-stats .bad .p{background:#D08A80}
.dshp-ov-stats .bad b{color:var(--ov-red)}
.dshp-ov-rows{background:var(--ov-card);border-radius:12px;box-shadow:var(--ov-shadow);padding:2px 13px}
.dshp-ov-row{display:flex;align-items:center;gap:10px;padding:10px 0;font-size:12.5px;border-top:1px solid var(--ov-hair);cursor:pointer}
.dshp-ov-row:first-child{border-top:0}
.dshp-ov-row .nm{width:54px;flex:none;font-weight:600;color:var(--ov-ink)}
.dshp-ov-row .bar{flex:1;height:5px;border-radius:999px;background:var(--ov-track);overflow:hidden;display:flex}
.dshp-ov-row .bar i{display:block;height:100%;transition:width .3s;background:var(--ov-green)}
.dshp-ov-row .bar i.sk{background:#E3C983}
.dshp-ov-row .bar i.bad{background:#D08A80}
.dshp-ov-row .dshp-ov-caret{width:10px;flex:none;color:var(--ov-faint);font-size:9px;line-height:1;transition:transform .12s}
.dshp-ov-row.open .dshp-ov-caret{transform:rotate(90deg)}
.dshp-ov-row .v{width:50px;flex:none;text-align:right;font-size:11px;color:var(--ov-faint);font-variant-numeric:tabular-nums}
.dshp-ov-led{width:6px;height:6px;border-radius:999px;background:var(--dshp-led,#22C55E);box-shadow:0 0 0 2px color-mix(in srgb,var(--dshp-led,#22C55E) 18%,transparent);flex:none;transition:all .25s}
.dshp-ov.is-bad .dshp-ov-led:not(.mini){background:#E5484D;box-shadow:0 0 0 2px rgba(229,72,77,.18)}
.dshp-ov-led.mini{width:5px;height:5px;box-shadow:none}
.dshp-ov-row.bad .dshp-ov-led.mini{background:#E5484D}
.dshp-ov-foot{display:flex;align-items:center;gap:8px;padding:8px 3px 10px;font-size:11px;color:var(--ov-faint)}
.dshp-ov-foot .sp{flex:1}
.dshp-ov-note{font-size:11.5px;color:var(--ov-red);padding:0 0 10px}
.dshp-ov-note.is-ok{color:var(--ov-mute)}
.dshp-ov-detail{display:none}
.dshp-ov-detail[data-open="1"]{display:block}
/* 明细区：把原有区块的视觉语言拉回概览这套（暖米、圆角、小字号标题） */
.dshp-ov-detail{--ov-panel:#FFFDF9;--ov-cell:#FAF6EE;--ov-cell-bd:#EDE6D9;--ov-line:#EFE9DD;--ov-ink:#1F1E1C;--ov-mute:#6B6862;--ov-faint:#A29E95;--ov-green:#748B6F;--ov-red:#C0392B}
body[data-ds-dark-theme] .dshp-ov-detail,.dshp-root[data-theme="dusk"] .dshp-ov-detail{--ov-panel:#211F1C;--ov-cell:#26231F;--ov-cell-bd:#332F29;--ov-line:#332F29;--ov-ink:#EFEBE2;--ov-mute:#9A948A;--ov-faint:#7A756B;--ov-green:#8FB389;--ov-red:#F85149}
.dshp-ov-detail .dshp-panel{background:var(--ov-cell);border:1px solid var(--ov-cell-bd);border-radius:12px;padding:14px 16px 12px}
.dshp-ov-detail .dshp-head{gap:8px;margin-bottom:10px}
.dshp-ov-detail .dshp-title{font-size:14px;font-weight:650;letter-spacing:-.1px;line-height:1.4}
.dshp-ov-detail .dshp-pill{font-size:10.5px;padding:1px 7px;border-radius:999px}
.dshp-ov-detail .dshp-metrics{gap:8px;margin-top:10px}
.dshp-ov-detail .dshp-metric{background:var(--ov-panel);border:1px solid var(--ov-cell-bd);border-radius:10px;padding:10px 12px}
.dshp-ov-detail .dshp-metric b{font-size:17px;font-weight:640;letter-spacing:-.4px}
.dshp-ov-detail .dshp-metric span{font-size:10.5px}
.dshp-ov-detail .dshp-rel{border-radius:10px}
`;

		function OverviewSection(props) {
			const tr = (k) => (typeof translate === "function" ? translate(k) : k);
			/* 后端各处用的字段名不统一，全部认一遍：
			   apply  → restarting / restart_after_apply / unpacked_asar / needs_full_quit
			   status → boot_full_quit
			   revert → note 里提到重启 */
			const needsRestart = (d) => {
				if (!d) return false;
				if (d.boot_full_quit || d.restart_after_apply || d.needs_full_quit) return true;
				if (d.restarting === true || d.unpacked_asar === true) return true;
				if (typeof d.note === "string" && /重启|restart/i.test(d.note)) return true;
				return false;
			};
			const [st, setSt] = useState(null);
			const [busy, setBusy] = useState("");
			const [note, setNote] = useState("");
			const [askRestart, setAskRestart] = useState(false);
			const suppressRestart = useRef(false);
			const open = !!(props && props.detail);

			const load = useCallback(() => {
				apiJson("/dsh-breach/status").then((d) => { if (d && d.ok) setSt(d); }).catch(() => {});
			}, []);

			useEffect(() => {
				load();
				const timer = window.setInterval(load, 15000);
				return () => window.clearInterval(timer);
			}, [load]);

			const patches = (st && st.patches) || [];
			const isDone = (s) => s === "applied" || s === "already";
			const isBad = (s) => s === "pattern_not_found" || s === "error" || s === "unmatched";
			const bad = patches.filter((p) => isBad(p.status));
			const applied = (st && st.patches_applied) || 0;
			const skipped = (st && st.patches_skipped) || 0;
			const pending = (st && st.patches_pending) || 0;
			const total = (st && st.patches_total) || 0;

			/* 还原只撤文件补丁，撤不掉运行时注入的提示词段。
			   分开统计，避免「还原后还剩 N 项」看起来像没还原干净。 */
			const isDoneState = (s) => s === "applied" || s === "already";
			let promptAlive = 0;
			let codeApplied = 0;
			for (const p of patches) {
				if (!isDoneState(p.status)) continue;
				if (p.layer === "提示词") promptAlive += 1;
				else codeApplied += 1;
			}

			// 按 layer 归组；「0.2.0 兼容」「0.1.5 兼容」并成一行「兼容」
			const ORDER = ["提示词", "代码", "工具", "兼容"];
			const bucket = {};
			for (const p of patches) {
				let key = p.layer || "其他";
				if (key.indexOf("兼容") !== -1) key = "兼容";
				if (!bucket[key]) bucket[key] = { total: 0, done: 0, bad: 0 };
				bucket[key].total += 1;
				if (isDone(p.status)) bucket[key].done += 1;
				if (isBad(p.status)) bucket[key].bad += 1;
			}
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
						// 只有「应用」才引导重启。
						// 「还原」不能弹重启：重启前的 ensureHostClean() 会检测补丁缺失并自动
						// applyPatchesAllHosts() 补齐，等于把刚撤销的补丁又打回去。
						if (needsRestart(d) && !suppressRestart.current) setAskRestart(true);
					} else {
						const n = typeof d.reverted === "number" ? d.reverted : 0;
						setNote("已撤销 " + n + " 项补丁。重启后才会完全还原；想恢复请再点「应用」。");
					}
					load();
				}).catch((e) => {
					setNote((action === "apply" ? "应用失败：" : "还原失败：") + (e && e.message ? e.message : e));
				}).finally(() => setBusy(""));
			};

			if (askRestart) {
				return h(RestartAsk, {
					t: tr,
					theme: detectHostTheme(),
					onLater: () => { suppressRestart.current = true; setAskRestart(false); },
					onRestart: () => {
						suppressRestart.current = true;
						setAskRestart(false);
						restartDsh(setNote, function () {}, tr, "desktop");
					},
				});
			}

			/* 状态灯三态（照设计稿：灯在面板头，标题只留字色）
			   绿 = 已全部生效/跳过、无失败、无待应用
			   红 = 有失败 / 还没应用 / 已还原 / 还有待应用项 */
			const state = !st
				? "loading"
				: bad.length
					? "fail"
					: applied === 0
						? "idle"
						: pending > 0
							? "pending"
							: "ok";
			const red = state === "fail" || state === "idle" || state === "pending";
			const bigText = state === "fail"
				? bad.length + " " + tr("ov.failN")
				: state === "idle"
					? tr("ov.notApplied")
					: state === "pending"
						? pending + " " + tr("ov.pendingN")
						: state === "loading"
							? tr("ov.loading")
							: tr("ov.ok");

			return h("div", { className: "dshp-ov" + (red ? " is-bad" : "") },
				h("div", { className: "dshp-ov-top" },
					h("div", { style: { flex: 1, minWidth: 0 } },
						h("div", { className: "dshp-ov-bigwrap" },
							h("span", { className: "dshp-ov-big" }, bigText),
						),
						h("div", { className: "dshp-ov-sub" },
							total ? (rows.length + " 个分组 · " + total + " 项补丁") : tr("ov.loading")),
						promptAlive > 0 && codeApplied === 0
							? h("div", { className: "dshp-ov-hint" },
								"代码补丁已全部撤销；" + promptAlive + " 项提示词仍在生效（运行时注入，不受还原影响）")
							: null,
					),
					h("div", { className: "dshp-ov-stats" },
					h("span", { className: "st ok" }, h("i", { className: "p" }), h("b", null, String(applied)), " " + tr("ov.applied")),
					h("span", { className: "st sk" }, h("i", { className: "p" }), h("b", null, String(skipped)), " " + tr("ov.skipped")),
					h("span", { className: "st bad" }, h("i", { className: "p" }), h("b", null, String(bad.length)), " " + tr("ov.failed")),
					bad.length || pending ? h("span", { className: "st" }, h("i", { className: "p" }), h("b", null, String(pending)), " " + tr("ov.pending")) : null,
				),
				h("div", { className: "dshp-ov-acts" },
						h("button", { type: "button", className: "dshp-ov-btn", disabled: !!busy, onClick: () => runAction("revert") }, tr("btn.revert")),
						h("button", { type: "button", className: "dshp-ov-btn primary", disabled: !!busy, onClick: () => runAction("apply") }, busy === "apply" ? tr("btn.apply.busy") : tr("btn.apply")),
					),
				),
				note ? h("div", { className: "dshp-ov-note" + (/失败|错误/.test(note) ? "" : " is-ok") }, note) : null,
				h("div", { className: "dshp-ov-rows" },
					rows.map((r) => {
						const pct = (n) => (r.total ? (n / r.total) * 100 : 0);
						const sk = Math.max(0, r.total - r.done - r.bad);
						return h("div", {
							key: r.key,
							className: "dshp-ov-row" + (props.detail ? " open" : ""),
							onClick: props.onToggleDetail,
							role: "button",
							tabIndex: 0,
							onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); props.onToggleDetail(); } },
							title: props.detail ? "收起补丁明细" : "展开补丁明细",
						},
							h("span", { className: "dshp-ov-caret" }, "▸"),
							h("span", { className: "nm" }, r.key),
							h("span", { className: "bar" },
								h("i", { style: { width: pct(r.done) + "%" } }),
								sk ? h("i", { className: "sk", style: { width: pct(sk) + "%" } }) : null,
								r.bad ? h("i", { className: "bad", style: { width: pct(r.bad) + "%" } }) : null,
							),
							h("span", { className: "v" }, r.done + " / " + r.total),
						);
					}),
				),
				h("div", { className: "dshp-ov-foot" },
					h("span", null, skipped ? (tr("ov.skippedHint") + " " + skipped) : tr("ov.allApplied")),
				),
			);
		}

		/* ── 明细：按分组列补丁，新设计（不再复用旧区块的排版） ─────────────── */
		function DetailPanel() {
			const [st, setSt] = useState(null);
			const [closed, setClosed] = useState({});
			const [filter, setFilter] = useState("all");
			const [hooksOn, setHooksOn] = useState(null);
			const [hooksBusy, setHooksBusy] = useState(false);

			const load = useCallback(() => {
				apiJson("/dsh-breach/status")
					.then((d) => { if (d && d.ok) setSt(d); })
					.catch(() => {});
			}, []);

			useEffect(() => {
				load();
				apiJson("/dsh-breach/hooks-deny")
					.then((d) => { if (d && d.ok) setHooksOn(d.hooksDenyBypass !== false); })
					.catch(() => {});
				const timer = window.setInterval(load, 15000);
				return () => window.clearInterval(timer);
			}, [load]);

			const saveHooks = (next) => {
				if (hooksBusy || hooksOn === null) return;
				const prev = hooksOn;
				setHooksBusy(true);
				setHooksOn(next);
				apiJson("/dsh-breach/hooks-deny", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ hooksDenyBypass: next }),
				}).then((d) => {
					if (d && d.ok) setHooksOn(d.hooksDenyBypass === true);
					else setHooksOn(prev);
				}).catch(() => setHooksOn(prev))
					.finally(() => setHooksBusy(false));
			};

			const HOOK_IDS = [30, 31, 64, 65];
			const patches = (st && st.patches) || [];
			const isDone = (s) => s === "applied" || s === "already";
			const isBad = (s) => s === "pattern_not_found" || s === "error" || s === "unmatched";
			// hooks 开关关闭时，这 4 个补丁不参与应用，状态一律按「已跳过」呈现
			const hookOff = hooksOn === false;
			const isHookPatch = (p) => HOOK_IDS.indexOf(Number(p.id)) >= 0;
			const effStatus = (p) => (hookOff && isHookPatch(p)) ? "skipped" : p.status;
			const label = (p) => {
				const s = effStatus(p);
				return isBad(s) ? "失败" : isDone(s) ? "已应用" : (s === "missing_file" ? "未安装" : "跳过");
			};
			const pass = (p) => {
				if (filter === "all") return true;
				const s = effStatus(p);
				if (filter === "bad") return isBad(s);
				if (filter === "skip") return !isDone(s) && !isBad(s);
				return true;
			};

			const ORDER = ["提示词", "代码", "工具", "兼容"];
			const groups = {};
			for (const p of patches) {
				let k = p.layer || "其他";
				if (k.indexOf("兼容") !== -1) k = "兼容";
				(groups[k] || (groups[k] = [])).push(p);
			}
			const keys = Object.keys(groups).sort((a, b) => {
				const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
				return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
			});

			return h("div", { className: "dshp-dt" },
				h("div", { className: "dshp-dt-head" },
					h("span", { className: "dshp-dt-title" }, "补丁明细"),
					h("span", { className: "dshp-dt-count" }, patches.length + " 项"),
					h("span", { style: { flex: 1 } }),
					[["all", "全部"], ["bad", "失败"], ["skip", "跳过"]].map(([f, txt]) =>
						h("button", {
							key: f, type: "button",
							className: "dshp-dt-chip" + (filter === f ? " on" : ""),
							onClick: () => setFilter(f),
						}, txt)),
				),
				h("div", { className: "dshp-dt-hooks" },
					h("span", { className: "dshp-dt-hooks-name" }, "Hooks 拦截"),
					h("span", { className: "dshp-dt-hooks-meta" }, hookOff ? "已关闭 · 30/31/64/65 跳过" : "已放行 · 含 30/31/64/65"),
					h("span", { style: { flex: 1 } }),
					h("button", {
						type: "button",
						className: "dshp-sw" + (hooksOn ? " on" : ""),
						disabled: hooksBusy || hooksOn === null,
						role: "switch",
						"aria-checked": hooksOn ? "true" : "false",
						onClick: () => saveHooks(!hooksOn),
					}, h("i", null)),
				),
				keys.map((k) => {
					const all = groups[k];
					const list = all.filter(pass);
					const done = all.filter((p) => isDone(effStatus(p))).length;
					const opened = !closed[k];
					return h("div", { key: k, className: "dshp-dt-group" },
						h("div", {
							className: "dshp-dt-ghead",
							onClick: () => setClosed((o) => ({ ...o, [k]: opened })),
						},
							h("span", { className: "dshp-dt-arrow" + (opened ? " open" : "") }, "▶"),
							h("span", { className: "dshp-dt-gname" }, k),
							h("span", { style: { flex: 1 } }),
							h("span", { className: "dshp-dt-gnum" }, done + " / " + all.length),
						),
						opened ? h("div", { className: "dshp-dt-list" },
							list.length
								? list.map((p) => {
									const s = effStatus(p);
									return h("div", { key: p.id, className: "dshp-dt-row" },
										h("span", { className: "dshp-dt-dot" + (isBad(s) ? " bad" : isDone(s) ? "" : " skip") }),
										h("span", { className: "dshp-dt-name", title: p.title || ("#" + p.id) }, p.title || ("#" + p.id)),
										h("span", { className: "dshp-dt-st" + (isBad(s) ? " bad" : isDone(s) ? "" : " skip") }, label(p)),
									);
								})
								: h("div", { className: "dshp-dt-empty" }, "无匹配项"),
						) : null,
					);
				}),
			);
		}

		/* ── 提示词 / 规则集 / Skill：新设计的三个卡片，替代原来的三块旧界面 ── */
		function Card(props) {
			return h("div", { className: "dshp-cd" + (props.plain ? " plain" : "") },
				h("div", { className: "dshp-cd-head" },
					h("span", { className: "dshp-cd-name" }, props.name),
					props.meta ? h("span", { className: "dshp-cd-meta" }, props.meta) : null,
					h("span", { style: { flex: 1 } }),
					props.right || null,
				),
				props.children,
			);
		}

		function PromptCard() {
			const [data, setData] = useState(null);
			const [text, setText] = useState("");
			const [busy, setBusy] = useState(false);
			const [note, setNote] = useState("");
			const [open, setOpen] = useState(false);

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

			const save = () => writeContent(text, "已保存");

			// 与旧版一致：填入内置默认稿后立即写盘
			const restore = () => {
				const def = (data && data.defaultContent) || "";
				if (!def) { setNote("没有可恢复的默认稿"); return; }
				if (!window.confirm("把提示词恢复成内置默认稿并写入宿主文件？当前的修改会丢失。")) return;
				setText(def);
				writeContent(def, "已恢复默认提示词");
			};

			const savedText = (data && typeof data.content === "string") ? data.content : "";
			const dirty = !!data && text !== savedText;

			const meta = data
				? (data.customized ? "已自定义" : "使用默认") + " · " + (data.content || "").length + " 字"
				: "读取中…";

			return h(Card, {
				name: "提示词",
				meta: meta,
				right: h("button", { type: "button", className: "dshp-cd-btn", onClick: () => setOpen((v) => !v) },
					open ? "收起" : "编辑"),
			},
				open ? h("div", { className: "dshp-cd-body" },
					h("textarea", {
						className: "dshp-cd-area",
						value: text,
						spellCheck: false,
						onChange: (e) => setText(e.target.value),
					}),
					dirty
						? h("div", { className: "dshp-cd-dirty" }, "有未保存的修改，点「保存」才会写进宿主文件")
						: null,
					h("div", { className: "dshp-cd-acts" },
						h("button", { type: "button", className: "dshp-cd-btn", disabled: busy, onClick: restore }, "恢复默认"),
						h("span", { style: { flex: 1 } }),
						note ? h("span", { className: "dshp-cd-note" }, note) : null,
						h("button", { type: "button", className: "dshp-cd-btn primary", disabled: busy || !dirty, onClick: save },
							busy ? "保存中…" : "保存"),
					),
				) : null,
			);
		}

		function SettingsRoot(props) {
			const t = typeof props.t === "function" ? props.t : ((key) => key);
			const [theme, setTheme] = useState(readTheme);
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
			const [detail, setDetail] = useState(false);
			return h("div", { className: "dshp-root", "data-theme": theme },
				h("style", null, HAPPY_CSS),
				h("style", null, OVERVIEW_CSS),
				h(OverviewSection, { detail, onToggleDetail: () => setDetail((v) => !v) }),
				detail ? h(DetailPanel, null) : null,
				h(PromptCard, null),
			);
		}

		const REWIND_CSS = `
.dshp-rewind-wrap{position:relative;display:inline-flex}
.dshp-rewind{appearance:none;display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,currentColor);font:12px/1 var(--ds-font-sans,system-ui,sans-serif);cursor:pointer}
.dshp-rewind:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,currentColor)}
.dshp-rewind:disabled{opacity:.4;cursor:default}
.dshp-rewind svg{display:block}
.dshp-rewind-menu{position:fixed;z-index:2147483000;box-sizing:border-box;min-width:220px;padding:4px;border:0;border-radius:12px;background:var(--dsw-specific-menu,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.16));transform:translateY(-100%)}
body[data-ds-dark-theme] .dshp-rewind-menu{background:var(--dsw-specific-menu,#32312d);color:var(--dsw-alias-label-primary,#e6e2db);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,#3f3d38);box-shadow:var(--dsw-elevation-prominent,0 10px 28px rgba(0,0,0,.45))}
.dshp-rewind-item{display:flex;flex-direction:column;gap:2px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:12px/1.3 var(--ds-font-sans,system-ui,sans-serif)}
.dshp-rewind-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dshp-rewind-item b{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,inherit)}
.dshp-rewind-item span{color:var(--dsw-alias-label-tertiary,#9a958c);font-size:11px}
body[data-ds-dark-theme] .dshp-rewind-item span{color:var(--dsw-alias-label-tertiary,#a8a39a)}
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
					if (value && value !== key) return value;
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
			const menu = h("div", {
				className: "dshp-rewind-menu",
				role: "menu",
				ref: menuRef,
				style: menuPos ? { left: menuPos.left + "px", top: menuPos.top + "px" } : { left: "8px", bottom: "48px", transform: "none" },
			},
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
					menuPos: rect ? { left: Math.max(8, rect.right - 228), top: Math.max(8, rect.top - 8) } : null,
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
						left: Math.max(8, rect.right - 228),
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
			const repo = t("welcome.repo");
			const node = h("div", { className: "dshp-auth-mask", role: "dialog", "aria-modal": "true" },
				h("div", { className: "dshp-auth-modal", style: { width: "min(560px,100%)" } },
					h("h2", null, t("welcome.title")),
					h("div", { className: "muted", style: { color: "var(--dsw-alias-label-secondary,#999)", fontSize: 12 } }, t("welcome.lead")),
					h("div", { className: "dshp-auth-warn" }, t("welcome.warn")),
					h("div", { className: "dshp-auth-legal", style: { height: "auto", maxHeight: 280 } },
						h("p", null, t("welcome.body")),
						h("p", null,
							h("a", {
								href: repo,
								target: "_blank",
								rel: "noopener noreferrer",
								style: { color: "var(--dsw-alias-label-brand, #748B6F)", wordBreak: "break-all" },
							}, repo),
						),
						h("h3", null, t("welcome.bans")),
						h("p", null, t("welcome.ban1")),
						h("p", null, t("welcome.ban2")),
						h("p", null, t("welcome.ban3")),
					),
					h("div", { className: "dshp-auth-checks" },
						h("label", null,
							h("input", {
								type: "checkbox",
								checked: checked,
								onChange: (e) => setChecked(!!(e && e.target && e.target.checked)),
							}),
							h("span", null, t("welcome.check")),
						),
					),
					h("div", { className: "dshp-auth-ops" },
						h("button", {
							type: "button",
							className: "primary",
							disabled: !checked,
							onClick: () => {
								if (!checked) return;
								writeWelcomeAck();
								setOpen(false);
							},
						}, t("welcome.ok")),
					),
				),
			);
			try {
				const rd = require("react-dom");
				if (rd && typeof rd.createPortal === "function" && typeof document !== "undefined" && document.body) {
					return rd.createPortal(node, document.body);
				}
			} catch { /* ignore */ }
			return node;
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
				let uiTag = document.querySelector('style[data-dsh-breach-ui="1"]');
				if (!uiTag) {
					uiTag = document.createElement("style");
					uiTag.setAttribute("data-dsh-breach-ui", "1");
					uiTag.textContent = HAPPY_CSS;
					document.head.append(uiTag);
				}
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
			// 演练台（红队模式）已移除：内容区固定为清洗，不再渲染红队面板。
			const body = h(SettingsRoot, { t });
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
					height: geom.h + "px",
				},
			},
				h("div", { className: "dshp-dock-head", onMouseDown: startDrag, title: "按住拖动面板" },
					h("b", null, "dsh-breach"),
					h("span", { className: "dshp-dock-ver" }, ver || "—"),
					h("span", { style: { flex: 1 } }),
					h("button", { type: "button", onClick: () => setDock({ open: false, authOpen: false, tab: "clean", pending: "tab" }) }, t("dock.close")),
				),
				h("div", { className: "dshp-dock-body" }, body),
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
			}, t("dock.newSession"));
		}

		/** 首页胶囊旁的「更新」小胶囊：只有真有新版本才出现，点一下走现成的 /update 安装 + 重启链路。 */
		function HeroUpdatePill() {
			const t = useT();
			const [info, setInfo] = useState(null);
			const [busy, setBusy] = useState(false);
			const [err, setErr] = useState("");
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
					})
					.catch((e) => { setBusy(false); setErr(String((e && e.message) || e)); });
			};
			if (!busy && !(info && info.hasUpdate)) return null;
			// 只报目标版本，不做「当前 → 目标」比较，避免版本顺序引起误读。
			const detail = info && info.remoteVersion ? " " + info.remoteVersion : "";
			return h("button", {
				type: "button",
				className: "dshp-update-pill" + (err ? " is-bad" : ""),
				disabled: busy,
				title: err ? t("updPill.fail") + ": " + err : t("updPill.title") + detail,
				onClick: run,
			}, busy ? t("updPill.busy") : t("updPill.label"));
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

		/** 首页：模式旁挂「dsh-breach」→ 打开插件。红队模式走模式下拉（registry 声明）。 */
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
					t: ctx.locale.bind(NS),
				}),
			}, RewindSafe));
			ctx.effect(() => installRewindWatch(ctx), "dsh-breach: rewind watch");
		}

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-breach: dictionaries");
			const t = ctx.locale.bind(NS);
			translate = t;
			// 红队门禁的依赖已随演练台删除，不能再挂到共享 overlay，
			// 否则其 effect 抛错会让宿主卸载同组的入口和设置面板。
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-breach-dock",
				order: 50,
			}, () => h(react.Fragment, null, h(WelcomeNotice), h(HappyLauncher), h(HappyDock), h(HeroNewSessionMount), h(TabRowHappyMount))));
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
