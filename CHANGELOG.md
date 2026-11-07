# CHANGELOG

## [0.2.0] - 2026-11-07

### 新增

- 打包为 DSH 插件：`cordis.patch.yml` + `lib/index.js`，把随包的 `skills/install-plugin/SKILL.md` 注册进 `ctx.skills`（rank 600），可在「添加插件」里用 GitHub 地址或本地目录装。
- `engines.dsh` 声明兼容范围（`>=0.2.0-rc.2 <0.3.0`），宿主版本不符时安装前就被拦下。
- `node --test` 自检：frontmatter 多行折叠块解析、provider 注册、正文读取。

### 变更

- 仓库结构改为插件包标准布局：`SKILL.md` → `skills/install-plugin/SKILL.md`。
- README 改写为插件安装说明。

## [0.1.0] - 2026-11-07

### 新增

- 初版 skill（10 节）：分类 → 版本闸门 → 采集宿主事实 → 安装 → 启用配置 → 验证 → 回滚 → 坑 → 汇报。
- 首次验证：用该 skill 在 DSH `0.2.1-rc.2` 上装 `dsh-ops@0.4.4`（`0.5.0` 因 `engines.dsh` 不兼容被排除）。
