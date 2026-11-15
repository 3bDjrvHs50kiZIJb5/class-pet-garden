/**
 * 通过 ShowDoc 推送接口发送微信公众号提醒（参照 NovoLab ShowDocPushService）。
 * 推送地址由环境变量 SHOWDOC_PUSH_URL 配置（见 .env.example）。
 */
function getPushUrl() {
  return process.env.SHOWDOC_PUSH_URL?.trim() || ''
}

function formatRegisterTime(date = new Date()) {
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  })
}

function truncate(text, max = 120) {
  if (text == null || text === '') return '—'
  const s = String(text).trim()
  if (!s) return '—'
  return s.length <= max ? s : `${s.slice(0, max)}…`
}

/**
 * @param {string} username
 * @param {Date | number} [registeredAt]
 * @param {{ clientIp?: string, hostname?: string, userAgent?: string }} [meta]
 */
export function buildTeacherRegisterNoticeContent(username, registeredAt = new Date(), meta = {}) {
  const lines = [
    `手机号：${username}`,
    `注册时间：${formatRegisterTime(registeredAt)}`,
    `客户端 IP：${meta.clientIp?.trim() || '未知'}`,
    `来源域名：${meta.hostname?.trim() || '未知'}`,
    `User-Agent：${truncate(meta.userAgent, 160)}`,
  ]
  return lines.join('\n')
}

/**
 * 教师注册成功后通知管理员。
 * @param {{ clientIp?: string, hostname?: string, userAgent?: string }} [meta]
 */
export async function sendTeacherRegisterNotice(username, registeredAt = new Date(), meta = {}) {
  const ip = meta.clientIp?.trim()
  const title = ip
    ? `班级宠物园·新教师 ${username}（${ip}）`
    : `班级宠物园·新教师 ${username}`
  const content = buildTeacherRegisterNoticeContent(username, registeredAt, meta)
  return sendAsync(title, content)
}

/**
 * 发送 ShowDoc 推送。开发环境跳过；失败只记日志，不抛错。
 */
export async function sendAsync(title, content) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[ShowDoc] 开发环境跳过推送。Title=${title}`)
    return
  }

  const pushUrl = getPushUrl()
  if (!pushUrl) {
    console.warn(`[ShowDoc] 未配置 SHOWDOC_PUSH_URL，跳过推送。Title=${title}`)
    return
  }

  try {
    const body = new URLSearchParams({ title, content })
    const response = await fetch(pushUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    const responseText = await response.text()

    if (!response.ok) {
      console.warn(
        `[ShowDoc] 推送失败。StatusCode=${response.status}, Response=${responseText}`
      )
    }
  } catch (error) {
    console.warn(`[ShowDoc] 推送异常。Title=${title}`, error)
  }
}
