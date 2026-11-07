# install-plugin

DSH（DeepSeek Harness）的 skill：**装 skill / 插件 / MCP 只走一条路**——先分类，再按宿主版本挑兼容版本，然后装、启用、验证、留回滚。

## 它解决什么

装 DSH 插件最常见的三种翻车，这个 skill 把它们变成默认动作：

1. **版本不兼容**：`@latest` 的 `engines.dsh` 可能根本不含你的宿主版本（例：宿主 `0.2.1-rc.2` 装 `dsh-ops@0.5.0` 会被门禁拒绝，正确版本是 `0.4.4`）。
2. **registry 被换掉**：全局 `.npmrc` 指向 npmmirror 时，某些插件会装出坏结果；必须显式传可信 `--registry`。
3. **把源码当发行包**：仓库 `.gitignore` 排除 `lib/`、原生产物要 cargo 时，`git+https` 安装只会「成功但什么都不发布」。

## 安装

```powershell
$dest = Join-Path $env:DSH_HOME 'skills\install-plugin'
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item '.\*' $dest -Recurse -Force
```

装完不必重启，下一次模型步骤就能看到 `install-plugin`。

## 触发

对 agent 说「装插件」「安装插件」「装 bundle」「install plugin」，并给出 npm 包名、GitHub 仓库地址或技能名。

## 内容

| 节 | 作用 |
| --- | --- |
| §1 分类 | skill / registry 插件 / 未构建源码 / MCP，四选一 |
| §2 skill 装法 | 目录包与平铺文件两种合法形态、命名与 frontmatter 约束 |
| §3 采集宿主事实 | CLI 路径、profile、registry（含便携安装的探测） |
| §4 版本闸门 | 读每版 `engines.dsh`，选满足宿主的最新版；不擅自开版本豁免 |
| §5 装插件 | 备份 → `plugin_manager install_bundle` → CLI 回退 |
| §6 启用与配置 | bundle 开关、`cordis.patch.yml` 行、MCP 连接 |
| §7 验证 | 5 项证据，拿不到就算没装成 |
| §8 回滚 | 关 bundle → remove → 还原备份 |
| §9 坑 | EPERM、`MINIMUM_RELEASE_AGE_VIOLATION`、git 通道等 |
| §10 汇报 | 5 行结论 + 风险 |

## 回滚

```powershell
# 先关 bundle（plugin_manager set_bundle enabled=false），再移除包
& $cli plugin --profile $env:DSH_PROFILE remove <pkg>
# 依赖树不一致时按备份清单修复
& $cli plugin --profile $env:DSH_PROFILE install
```

不删锁文件、不按进程名批量强杀——这两件事都会把可恢复的问题变成不可恢复的。

## 兼容性

面向 DSH `0.2.x` 的 profile / bundle 机制编写；只用宿主自带能力（`plugin_manager` 工具 + 随包 CLI），不引入额外依赖。
