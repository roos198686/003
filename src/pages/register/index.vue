<template>
  <view class="register-page">
    <view class="form">
      <input v-model="username" class="ipt" type="text" placeholder="账号（3-20 位字母数字下划线）" placeholder-class="ph" :maxlength="20" />
      <input v-model="nickname" class="ipt" type="text" placeholder="昵称" placeholder-class="ph" :maxlength="20" />
      <input v-model="password" class="ipt" type="password" password placeholder="密码（至少 6 位）" placeholder-class="ph" :maxlength="32" />
      <input v-model="password2" class="ipt" type="password" password placeholder="确认密码" placeholder-class="ph" :maxlength="32" @confirm="doRegister" />
      <button class="btn-primary" :disabled="loading" @click="doRegister">
        {{ loading ? '注册中...' : '注册并登录' }}
      </button>
      <view class="links">
        <text class="link" @click="goBack">已有账号？返回登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { post, setToken } from '../../utils/request'
import { setSession } from '../../store'

export default {
  data() {
    return { username: '', nickname: '', password: '', password2: '', loading: false }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async doRegister() {
      const { username, nickname, password, password2 } = this
      if (!username.trim() || !nickname.trim()) {
        return uni.showToast({ title: '请填写账号和昵称', icon: 'none' })
      }
      if (password.length < 6) {
        return uni.showToast({ title: '密码至少 6 位', icon: 'none' })
      }
      if (password !== password2) {
        return uni.showToast({ title: '两次密码不一致', icon: 'none' })
      }
      this.loading = true
      try {
        const res = await post('/api/auth/register', {
          username: username.trim(),
          nickname: nickname.trim(),
          password
        })
        setSession(res.token, res.user)
        setToken(res.token)
        uni.switchTab({ url: '/pages/chat/list' })
      } catch (e) {
        // toast 已统一处理
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: #ffffff;
  padding: 120rpx 80rpx 0;
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
button {
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
</style>
