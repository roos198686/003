import { reactive } from 'vue'
import { get, post } from '../utils/request'
import socket from '../utils/socket'

// 轻量事件总线：供聊天页监听新消息等
const listeners = {}
export const bus = {
  on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn)
  },
  off(evt, fn) {
    const list = listeners[evt]
    if (!list) return
    const i = list.indexOf(fn)
    if (i >= 0) list.splice(i, 1)
  },
  emit(evt, payload) {
    for (const fn of listeners[evt] || []) {
      try { fn(payload) } catch (e) { console.error(e) }
    }
  }
}

const store = reactive({
  user: null,
  conversations: [],
  friends: [],
  requests: [],
  currentConversationId: 0,
  // 通话信令状态
  call: null, // { id, mode, peer, isCaller, status }

  get unreadTotal() {
    return this.conversations.reduce((sum, c) => sum + (Number(c.unread) || 0), 0)
  }
})

// ---------- 会话 ----------
export async function fetchConversations() {
  try {
    const list = await get('/api/conversations')
    store.conversations = sortConversations(list || [])
  } catch (e) {
    // 请求失败保持现状
  }
  updateBadge()
}

function sortConversations(list) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const ta = a.last_message ? new Date(a.last_message.created_at).getTime() : 0
    const tb = b.last_message ? new Date(b.last_message.created_at).getTime() : 0
    return tb - ta
  })
}

function updateBadge() {
  const n = store.unreadTotal
  if (n > 0) {
    uni.setTabBarBadge({ index: 0, text: n > 99 ? '99+' : String(n), fail: () => {} })
  } else {
    uni.removeTabBarBadge({ index: 0, fail: () => {} })
  }
}

export { updateBadge }

// 处理实时新消息
function handleIncomingMessage(message) {
  const conv = store.conversations.find((c) => c.id === message.conversation_id)
  if (conv) {
    conv.last_message = {
      id: message.id,
      sender_id: message.sender_id,
      type: message.type,
      content: message.content,
      recalled: false,
      created_at: message.created_at
    }
    // 非当前会话：累计未读并重排
    if (store.currentConversationId !== message.conversation_id) {
      conv.unread = Number(conv.unread || 0) + 1
      store.conversations = sortConversations(store.conversations)
      updateBadge()
    }
  } else {
    // 新会话，重新拉取
    fetchConversations()
  }
  bus.emit('msg', message)
}

// 处理撤回
function handleRecall({ conversation_id, message_id }) {
  const conv = store.conversations.find((c) => c.id === conversation_id)
  if (conv && conv.last_message && conv.last_message.id === message_id) {
    conv.last_message.recalled = true
    conv.last_message.content = ''
  }
  bus.emit('recall', { conversation_id, message_id })
}

// 注册 WS 事件（App onLaunch 后调用）
export function bindSocket() {
  socket.on('msg', (res) => handleIncomingMessage(res.message))
  socket.on('recall', handleRecall)
  socket.on('friend_request', (res) => {
    uni.showToast({ title: '收到新的好友申请', icon: 'none' })
    fetchRequests()
    bus.emit('friend_request', res.request)
  })
  socket.on('friend_accepted', (res) => {
    uni.showToast({ title: `${(res.user && res.user.nickname) || '对方'} 已同意你的好友申请`, icon: 'none' })
    fetchFriends()
  })
  socket.on('conversation_update', (res) => {
    fetchConversations()
    bus.emit('conversation_update', res)
  })
  socket.on('conversation_removed', (res) => {
    fetchConversations()
    if (store.currentConversationId === res.conversation_id) {
      uni.navigateBack({ fail: () => {} })
    }
  })
  socket.on('_open', () => {
    // 断线重连后刷新数据
    fetchConversations()
    fetchFriends()
  })

  // ---------- 通话信令 ----------
  socket.on('call_invite', (res) => onCallInvite(res))
  socket.on('call_accept', (res) => onCallAccept(res))
  socket.on('call_reject', (res) => onCallReject(res))
  socket.on('call_hangup', (res) => onCallHangup(res))
  socket.on('call_offer', (res) => bus.emit('call_offer', res))
  socket.on('call_answer', (res) => bus.emit('call_answer', res))
  socket.on('call_ice', (res) => bus.emit('call_ice', res))
}

// 通话信令发送
function sendCall(payload) {
  socket.send({ type: 'call_signal', ...payload })
}

