---
name: install-plugin
description: >
  安装 DSH 的 skill、插件（bundle）或 MCP 连接：拿到仓库地址/npm 包名/技能名后，
  先判定它是哪一类、按宿主 DSH 版本挑出兼容版本，再下载安装、启用、配置、留证据并给回滚。
  Use when the user says 装插件、安装插件、装 bundle、install plugin，给出 GitHub 仓库
  或 npm 包名要装进 DSH，或插件报版本不兼容 / EPERM / registry 错误时。
---

# 快速安装 skill / 插件 / MCP

输入是用户给的仓库 URL、npm 包名或技能名。全程中文，最后按 §8 汇报。
**先分类、再选版本、最后才装**——顺序颠倒就会装出一个不生效的东西。

## 1 先判定是哪一类（四选一，不猜）

| 证据 | 类型 | 装法 |
| --- | --- | --- |
| 有 `SKILL.md` | skill | 拷到 `$env:DSH_HOME\skills\<name>`（§2） |
| 有 `dsh-plugin.json` **且** npm 上有同名包 | 插件 | 走 registry（§3–§5） |
| 有 `dsh-plugin.json`，但 npm 上没发布、仓库里 `lib/` 也没构建 | 源码 | **不可装**：让用户先 `npm pack`，再 `add file:<tarball>`；不要硬装 git |
| 只有 MCP server 的 `command`/`args` | MCP | profile `cordis.patch.yml` 插 `@deepseek-ai/dsh-mcp-client` 行（§6） |

判定命令：仓库根看 `SKILL.md` / `dsh-plugin.json` / `package.json` 的 `dsh.bundle` 字段。
`git+https` 直接装只在仓库**已提交构建产物**时可行，多数插件不行——别试第二遍。

## 2 skill 的装法

- 目录包 `<name>/SKILL.md`，或平铺文件 `<name>.md`；**不递归扫** `**/SKILL.md`。
- 名字 kebab-case（`^[a-z0-9]+(-[a-z0-9]+)*$`），目录名 = frontmatter 的 `name`。
- frontmatter 必须有 `name` 与 `description`，缺一个整条被忽略；description ≤500 字符，写清「什么时候用」。
- `SKILL.md` 提到 `scripts/`、`references/`、`assets/` 时整个目录一起拷。
- 已存在同名目录先报告（路径 + SHA256）再问覆盖还是跳过，不默认覆盖。
- 项目级 `.dsh/skills`（rank 100）会盖掉用户级同名 skill；「装了没生效」先查这里。

```powershell
$dshHome = $env:DSH_HOME          # 不要写 $home：PowerShell 只读自动变量，赋值会静默失败
$dest = Join-Path $dshHome 'skills\<name>'
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item '<源目录>\*' $dest -Recurse -Force
Get-Content "$dest\SKILL.md" -TotalCount 8 -Encoding UTF8   # 5.1 不加 -Encoding 中文乱码
```

## 3 采集宿主事实（装插件前必做）

```powershell
# 标准安装
$cli = Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'
# 便携/自定义安装：找 DeepSeek Harness.exe，用同级的 resources\runtime\cli\bin\dsh.cmd
if(-not (Test-Path $cli)){
  $exe = Get-ChildItem 'C:\','D:\' -Filter 'DeepSeek Harness.exe' -Recurse -Depth 3 -ErrorAction SilentlyContinue |
         Select-Object -First 1
  if($exe){ $cli = Join-Path $exe.DirectoryName 'resources\runtime\cli\bin\dsh.cmd' }
}
"cli=$cli  exists=$(Test-Path $cli)"
"profile=$env:DSH_PROFILE  profileDir=$env:DSH_PROFILE_DIR"
& $cli --version
npm config get registry
```

- 便携安装的桌面应用**不在** `%LOCALAPPDATA%`，CLI 要按实际安装目录找；桌面 profile 只能用应用自带的 CLI，普通全局 `dsh` 管不了它。
- `.npmrc` 若指向 `registry.npmmirror.com`，装某些插件（如 dsh-ops）会失败，**必须显式传 `--registry`**。

## 4 版本闸门（最常被跳过、也最容易翻车）

