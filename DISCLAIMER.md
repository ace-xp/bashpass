# 免责声明 / Disclaimer

bashpass 通过 PreToolUse hook 改变 Claude Code 的默认权限询问策略：
- 把内置安全清单中的 Bash 命令自动放行
- 把内置危险清单中的 Bash 命令自动拒绝
- 其余命令保持 Claude Code 原生 ask 行为

**使用 bashpass 即视为已阅读并接受以下条款：**

1. **不保证拦截所有危险命令** — 内置危险清单是尽力而为，复杂的命令组合可能绕过启发式检查。
2. **不保证安全清单内的命令在任何上下文都无副作用** — 例如 `rm` 在符号链接上、`git checkout` 覆盖未提交修改等边界情况。
3. **使用者自行承担因自动放行 / 自动拒绝造成的任何损失。**
4. 项目按 MIT 协议授权，作者不承担任何责任。

bashpass changes Claude Code's default permission-prompt policy via a PreToolUse hook. By using bashpass, you accept that the built-in allow/deny lists are best-effort and that you bear full responsibility for any consequences of automatic decisions.
