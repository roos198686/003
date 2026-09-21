<template>
  <view class="groups-page">
    <view v-if="!groups.length" class="empty">
      <text>还没有群聊，去好友资料页发起群聊吧</text>
    </view>

    <view
      class="group-item"
      v-for="g in groups"
      :key="g.id"
      @click="openGroup(g)"
    >
      <view class="avatar multi" v-if="g.avatar">
        <image :src="fullUrl(g.avatar)" mode="aspectFill" class="img" />
      </view>
      <view v-else class="avatar multi">
        <text>👥</text>
      </view>
      <text class="name">{{ g.name }}（{{ g.member_count }}）</text>
    </view>
  </view>
</template>

<script>
import store, { fetchConversations } from '../../store'
import { BASE_URL } from '../../config'

export default {
  computed: {
    groups() {
      return (store.conversations || []).filter((c) => c.type === 2)
    }
  },
  onShow() {
    fetchConversations()
  },
  methods: {
    fullUrl(url) {
      if (!url) return ''
      return url.startsWith('http') ? url : BASE_URL + url
    },
    openGroup(g) {
      uni.navigateTo({
        url: `/pages/chat/detail?id=${g.id}&name=${encodeURIComponent(g.name || '群聊')}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.groups-page {
  min-height: 100vh;
  background: #ffffff;
}
.empty {
  padding: 160rpx 0;
  text-align: center;
  color: #aaaaaa;
}
.group-item {
  display: flex;
  align-items: center;
  padding: 22rpx 30rpx;
  &:active {
    background: #ececec;
  }
  & + & {
    border-top: 1rpx solid #f0f0f0;
  }
}
.avatar {
  width: 90rpx;
  height: 90rpx;
  border-radius: 12rpx;
  background: #e0e0e0;
  margin-right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  overflow: hidden;
  flex-shrink: 0;
  .img {
    width: 100%;
    height: 100%;
  }
}
.name {
  font-size: 30rpx;
}
</style>
