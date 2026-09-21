<template>
  <view class="mine-page">
    <view class="cell-group">
      <view class="cell head-cell" @click="goProfile">
        <image class="avatar" :src="avatarUrl(user && user.avatar)" mode="aspectFill" />
        <view class="head-info">
          <text class="nickname">{{ (user && user.nickname) || '未登录' }}</text>
          <text class="sub">IM号：{{ (user && user.wx_id) || '-' }}</text>
        </view>
        <view class="cell-arrow"></view>
      </view>
    </view>

    <view class="cell-group">
      <view class="cell" @click="goProfile">
        <text class="cell-title">个人信息</text>
        <view class="cell-arrow"></view>
      </view>
    </view>

    <view class="cell-group">
      <view class="cell logout" @click="doLogout">
        <text class="cell-title logout-text">退出登录</text>
      </view>
    </view>

    <view class="version">IM v1.0.0</view>
  </view>
</template>

<script>
import store, { restoreSession, logout } from '../../store'
import { BASE_URL } from '../../config'

export default {
  computed: {
    user() {
      return store.user
    }
  },
  onShow() {
    if (!restoreSession()) {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    goProfile() {
      uni.navigateTo({ url: '/pages/mine/profile' })
    },
    doLogout() {
      uni.showModal({
        title: '退出登录',
        content: '确定退出当前账号吗？',
        success: (res) => {
          if (!res.confirm) return
          logout()
          uni.reLaunch({ url: '/pages/login/index' })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: #ededed;
}
.head-cell {
  padding: 36rpx 30rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  background: #e0e0e0;
  margin-right: 26rpx;
  flex-shrink: 0;
}
.head-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nickname {
  font-size: 38rpx;
  font-weight: 600;
}
.sub {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #999999;
}
.logout-text {
  color: #fa5151;
  text-align: center;
}
.version {
  text-align: center;
  color: #bbbbbb;
  font-size: 24rpx;
  padding: 60rpx 0;
}
</style>
