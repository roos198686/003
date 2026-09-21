<template>
  <view class="info-page" v-if="conv">
    <view class="card">
      <view class="members-grid">
        <view class="member" v-for="m in members" :key="m.id">
          <image class="avatar" :src="avatarUrl(m.avatar)" mode="aspectFill" />
          <text class="member-name">{{ m.id === myId ? '我' : m.nickname }}</text>
          <text v-if="m.is_owner" class="owner-tag">群主</text>
        </view>
        <view class="member" @click="addMember">
          <view class="avatar add-btn">
            <text>＋</text>
          </view>
          <text class="member-name">添加</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="cell" @click="renameGroup">
        <text class="cell-title">群聊名称</text>
        <text class="cell-value">{{ conv.name }}</text>
        <view v-if="isOwner" class="cell-arrow"></view>
      </view>
      <view class="cell">
        <text class="cell-title">群成员</text>
        <text class="cell-value">{{ conv.member_count }} 人</text>
      </view>
      <view class="cell">
        <text class="cell-title">消息免打扰</text>
        <switch
          :checked="muted"
          color="#07C160"
          @change="toggleMute"
          style="transform: scale(0.8)"
        />
      </view>
      <view class="cell">
        <text class="cell-title">置顶聊天</text>
        <switch
          :checked="pinned"
          color="#07C160"
          @change="togglePin"
          style="transform: scale(0.8)"
        />
      </view>
    </view>

    <view class="actions">
      <button class="btn-danger" @click="leaveGroup">
        {{ isOwner ? '解散群聊' : '退出群聊' }}
      </button>
    </view>
  </view>
</template>

<script>
import store, { fetchConversations } from '../../store'
import { get, put, del } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  data() {
    return { id: 0, conv: null, members: [], muted: false, pinned: false }
  },
  computed: {
    myId() {
      return (store.user && store.user.id) || 0
    },
    isOwner() {
      return this.conv && this.conv.owner_id === this.myId
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
      try {
        const res = await get(`/api/conversations/${this.id}`)
        if (res.conversation.type !== 2) {
          uni.navigateBack()
          return
        }
        this.conv = res.conversation
        this.members = res.members || []
        this.muted = res.my_settings.muted
        this.pinned = res.my_settings.pinned
      } catch (e) {
        uni.navigateBack({ fail: () => {} })
      }
    },
    renameGroup() {
      if (!this.isOwner) return
      uni.showModal({
        title: '修改群名称',
        editable: true,
        content: this.conv.name,
        success: async (res) => {
          if (!res.confirm) return
          const name = (res.content || '').trim()
          if (!name) return
          try {
            await put(`/api/conversations/${this.id}`, { name })
            this.load()
            fetchConversations()
          } catch (e) {
            // toast 已统一处理
          }
        }
      })
    },
    async toggleMute(e) {
      this.muted = e.detail.value
      try {
        await put(`/api/conversations/${this.id}/settings`, { muted: this.muted })
        fetchConversations()
      } catch (err) {
        // 忽略
      }
    },
    async togglePin(e) {
      this.pinned = e.detail.value
      try {
        await put(`/api/conversations/${this.id}/settings`, { pinned: this.pinned })
        fetchConversations()
      } catch (err) {
        // 忽略
      }
    },
    addMember() {
      if (!this.isOwner) {
        return uni.showToast({ title: '仅群主可添加成员', icon: 'none' })
      }
      uni.navigateTo({ url: `/pages/group/add?id=${this.id}` })
    },
    leaveGroup() {
      const title = this.isOwner ? '解散群聊' : '退出群聊'
      const tip = this.isOwner ? '解散后群聊将不存在，确定吗？' : '退出后仍保留聊天记录，确定吗？'
      uni.showModal({
        title,
        content: tip,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await del(`/api/conversations/${this.id}`)
            await fetchConversations()
            uni.navigateBack({ fail: () => {} })
          } catch (e) {
            // toast 已统一处理
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.info-page {
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
.members-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 30rpx 20rpx 10rpx;
}
.member {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
}
.avatar {
  width: 90rpx;
  height: 90rpx;
  border-radius: 12rpx;
  background: #e0e0e0;
}
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #cccccc;
  color: #999999;
  font-size: 48rpx;
  box-sizing: border-box;
}
.member-name {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #888888;
  max-width: 100rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.owner-tag {
  position: absolute;
  top: -6rpx;
  left: 10rpx;
  background: #fa9d3b;
  color: #ffffff;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}
.cell {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
}
.cell-title {
  flex: 1;
  font-size: 30rpx;
}
.cell-value {
  color: #999999;
  font-size: 28rpx;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.btn-danger {
  width: 100%;
  background: #ffffff;
  color: #fa5151;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  padding: 22rpx 0;
}
</style>
