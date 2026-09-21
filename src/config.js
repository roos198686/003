// 全局接口地址配置
// H5 端走 devServer 代理（相对路径）；小程序端直连本机服务
let BASE_URL = 'https://www.cupidtide.com'
// #ifdef H5
BASE_URL = ''
// #endif

// WebSocket 地址
function getWsUrl() {
  let token = ''
  try {
    token = uni.getStorageSync('token') || ''
  } catch (e) {
    token = ''
  }
  const suffix = token ? `?token=${encodeURIComponent(token)}` : ''
  // #ifdef H5
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws${suffix}`
  // #endif
  // #ifndef H5
  return `wss://www.cupidtide.com/ws${suffix}`
  // #endif
}

export { BASE_URL, getWsUrl }
