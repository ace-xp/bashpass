# bashpass

> Quiet the permission prompts. Keep the safety net.

bashpass 是一个 Claude Code plugin，通过 PreToolUse hook 解决"复合 Bash 命令权限询问太烦"的问题。它拆解 `&&` `||` `;` `|` `$(...)` 这类复合命令，对内置安全清单中的命令自动放行、对内置危险清单中的命令自动拒绝，其余命令保留 Claude Code 原生 ask 行为。

> ⚠️ **使用前请阅读 [DISCLAIMER.md](DISCLAIMER.md)。**
> bashpass 不保证拦截所有危险动作。

## 功能特性

- 拆解控制操作符串联（`&&` `||` `;`）、管道（`|`）、子命令替换（`$(...)`、反引号）
- 引号保护：单/双引号内的特殊字符按字面量处理
- 三态决策：内置 deny 优先；全部子命令命中 allow 才放行；否则不干预
- 自动放行只读工具（`Read` `Grep` `Glob` `WebFetch` `WebSearch`）
- 用户可在 `settings.json` 的 `permissions.allow` 中扩展白名单
- 跨平台（Node.js，零依赖）

## 安装

### 方式 1：通过 Claude Code marketplace（推荐）

在 Claude Code 内执行：

```
/plugin marketplace add ace-xp/bashpass
/plugin install bashpass
```

### 方式 2：单文件 hook（不想装 plugin）

1. 下载 [standalone/pre-tool-use.bundle.js](standalone/pre-tool-use.bundle.js) 到本地，例如 `~/.claude/bashpass/`。
2. 把 [standalone/settings-snippet.json](standalone/settings-snippet.json) 中的 `hooks` 块复制到 `~/.claude/settings.json`，把 `<PATH>` 替换为你保存 bundle 的目录绝对路径。

## 首次启用

bashpass 第一次运行时不会改变任何决策，会向 stderr 写一段中英双语提示。**确认接受免责声明后**执行：

```bash
touch ~/.claude/.bashpass-acknowledged
```

之后 bashpass 才开始工作。

## 扩展白名单

在 `~/.claude/settings.json` 或项目 `.claude/settings.json` 的 `permissions.allow` 里追加 Claude Code 原生格式：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm install:*)",
      "Bash(git push:origin *)"
    ]
  }
}
```

bashpass 会把这些规则与内置安全清单合并取并集。

## 隐私

- bashpass **完全本地运行**，不发起任何网络请求
- bashpass **只读取**你的 `settings.json`，不修改任何配置
- 没有遥测、没有日志上传

## 调试

```bash
BASHPASS_DEBUG=1 claude
```

bashpass 会在 stderr 写每条 hook 的决策：

```
[bashpass] decision=allow tool=Bash subcmds=2 rules=[ls*, git status*] cmd="ls -la && git status"
```

## 开发

```bash
npm test                  # 跑全部测试
npm run build:standalone  # 重新生成 standalone bundle
```

## 安全漏洞披露

发现绕过或漏洞？请在 GitHub Security Advisory 提交，或邮件至 w961952199@163.com。请勿直接开 public issue。

## License

[MIT](LICENSE) — 详见 [LICENSE](LICENSE) 与 [DISCLAIMER.md](DISCLAIMER.md)。
