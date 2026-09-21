<template>
  <view class="create-page">
    <view class="name-bar">
      <input v-model="groupName" class="name-input" type="text" placeholder="群聊名称（可不填，自动生成）" placeholder-class="ph" :maxlength="30" />
    </view>

    <view class="tip-row">
      <text>选择好友加入群聊（{{ selected.length }} 人）</text>
    </view>

    <view v-if="!friends.length" class="empty">
      <text>还没有好友，先去添加朋友吧</text>
    </view>

    <view class="friend-item" v-for="f in friends" :key="f.id" @click="toggle(f)">
      <image class="avatar" :src="avatarUrl(f.avatar)" mode="aspectFill" />
      <text class="nickname">{{ f.remark || f.nickname }}</text>
      <view class="checkbox" :class="{ checked: isChecked(f.id) }">
        <text v-if="isChecked(f.id)">✓</text>
      </view>
    </view>

    <view class="footer">
      <button class="btn-primary" :disabled="!selected.length || creating" @click="createGroup">
        {{ creating ? '创建中...' : `创建群聊（${selected.length + 1}）` }}
      </button>
    </view>
  </view>
</template>

<script>
import store, { fetchFriends } from '../../store'
import { post } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  data() {
    return { groupName: '', selected: [], creating: false }
  },
  computed: {
    friends() {
      return store.friends || []
    }
  },
  onShow() {
    fetchFriends()
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    isChecked(id) {
      return this.selected.includes(id)
    },
    toggle(f) {
      const i = this.selected.indexOf(f.id)
      if (i >= 0) this.selected.splice(i, 1)
      else this.selected.push(f.id)
    },
    async createGroup() {
      if (!this.selected.length) return
      this.creating = true
      try {
        const res = await post('/api/conversations/group', {
          name: this.groupName.trim(),
          member_ids: this.selected
        })
        uni.showToast({ title: '群聊已创建', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/chat/detail?id=${res.conversation_id}&name=${encodeURIComponent(res.name)}`
          })
        }, 600)
      } catch (e) {
        // toast 已统一处理
      } finally {
        this.creating = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.create-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 160rpx;
}
.name-bar {
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.name-input {
  font-size: 30rpx;
}
.ph {
  color: #c0c0c0;
}
.tip-row {
  padding: 24rpx 30rpx 10rpx;
  font-size: 24rpx;
  color: #999999;
}
.friend-item {
  display: flex;
  align-items: center;
  padding: 18rpx 30rpx;
  &:active {
    background: #f5f5f5;
  }
}
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 10rpx;
  background: #e0e0e0;
  margin-right: 22rpx;
}
.nickname {
  flex: 1;
  font-size: 30rpx;
}
.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #cccccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 26rpx;
  &.checked {
    background: $im-green;
    border-color: $im-green;
  }
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #eeeeee;
}
.empty {
  padding: 160rpx 0;
  text-align: center;
  color: #aaaaaa;
}
</style>
