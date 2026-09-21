<template>
  <view class="add-page">
    <view class="tip-row">
      <text>选择好友加入群聊（{{ selected.length }} 人）</text>
    </view>

    <view v-if="!friends.length" class="empty">
      <text>没有可添加的好友</text>
    </view>

    <view class="friend-item" v-for="f in friends" :key="f.id" @click="toggle(f)">
      <image class="avatar" :src="avatarUrl(f.avatar)" mode="aspectFill" />
      <text class="nickname">{{ f.remark || f.nickname }}</text>
      <text v-if="inGroup(f.id)" class="in-tag">已在群</text>
      <view v-else class="checkbox" :class="{ checked: isChecked(f.id) }">
        <text v-if="isChecked(f.id)">✓</text>
      </view>
    </view>

    <view class="footer">
      <button class="btn-primary" :disabled="!selected.length || submitting" @click="submit">
        {{ submitting ? '添加中...' : `添加（${selected.length}）` }}
      </button>
    </view>
  </view>
</template>

<script>
import store, { fetchFriends } from '../../store'
import { get, post } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  data() {
    return { id: 0, memberIds: [], selected: [], submitting: false }
  },
  computed: {
    friends() {
      return store.friends || []
    }
  },
  onLoad(options) {
    this.id = Number(options.id) || 0
  },
  async onShow() {
    fetchFriends()
    try {
      const res = await get(`/api/conversations/${this.id}`)
      this.memberIds = (res.members || []).map((m) => m.id)
    } catch (e) {
      // 忽略
    }
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    inGroup(id) {
      return this.memberIds.includes(id)
    },
    isChecked(id) {
      return this.selected.includes(id)
    },
    toggle(f) {
      if (this.inGroup(f.id)) return
      const i = this.selected.indexOf(f.id)
      if (i >= 0) this.selected.splice(i, 1)
      else this.selected.push(f.id)
    },
    async submit() {
      if (!this.selected.length) return
      this.submitting = true
      try {
        await post(`/api/conversations/${this.id}/members`, { member_ids: this.selected })
        uni.showToast({ title: '已添加', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (e) {
        // toast 已统一处理
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.add-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 160rpx;
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
.in-tag {
  font-size: 24rpx;
  color: #bbbbbb;
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
