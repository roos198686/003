import { BASE_URL } from '../config'

const TOKEN_KEY = 'token'

export function getToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token || '')
}

// 统一请求封装：resolve 业务数据，reject 时已 toast
function request({ url, method = 'GET', data = {} }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: { Authorization: 'Bearer ' + getToken() },
      success: (res) => {
        if (res.statusCode === 401) {
          onUnauthorized()
          return reject(new Error('未登录'))
        }
        const body = res.data || {}
        if (body.code === 0) return resolve(body.data)
        uni.showToast({ title: body.message || '请求失败', icon: 'none' })
        reject(new Error(body.message || '请求失败'))
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请检查服务是否启动', icon: 'none' })
        reject(err)
      }
    })
  })
}

function onUnauthorized() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync('user')
  uni.showToast({ title: '请先登录', icon: 'none' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' })
  }, 600)
}

export const get = (url, data) => request({ url, method: 'GET', data })
export const post = (url, data) => request({ url, method: 'POST', data })
export const put = (url, data) => request({ url, method: 'PUT', data })
export const del = (url, data) => request({ url, method: 'DELETE', data })

// 上传图片
export function uploadImage(filePath) {
  return uploadFile(filePath).then((res) => res.url)
}

// 通用文件上传：图片/语音等
export function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/api/upload',
      filePath,
      name: 'file',
      header: { Authorization: 'Bearer ' + getToken() },
      success: (res) => {
        try {
          const body = JSON.parse(res.data)
          if (body.code === 0) return resolve(body.data)
          uni.showToast({ title: body.message || '上传失败', icon: 'none' })
          reject(new Error(body.message))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

// H5 端上传 Blob（用于 MediaRecorder 录音）
export function uploadBlob(blob, filename) {
  const formData = new FormData()
  formData.append('file', blob, filename || 'voice.webm')
  return fetch(BASE_URL + '/api/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + getToken() },
    body: formData
  })
    .then((res) => res.json())
    .then((body) => {
      if (body.code === 0) return body.data
      uni.showToast({ title: body.message || '上传失败', icon: 'none' })
      throw new Error(body.message)
    })
}