// 生成唯一通话 ID
function genCallId() {
  return 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

// 发起通话（主叫）
export function startCall({ peer, mode, conversationId }) {
  const callId = genCallId()
  store.call = {
    id: callId,
    mode, // 'audio' | 'video'
    peer,
    isCaller: true,
    status: 'ringing',
    conversationId
  }
  sendCall({
    to: peer.id,
    call_id: callId,
    signal: 'invite',
    mode,
    from: store.user,
    conversation_id: conversationId
  })
  uni.navigateTo({
    url: `/pages/call/index?id=${callId}&mode=${mode}&peer=${encodeURIComponent(JSON.stringify(peer))}&caller=1`
  })
}

// 被叫收到邀请
function onCallInvite(res) {
  // 已有通话进行中，直接拒绝
  if (store.call) {
    sendCall({ to: res.from.id, call_id: res.call_id, signal: 'reject', reason: 'busy' })
    return
  }
  const peer = res.from
  const mode = res.mode
  store.call = {
    id: res.call_id,
    mode,
    peer,
    isCaller: false,
    status: 'incoming',
    conversationId: res.conversation_id
  }
  // 弹窗询问是否接听
  uni.showModal({
    title: `${mode === 'video' ? '视频' : '语音'}通话邀请`,
    content: `${peer.nickname} 邀请你进行${mode === 'video' ? '视频' : '语音'}通话，是否接听？`,
    confirmText: '接听',
    cancelText: '拒绝',
    success: (r) => {
      if (r.confirm) {
        acceptCall()
      } else {
        rejectCall()
      }
    }
  })
}

// 被叫接听
export function acceptCall() {
  const c = store.call
  if (!c || c.status !== 'incoming') return
  c.status = 'connecting'
  sendCall({ to: c.peer.id, call_id: c.id, signal: 'accept' })
  uni.navigateTo({
    url: `/pages/call/index?id=${c.id}&mode=${c.mode}&peer=${encodeURIComponent(JSON.stringify(c.peer))}&caller=0`
  })
}

// 被叫拒绝
export function rejectCall() {
  const c = store.call
  if (!c) return
  sendCall({ to: c.peer.id, call_id: c.id, signal: 'reject', reason: 'declined' })
  store.call = null
}

// 主叫收到被叫接听
function onCallAccept(res) {
  const c = store.call
  if (!c || c.id !== res.call_id) return
  c.status = 'connecting'
  bus.emit('call_accept', res)
}

// 主叫收到被叫拒绝
function onCallReject(res) {
  const c = store.call
  if (!c || c.id !== res.call_id) return
  bus.emit('call_reject', res)
  uni.showToast({ title: res.reason === 'busy' ? '对方忙' : '对方拒绝了通话', icon: 'none' })
  store.call = null
  // 通知通话页关闭
  bus.emit('call_close', { call_id: res.call_id })
}

// 任一方挂断
export function hangupCall({ reason } = {}) {
  const c = store.call
  if (!c) return
  sendCall({ to: c.peer.id, call_id: c.id, signal: 'hangup', reason: reason || 'hangup' })
  store.call = null
  bus.emit('call_close', { call_id: c.id })
}

// 收到对方挂断
function onCallHangup(res) {
  const c = store.call
  if (!c || c.id !== res.call_id) return
  store.call = null
  bus.emit('call_close', { call_id: res.call_id })
  uni.showToast({ title: '通话已结束', icon: 'none' })
}

// WebRTC 信令转发（offer/answer/ice）- 通话页调用
export function sendCallSignal(signal, data) {
  const c = store.call
  if (!c) return
  sendCall({ to: c.peer.id, call_id: c.id, signal, ...data })
}

// ---------- 好友 ----------
export async function fetchFriends() {
  try {
    store.friends = (await get('/api/friends')) || []
  } catch (e) {
    // 忽略
  }
}

export async function fetchRequests() {
  try {
    store.requests = (await get('/api/friends/requests')) || []
  } catch (e) {
    // 忽略
  }
}

// ---------- 登录态 ----------
export function restoreSession() {
  const token = uni.getStorageSync('token')
  const user = uni.getStorageSync('user')
  if (token && user) {
    store.user = user
    return true
  }
  return false
}

export function setSession(token, user) {
  uni.setStorageSync('token', token)
  uni.setStorageSync('user', user)
  store.user = user
  socket.close()
  socket.connect()
  fetchMe()
  fetchConversations()
  fetchFriends()
  fetchRequests()
}

export async function fetchMe() {
  try {
    const user = await get('/api/users/me')
    store.user = user
    uni.setStorageSync('user', user)
  } catch (e) {
    // 忽略
  }
}

export function logout() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('user')
  socket.close()
  store.user = null
  store.conversations = []
  store.friends = []
  store.requests = []
  store.currentConversationId = 0
  updateBadge()
}

// 自己发送成功后，更新会话列表最后一条消息
export function updateLastMessage(conversationId, message) {
  const conv = store.conversations.find((c) => c.id === conversationId)
  if (!conv) {
    fetchConversations()
    return
  }
  conv.last_message = {
    id: message.id,
    sender_id: message.sender_id,
    type: message.type,
    content: message.content,
    recalled: false,
    created_at: message.created_at
  }
  store.conversations = sortConversations(store.conversations)
}

// 标记会话已读（本地 + 服务端）
export async function markRead(conversationId) {
  const conv = store.conversations.find((c) => c.id === conversationId)
  if (conv && conv.unread) {
    conv.unread = 0
    updateBadge()
  }
  try {
    await post(`/api/conversations/${conversationId}/read`)
  } catch (e) {
    // 忽略
  }
}

store.install = (app) => {
  app.config.globalProperties.$store = store
}

export default store
