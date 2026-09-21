<template>
  <view class="requests-page">
    <view v-if="!requests.length" class="empty">
      <text>暂无新的好友申请</text>
    </view>

    <view class="request-item" v-for="r in requests" :key="r.id">
      <image class="avatar" :src="avatarUrl(r.avatar)" mode="aspectFill" />
      <view class="info">
        <text class="nickname">{{ r.nickname }}</text>
        <text class="sub">{{ r.message || '请求加你为好友' }}</text>
      </view>
      <view class="btns">
        <button class="btn-accept" @click="accept(r)">同意</button>
        <button class="btn-reject" @click="reject(r)">拒绝</button>
      </view>
    </view>
  </view>
</template>

<script>
import store, { fetchRequests, fetchFriends } from '../../store'
import { post } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  computed: {
    requests() {
      return store.requests
    }
  },
  onShow() {
    fetchRequests()
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    async accept(r) {
      try {
        await post(`/api/friends/requests/${r.id}/accept`)
        uni.showToast({ title: '已添加好友', icon: 'success' })
        await Promise.all([fetchRequests(), fetchFriends()])
      } catch (e) {
        // toast 已统一处理
      }
    },
    async reject(r) {
      try {
        await post(`/api/friends/requests/${r.id}/reject`)
        fetchRequests()
      } catch (e) {
        // toast 已统一处理
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.requests-page {
  min-height: 100vh;
  background: #ffffff;
}
.empty {
  padding: 160rpx 0;
  text-align: center;
  color: #aaaaaa;
}
.request-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.avatar {
  width: 90rpx;
  height: 90rpx;
  border-radius: 12rpx;
  background: #e0e0e0;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nickname {
  font-size: 32rpx;
}
.sub {
  font-size: 25rpx;
  color: #999999;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btns {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.btn-accept {
  background: $im-green;
  color: #ffffff;
  font-size: 26rpx;
  padding: 0 26rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
}
.btn-reject {
  background: #f5f5f5;
  color: #666666;
  font-size: 26rpx;
  padding: 0 26rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 8rpx;
}
</style>
