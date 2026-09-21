<template>
  <view class="login-page">
    <view class="logo-wrap">
      <image class="logo" src="/static/avatar.png" mode="aspectFill" />
      <text class="app-name">IM 聊天</text>
    </view>

    <view class="form">
      <input
        v-model="username"
        class="ipt"
        type="text"
        placeholder="请输入账号"
        placeholder-class="ph"
        :maxlength="20"
      />
      <input
        v-model="password"
        class="ipt"
        type="password"
        password
        placeholder="请输入密码"
        placeholder-class="ph"
        :maxlength="32"
        @confirm="doLogin"
      />
      <button class="btn-primary login-btn" :disabled="loading" @click="doLogin">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <view class="links">
        <text class="link" @click="goRegister">没有账号？去注册</text>
      </view>
    </view>

    <view class="tips">演示账号：zhangsan / 123456、lisi / 123456</view>
  </view>
</template>

<script>
import { post, setToken } from '../../utils/request'
import { setSession } from '../../store'

export default {
  data() {
    return { username: '', password: '', loading: false }
  },
  methods: {
    goRegister() {
      uni.navigateTo({ url: '/pages/register/index' })
    },
    async doLogin() {
      const username = this.username.trim()
      const password = this.password
      if (!username || !password) {
        return uni.showToast({ title: '请输入账号和密码', icon: 'none' })
      }
      this.loading = true
      try {
        const res = await post('/api/auth/login', { username, password })
        setSession(res.token, res.user)
        setToken(res.token)
        uni.switchTab({ url: '/pages/chat/list' })
      } catch (e) {
        // toast 已在 request 中统一处理
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 80rpx;
}
.logo-wrap {
  margin-top: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 32rpx;
}
.app-name {
  margin-top: 30rpx;
  font-size: 40rpx;
  font-weight: 600;
}
.form {
  width: 100%;
  margin-top: 100rpx;
}
.ipt {
  width: 100%;
  height: 96rpx;
  border-bottom: 1rpx solid #ececec;
  font-size: 30rpx;
  margin-bottom: 30rpx;
}
.ph {
  color: #c0c0c0;
}
.login-btn {
  margin-top: 40rpx;
  width: 100%;
}
.links {
  margin-top: 36rpx;
  text-align: center;
}
.link {
  color: #576b95;
  font-size: 28rpx;
}
.tips {
  margin-top: auto;
  padding: 60rpx 0 80rpx;
  font-size: 24rpx;
  color: #aaaaaa;
}
</style>
