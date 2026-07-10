/** 中国大陆手机号：11 位，1 开头，第二位 3-9 */
const PHONE_REGEX = /^1[3-9]\d{9}$/

export function isValidPhone(value) {
  return PHONE_REGEX.test(String(value || '').trim())
}
