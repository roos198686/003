import { getWsUrl } from '../config'

// WebSocket 封装：心跳、断线重连、事件分发
let socket = null
let heartbeatTimer = null
let reconnectTimer = null
let reconnectCount = 0
let closedByUser = false

const handlers = {}

function on(type, fn) {
  if (!handlers[type]) handlers[type] = []
  handlers[type].push(fn)
}

function off(type, fn) {
  const list = handlers[type]
  if (!list) return
  const i = list.indexOf(fn)
  if (i >= 0) list.splice(i, 1)
}

function dispatch(msg) {
  const list = handlers[msg.type]
  if (list) {
    for (const fn of list) {
      try {
        fn(msg)
      } catch (e) {
        console.error('[ws handler]', e)
      }
    }
  }
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'ping' }))
    }
  }, 25000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

function scheduleReconnect() {
  if (closedByUser) return
  if (reconnectTimer) return
  const delay = Math.min(3000 * ++reconnectCount, 15000)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function connect() {
  const token = uni.getStorageSync('token')
  if (!token) return
  if (socket && (socket.readyState === 0 || socket.readyState === 1)) return

  closedByUser = false
  // #ifdef H5
  socket = new WebSocket(getWsUrl())
  socket.onopen = handleOpen
  socket.onmessage = (e) => handleMsg(e.data)
  socket.onclose = handleClose
  socket.onerror = handleError
  // #endif
  // #ifndef H5
  socket = uni.connectSocket({ url: getWsUrl(), complete: () => {} })
  socket.onOpen(handleOpen)
  socket.onMessage((res) => handleMsg(res.data))
  socket.onClose(handleClose)
  socket.onError(handleError)
  // #endif
}

function handleOpen() {
  reconnectCount = 0
  startHeartbeat()
  dispatch({ type: '_open' })
}

function handleMsg(raw) {
  try {
    dispatch(JSON.parse(raw))
  } catch (e) {
    // 忽略无法解析的消息
  }
}

function handleClose() {
  stopHeartbeat()
  socket = null
  dispatch({ type: '_close' })
  scheduleReconnect()
}

function handleError() {
  stopHeartbeat()
}

function close() {
  closedByUser = true
  stopHeartbeat()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    // #ifdef H5
    socket.close()
    // #endif
    // #ifndef H5
    socket.close({})
    // #endif
    socket = null
  }
}

function send(obj) {
  if (socket && socket.readyState === 1) {
    const data = JSON.stringify(obj)
    // #ifdef H5
    socket.send(data)
    // #endif
    // #ifndef H5
    socket.send({ data })
    // #endif
    return true
  }
  return false
}

export default { connect, close, on, off, send }
