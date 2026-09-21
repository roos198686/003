<template>
  <view class="chat-list-page">
    <view v-if="!conversations.length" class="empty">
      <text>还没有会话，去通讯录找朋友聊聊吧</text>
    </view>

    <view
      v-for="conv in conversations"
      :key="conv.id"
      class="conv-item"
      :class="{ pinned: conv.pinned }"
      @longpress="showConvMenu(conv)"
      @click="openChat(conv)"
    >
      <view class="avatar-wrap">
        <image class="avatar" :src="convAvatar(conv)" mode="aspectFill" />
        <view v-if="conv.unread" class="unread badge">{{ conv.unread > 99 ? '99+' : conv.unread }}</view>
      </view>
      <view class="conv-main">
        <view class="row1">
          <text class="name">{{ convName(conv) }}</text>
          <text class="time">{{ listTime(conv.last_message && conv.last_message.created_at) }}</text>
        </view>
        <view class="row2">
          <text class="preview">{{ preview(conv) }}</text>
          <view v-if="conv.muted" class="mute-icon">🔕</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import store, { fetchConversations, restoreSession } from '../../store'
import { listTime, msgPreview } from '../../utils/format'
import { BASE_URL } from '../../config'
import { put, del } from '../../utils/request'

export default {
  computed: {
    conversations() {
      return store.conversations
    },
    myId() {
      return (store.user && store.user.id) || 0
    }
  },
  onShow() {
    if (!restoreSession()) {
      uni.reLaunch({ url: '/pages/login/index' })
      return
    }
    fetchConversations()
    this.updateTitleBadge()
  },
  methods: {
    listTime,
    convName(conv) {
      return conv.name || (conv.type === 2 ? '群聊' : '未知用户')
    },
    convAvatar(conv) {
      const url = conv.avatar
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    preview(conv) {
      return msgPreview(conv.last_message, this.myId)
    },
    openChat(conv) {
      uni.navigateTo({
        url: `/pages/chat/detail?id=${conv.id}&name=${encodeURIComponent(this.convName(conv))}`
      })
    },
    showConvMenu(conv) {
      const items = [conv.pinned ? '取消置顶' : '置顶该聊天', conv.muted ? '开启消息提醒' : '不显示该聊天（免打扰）', '删除该会话']
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          try {
            if (res.tapIndex === 0) {
              await put(`/api/conversations/${conv.id}/settings`, { pinned: conv.pinned ? 0 : 1 })
            } else if (res.tapIndex === 1) {
              await put(`/api/conversations/${conv.id}/settings`, { muted: conv.muted ? 0 : 1 })
            } else if (res.tapIndex === 2) {
              await del(`/api/conversations/${conv.id}`)
            }
            fetchConversations()
          } catch (e) {
            // toast 已统一处理
          }
        }
      })
    },
    updateTitleBadge() {
      // 未读总数角标由 store 的 updateBadge 处理 tabBar，这里无需处理标题
    }
  }
}
</script>

<style lang="scss" scoped>
.chat-list-page {
  min-height: 100vh;
  background: #ffffff;
}
.empty {
  padding: 200rpx 0;
  text-align: center;
  color: #aaaaaa;
  font-size: 28rpx;
}
.conv-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  &:active {
    background: #ececec;
  }
  &.pinned {
    background: #f2f2f2;
  }
}
.avatar-wrap {
  position: relative;
  margin-right: 22rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background: #e0e0e0;
}
.unread {
  position: absolute;
  top: -8rpx;
  right: -12rpx;
}
.conv-main {
  flex: 1;
  overflow: hidden;
}
.row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.name {
  font-size: 32rpx;
  color: #191919;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time {
  font-size: 24rpx;
  color: #b2b2b2;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.row2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}
.preview {
  font-size: 27rpx;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.mute-icon {
  font-size: 26rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}
</style>
