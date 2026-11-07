// 自检：随包的 SKILL.md 能被解析、能被注册成 provider、正文能读出来。
// 复用 dsh-guizang-design 的 assert 风格：不起服务、不碰宿主。
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, frontmatter, readSkills } from '../lib/index.js'

test('frontmatter 支持多行折叠块 description', () => {
  const parsed = frontmatter('---\nname: demo\ndescription: >\n  第一行\n  第二行\n---\n正文\n')
  assert.equal(parsed.fields.name, 'demo')
  assert.equal(parsed.fields.description, '第一行 第二行')
  assert.equal(parsed.body, '正文\n')
})

test('随包只有一个 skill，且描述可用', () => {
  const skills = readSkills()
  assert.equal(skills.length, 1)
  const [skill] = skills
  assert.equal(skill.name, 'install-plugin')
  assert.ok(skill.description.includes('安装'), '描述应写明装什么')
  assert.ok(skill.description.length > 20 && skill.description.length <= 500, '描述要在目录上限内')
  assert.ok(skill.body.includes('版本闸门'), '正文应包含版本闸门一节')
})

test('注册进 ctx.skills 后 list/get 都能用', async () => {
  let registered
  let disposed = false
  const ctx = {
    effect(fn) {
      fn()
      return () => {}
    },
    skills: {
      registerProvider(factory) {
        registered = factory()
        return () => {
          disposed = true
        }
      },
    },
  }
  apply(ctx)
  assert.ok(registered, 'apply 必须注册 provider')
  assertEqualsDispose(disposed)

  const list = await registered.list()
  assert.equal(list.length, 1)
  assert.equal(list[0].rank, 600, '随包 skill 排在用户级之后')
  assert.equal(list[0].source, 'bundled')

  const got = await registered.get(list[0])
  assert.ok(got.content.includes('# 快速安装'), 'get 返回正文')
  assert.equal(got.rank, undefined, 'summary 不带 rank')
})

function assertEqualsDispose(disposed) {
  assert.equal(disposed, false, 'apply 只登记，不该立刻 dispose')
}
