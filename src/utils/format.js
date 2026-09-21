// 时间与消息预览格式化
function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

// 会话列表时间：今天 HH:mm / 昨天 HH:mm / 一周内星期X / 具体日期
export function listTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000)
  if (diffDays === 0) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return WEEK[d.getDay()]
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}/${d.getDate()}`
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// 聊天页完整时间：今天 HH:mm，其他 yyyy年m月d日 HH:mm
export function chatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameDay(d, now)) return hm
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

// 两条消息是否需要显示时间分隔（间隔超过 5 分钟）
export function needTimeSplit(prev, cur) {
  if (!prev) return true
  return new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
}

// 会话列表最后一条消息预览
export function msgPreview(msg, myId) {
  if (!msg) return ''
  if (msg.recalled) {
    return msg.sender_id === myId ? '你撤回了一条消息' : '对方撤回了一条消息'
  }
  if (msg.type === 2) return '[图片]'
  if (msg.type === 3) return '[语音]'
  return String(msg.content || '').replace(/\n/g, ' ')
}

// 语音时长格式化（秒 -> "N\""）
export function voiceDuration(extra) {
  let dur = 0
  try {
    const obj = typeof extra === 'string' ? JSON.parse(extra) : extra
    dur = Number(obj && obj.duration) || 0
  } catch (e) {
    dur = 0
  }
  return Math.max(1, Math.round(dur / 1000)) + '"'
}

// 图片消息尺寸样式（最大 300rpx，等比缩放）
export function imgStyle(extra) {
  let w = 0
  let h = 0
  try {
    const obj = typeof extra === 'string' ? JSON.parse(extra) : extra
    w = Number(obj && obj.w) || 0
    h = Number(obj && obj.h) || 0
  } catch (e) {
    w = 0
    h = 0
  }
  const MAX = 300
  const MIN = 120
  let cw = MAX
  let ch = MAX
  if (w > 0 && h > 0) {
    const ratio = w / h
    if (ratio >= 1) {
      cw = MAX
      ch = Math.round(MAX / ratio)
      if (ch < MIN) { ch = MIN; cw = Math.round(MIN * ratio) }
    } else {
      ch = MAX
      cw = Math.round(MAX * ratio)
      if (cw < MIN) { cw = MIN; ch = Math.round(MIN / ratio) }
    }
  }
  return `width: ${cw}rpx; height: ${ch}rpx;`
}
