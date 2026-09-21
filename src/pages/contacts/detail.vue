<template>
  <view class="detail-page" v-if="friend">
    <view class="card head-card">
      <image class="big-avatar" :src="avatarUrl(friend.avatar)" mode="aspectFill" />
      <view class="head-info">
        <text class="nickname">{{ displayName }}</text>
        <text class="sub">IM号：{{ friend.wx_id }}</text>
        <text class="sub" v-if="friend.signature">签名：{{ friend.signature }}</text>
      </view>
    </view>

    <view class="card" v-if="isFriend">
      <view class="cell" @click="setRemark">
        <text class="cell-title">设置备注</text>
        <text class="cell-value">{{ friend.remark || '未设置' }}</text>
        <view class="cell-arrow"></view>
      </view>
    </view>

    <view class="actions">
      <template v-if="isFriend">
        <button class="btn-primary" @click="goChat">发消息</button>
        <view class="call-row">
          <button class="btn-call" @click="startCall('audio')">
            <text class="call-icon">📞</text>
            <text>语音通话</text>
          </button>
          <button class="btn-call" @click="startCall('video')">
            <text class="call-icon">📹</text>
            <text>视频通话</text>
          </button>
        </view>
        <button class="btn-danger" @click="removeFriend">删除好友</button>
      </template>
      <template v-else>
        <button class="btn-primary" @click="goAddFriend">添加到通讯录</button>
      </template>
    </view>
  </view>
</template>

<script>
import store, { fetchFriends, fetchConversations, startCall } from '../../store'
import { get, del, post, put } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  data() {
    return { id: 0, friend: null, isFriend: false }
  },
  computed: {
    displayName() {
      return (this.friend && (this.friend.remark || this.friend.nickname)) || ''
    }
  },
  onLoad(options) {
    this.id = Number(options.id) || 0
  },
  onShow() {
    this.load()
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    async load() {
      // 先在好友列表里找（含备注），找不到再查用户信息
      const inList = store.friends.find((f) => f.id === this.id)
      if (inList) {
        this.friend = inList
        this.isFriend = true
        return
      }
      try {
        const list = await get('/api/users/search', { kw: this.id })
        const found = (list || []).find((u) => u.id === this.id)
        if (found) {
          this.friend = found
          this.isFriend = !!found.is_friend
        }
      } catch (e) {
        // 忽略
      }
    },
    setRemark() {
      uni.showModal({
        title: '设置备注',
        editable: true,
        placeholderText: '请输入好友备注',
        content: this.friend.remark || '',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const remark = (res.content || '').trim()
            await put(`/api/friends/${this.id}/remark`, { remark })
            await fetchFriends()
            this.load()
          } catch (e) {
            // toast 已统一处理
          }
        }
      })
    },
    async goChat() {
      try {
        const res = await post('/api/conversations/single', { user_id: this.id })
        uni.navigateTo({
          url: `/pages/chat/detail?id=${res.conversation_id}&name=${encodeURIComponent(this.displayName)}`
        })
      } catch (e) {
        // toast 已统一处理
      }
    },
    removeFriend() {
      uni.showModal({
        title: '删除好友',
        content: `确定删除「${this.displayName}」吗？聊天记录将保留。`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await del(`/api/friends/${this.id}`)
            await Promise.all([fetchFriends(), fetchConversations()])
            uni.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => uni.navigateBack(), 600)
          } catch (e) {
            // toast 已统一处理
          }
        }
      })
    },
    goAddFriend() {
      uni.navigateTo({ url: `/pages/contacts/add?user_id=${this.id}` })
    },
    startCall(mode) {
      if (!this.friend) return
      const peer = {
        id: this.friend.id,
        nickname: this.displayName,
        avatar: this.friend.avatar
      }
      // 先发起单聊会话获取 conversation_id，再拨号
      post('/api/conversations/single', { user_id: this.id })
        .then((res) => {
          startCall({ peer, mode, conversationId: res.conversation_id })
        })
        .catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #ededed;
  padding-bottom: 60rpx;
}
.card {
  background: #ffffff;
  border-radius: 16rpx;
  margin: 20rpx 24rpx;
  overflow: hidden;
}
.head-card {
  display: flex;
  padding: 40rpx 30rpx;
}
.big-avatar {
  width: 130rpx;
  height: 130rpx;
  border-radius: 16rpx;
  background: #e0e0e0;
  margin-right: 30rpx;
  flex-shrink: 0;
}
.head-info {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.nickname {
  font-size: 38rpx;
  font-weight: 600;
}
.sub {
  font-size: 26rpx;
  color: #999999;
}
.cell {
  display: flex;
  align-items: center;
  padding: 26rpx 30rpx;
  &:active {
    background: #ececec;
  }
}
.cell-title {
  flex: 1;
  font-size: 30rpx;
}
.cell-value {
  color: #999999;
  font-size: 28rpx;
}
.cell-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #c8c8c8;
  border-right: 3rpx solid #c8c8c8;
  transform: rotate(45deg);
  margin-left: 12rpx;
}
.actions {
  margin: 40rpx 24rpx;
}
button {
  width: 100%;
  margin-bottom: 24rpx;
}
.call-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.btn-call {
  width: 48%;
  background: #ffffff;
  color: #191919;
  border-radius: 12rpx;
  font-size: 28rpx;
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
}
.call-icon {
  margin-right: 10rpx;
  font-size: 32rpx;
}
.btn-danger {
  background: #ffffff;
  color: #fa5151;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  padding: 22rpx 0;
}
</style>