1. 拉 registry 版本表，读每版 `engines.dsh`（没有就看 `peerDependencies['@deepseek-ai/dsh']`）。
2. 选**满足宿主版本的最新版**，不要无脑 `@latest`。
3. 宿主不满足时**不要**默认 `set_version_exemption`。只有用户对那个具体版本明确同意、并知道可能崩溃/丢数据，才允许开豁免。
4. 顺手看发布时间，避免撞 `minimumReleaseAge` 策略。

```powershell
$j = Invoke-RestMethod "https://registry.npmjs.org/<pkg>"
$j.'dist-tags'
$j.versions.PSObject.Properties | ForEach-Object { "$($_.Name)  $($_.Value.engines.dsh)" }
```

## 5 装插件

1. **备份**（失败可回滚）：
   `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`cordis.patch.yml` → `.bak-<ts>`。
2. **首选** `plugin_manager` 工具：
   `install_bundle`，`target=<pkg>@<ver>`，`registry=<可信 registry URL>`。
   它负责写入依赖、登记 `dsh.profile.bundles`、处理启用状态；活 profile 会立即生效。
3. **回退**（工具报权限/未应用/不支持时）：

```powershell
& $cli plugin --profile $env:DSH_PROFILE add '<pkg>@<ver>' --registry=https://mirrors.huaweicloud.com/repository/npm/
```

   `dsh plugin` 把参数**原样转发给 profile 内 pnpm**，所以 pnpm 的 `--registry` 等参数直接跟在后面。

## 6 启用与配置

- 看状态：`plugin_manager list_plugins`（或 `list_bundles`），确认条目存在且 `enabled`。
- 开关：`plugin_manager set_bundle`（`enabled: true|false`）。
- 配置写到 `$env:DSH_PROFILE_DIR\cordis.patch.yml`：按 `id` 覆盖已有行，或 `- insert:` 新增行。YAML 方言（insert/override/group/disabled/isolate/`!!js`）先读 `cordis-composition-reference` skill，不要自造语法。
- MCP 连接：

```yaml
- insert:
    - id: mcp-<name>
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: <name>
        transport: stdio
        command: '<node 绝对路径>'
        args: ['<script 绝对路径>']
```

## 7 验证（只认证据，不认「装好了」）

| 证据 | 命令/位置 |
| --- | --- |
| 依赖已写 | profile `package.json` 的 `dependencies['<pkg>']` |
| 已登记启用 | `dsh.profile.bundles` 含 `<pkg>` |
| 文件真在 | `$env:DSH_PROFILE_DIR\node_modules\<pkg>\`（有 `lib\` 或入口） |
| 运行时认到 | `plugin_manager list_plugins` 出现该行且 enabled |
| 工具面生效 | 新会话里能看到它的工具；**宿主侧改动通常要重启应用** |

拿不到第 4 项就当作没装成；拿不到第 5 项要明说「需重启后确认」，不要替用户宣布生效。

## 8 回滚

1. `plugin_manager set_bundle` 关掉（先止血）。
2. `& $cli plugin --profile <p> remove <pkg>`。
3. 还原 §5 备份的四件套；依赖树不一致时用同一个官方 CLI 跑 `plugin --profile <p> install` 按备份清单修。
4. **不要**删锁文件、**不要**按进程名批量强杀。

## 9 坑

- **npmmirror 装 dsh-ops 有 bug**（作者明确不推荐）→ 用华为云或 npmjs。
- **Windows 运行中装会 `ERR_PNPM_EPERM`**（文件被占用）→ 备份后重试；仍失败让用户退出应用（含托盘进程），从外部终端重跑同一条命令，别在目标 profile 的 shell 里装。
- **`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`** 不是文件占用 → 换满足策略的版本或换元数据完整的 registry，**不能删锁文件绕过**。
- **git 通道**：仓库 `.gitignore` 排除了 `lib/`、原生产物需 cargo 时，git 装必然「成功但什么都不发布」。
- 装完不重启可能只有半套生效；替换已加载代码后需要重启应用。
- 上游更新没有自动机制：重跑同样的 `add <pkg>@<ver>`。

## 10 汇报（5 行内）

装了什么（名称@版本）→ 装在哪（profile/技能目录）→ 证据（上面 5 项里拿到哪几项）→ 怎么触发/怎么用 → 怎么回滚。
再补一句风险：包是否有 install/prepare 钩子、是否联网、是否会隐藏或替换官方工具——安装只落文件，但用之前要知道它动什么。
