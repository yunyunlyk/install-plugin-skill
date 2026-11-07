# install-plugin

**v0.2.0** · DSH 插件（bundle）：随包提供 `install-plugin` skill —— 装 skill / 插件 / MCP 只走一条路：**先分类，再按宿主版本挑兼容版本，然后装、验证、留回滚**。

## 为什么要有这层插件

DSH 只从 skills 根目录（用户级 `$DSH_HOME/skills`、项目级 `.dsh/skills`）发现 skill。插件包里的 `skills/` **不会**自动生效——必须由插件自己 `ctx.skills.registerProvider()`。所以这个仓库既是 skill 的源码，也是一个薄插件：装进来，skill 就到。

## 安装

### 方式一：添加插件（推荐）

DSH → 插件页 → 添加插件，粘贴：

```
https://github.com/yunyunlyk/install-plugin-skill
```

或本地开发时填目录：

```
D:\Downloads\编程开发\Deepseek Harness\插件\install-plugin-skill
```

安装后按提示重启 DSH，`install-plugin` 就出现在技能列表里。安装源可自选（默认 / npm 官方 / 中国大陆镜像 / 自定义），本包不依赖 registry 里的任何额外包。

### 方式二：只拷贝 skill（不装插件）

```powershell
$dest = Join-Path $env:DSH_HOME 'skills\install-plugin'
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item '.\skills\install-plugin\*' $dest -Recurse -Force
```

## 它解决什么

装 DSH 插件最常见的三种翻车，这个 skill 把它们变成默认动作：

1. **版本不兼容**：`@latest` 的 `engines.dsh` 可能不含你的宿主版本（例：宿主 `0.2.1-rc.2` 装 `dsh-ops@0.5.0` 会被门禁拒绝，正确是 `0.4.4`）。
2. **registry 被换掉**：全局 `.npmrc` 指向 npmmirror 时，某些插件会装出坏结果；必须显式传可信 `--registry`。
3. **把源码当发行包**：仓库 `.gitignore` 排除 `lib/`、原生产物要 cargo 时，`git+https` 安装只会「成功但什么都不发布」。

## skill 内容

| 节 | 作用 |
| --- | --- |
| §1 分类 | skill / registry 插件 / 未构建源码 / MCP，四选一 |
| §2 skill 装法 | 目录包与平铺文件两种合法形态、命名与 frontmatter 约束 |
| §3 采集宿主事实 | CLI 路径、profile、registry（含便携安装探测） |
| §4 版本闸门 | 读每版 `engines.dsh`，选满足宿主的最新版；不擅自开版本豁免 |
| §5 装插件 | 备份 → `plugin_manager install_bundle` → CLI 回退 |
| §6 启用与配置 | bundle 开关、`cordis.patch.yml` 行、MCP 连接 |
| §7 验证 | 5 项证据，拿不到就算没装成 |
| §8 回滚 | 关 bundle → remove → 还原备份 |
| §9 坑 | EPERM、`MINIMUM_RELEASE_AGE_VIOLATION`、git 通道等 |
| §10 汇报 | 5 行结论 + 风险 |

## 目录结构

```
.
├─ package.json          # dsh.bundle.patch 指向 cordis.patch.yml；engines.dsh 声明兼容范围
├─ cordis.patch.yml      # 插入一行：install-plugin-skill -> 本包
├─ lib/index.js          # 把 skills/ 注册进 ctx.skills（provider rank 600）
├─ skills/install-plugin/SKILL.md
└─ test/plugin.test.mjs  # node --test
```

## 自检

```powershell
node --test
```

## 卸载

插件页关掉 `install-plugin-skill` 这一行，或用 CLI 移除：

```powershell
& $cli plugin --profile $env:DSH_PROFILE remove dsh-install-plugin-skill
```

如果同时留着方式二拷贝的那份 skill，删 `$env:DSH_HOME\skills\install-plugin`。

## 兼容性

- DSH `>=0.2.0-rc.2 <0.3.0`（`engines.dsh`），Node `>=22.19`。
- 不联网、不写工作区外文件；只读自己的 `skills/` 目录。
- 同 rank：随包提供 rank 600，用户自己在 `$DSH_HOME/skills` 装的同名 skill 优先。
