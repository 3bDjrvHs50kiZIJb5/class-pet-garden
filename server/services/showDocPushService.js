/**
 * 通过 ShowDoc 推送接口发送微信公众号提醒（参照 NovoLab ShowDocPushService）。
 */
const PUSH_URL =
  'https://push.showdoc.com.cn/server/api/push/8445a3ecf20e9d03e2f2e002a3e230a7716020024'

function formatRegisterTime(date = new Date()) {
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false
  })
}

/**
 * 教师注册成功后通知管理员。
 */
export async function sendTeacherRegisterNotice(username, registeredAt = new Date()) {
  const title = '班级宠物园，教师注册成功'
  const content = `手机号：${username}\n注册时间：${formatRegisterTime(registeredAt)}`
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

  try {
    const body = new URLSearchParams({ title, content })
    const response = await fetch(PUSH_URL, {
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
