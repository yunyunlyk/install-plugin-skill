// DSH 插件入口：把随包的 skills/<name>/SKILL.md 注册进 ctx.skills。
// 为什么必须有这一层：DSH 只从 skills 根目录（用户级/项目级）发现 skill，
// 插件包里的 skills/ 不会自动生效 —— 只有插件自己 registerProvider，
// 从「添加插件」装进来之后模型才看得见这个 skill。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SKILL_DIR = join(ROOT, 'skills')

// 随包提供排 600：用户自己在 $DSH_HOME/skills 装的同名 skill 排更前，优先于这一份。
const RANK = 600
const INVOCATION = { modelInvocable: true, userInvocable: true }

export const name = 'install-plugin-skill'
export const inject = ['skills']

// 解析 YAML frontmatter：只认 name / description，但要能读多行折叠块（description: >），
// 否则整条 skill 的说明会变成字面量 ">"。
export function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return null
  const lines = match[1].split(/\r?\n/)
  const fields = {}
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) continue
    const [, key, raw] = kv
    if (raw === '>' || raw === '|') {
      const block = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) block.push(lines[++i].trim())
      fields[key] = block.join(raw === '>' ? ' ' : '\n')
    } else {
      fields[key] = raw.trim().replace(/^(["'])(.*)\1$/, '$2')
    }
  }
  return { fields, body: text.slice(match[0].length) }
}

function parse(file) {
  const text = readFileSync(file, 'utf8')
  const parsed = frontmatter(text)
  if (!parsed) return null
  const { name: skillName, description } = parsed.fields
  return skillName && description ? { name: skillName, description, body: parsed.body } : null
}

export function readSkills(dir = SKILL_DIR) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, 'SKILL.md')))
    .map((entry) => ({
      dir: join(dir, entry.name),
      file: join(dir, entry.name, 'SKILL.md'),
      ...parse(join(dir, entry.name, 'SKILL.md')),
    }))
    .filter((skill) => skill?.name)
}

function candidate(skill) {
  return {
    name: skill.name,
    description: skill.description,
    path: skill.file,
    invocation: INVOCATION,
    source: 'bundled',
    provider: 'install-plugin-skill',
    rank: RANK,
    locator: skill.dir,
    resourceBase: { kind: 'directory', path: skill.dir },
  }
}

const provider = {
  name: 'install-plugin-skill',
  async list() {
    return readSkills().map(candidate)
  },
  async get(c) {
    const skill = readSkills().find((x) => x.dir === c?.locator && x.name === c?.name)
    if (!skill) return undefined
    const { rank, locator, ...summary } = candidate(skill)
    return { ...summary, content: skill.body }
  },
}

export function apply(ctx) {
  ctx.effect(() => ctx.skills.registerProvider(() => provider))
}
