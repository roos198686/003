<template>
  <view class="add-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="输入对方的 IM号 / 账号 / 昵称搜索"
        placeholder-class="ph"
        confirm-type="search"
        @confirm="doSearch"
      />
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <view v-if="searched && !results.length" class="empty">
      <text>未找到相关用户</text>
    </view>

    <view class="result-list" v-if="results.length">
      <view class="result-item" v-for="u in results" :key="u.id" @click="openUser(u)">
        <image class="avatar" :src="avatarUrl(u.avatar)" mode="aspectFill" />
        <view class="info">
          <text class="nickname">{{ u.nickname }}</text>
          <text class="sub">IM号：{{ u.wx_id }}</text>
        </view>
        <text class="action">{{ u.is_friend ? '已添加' : '添加' }}</text>
      </view>
    </view>

    <!-- 发送申请弹层 -->
    <view v-if="showRequest" class="mask" @click="showRequest = false">
      <view class="dialog" @click.stop>
        <view class="dialog-user">
          <image class="avatar" :src="avatarUrl(target.avatar)" mode="aspectFill" />
          <text class="nickname">{{ target.nickname }}</text>
        </view>
        <textarea
          v-model="requestMsg"
          class="dialog-textarea"
          :maxlength="100"
          placeholder="请输入申请留言"
          placeholder-class="ph"
        />
        <button class="btn-primary" :disabled="sending" @click="sendRequest">
          {{ sending ? '发送中...' : '发送申请' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import store, { fetchFriends } from '../../store'
import { get, post } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  data() {
    return {
      keyword: '',
      searched: false,
      results: [],
      showRequest: false,
      target: null,
      requestMsg: '',
      sending: false
    }
  },
  onLoad(options) {
    // 支持从资料页直达申请弹层
    if (options.user_id) {
      this.keyword = options.user_id
      this.doSearch().then(() => {
        const u = this.results.find((x) => x.id === Number(options.user_id))
        if (u && !u.is_friend) this.openUser(u)
      })
    }
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    async doSearch() {
      const kw = this.keyword.trim()
      if (!kw) return
      this.searched = true
      this.showRequest = false
      try {
        this.results = (await get('/api/users/search', { kw })) || []
      } catch (e) {
        this.results = []
      }
    },
    openUser(u) {
      if (u.is_friend) {
        uni.navigateTo({ url: `/pages/contacts/detail?id=${u.id}` })
        return
      }
      this.target = u
      this.requestMsg = `我是${(store.user && store.user.nickname) || ''}`
      this.showRequest = true
    },
    async sendRequest() {
      if (!this.target) return
      this.sending = true
      try {
        const res = await post('/api/friends/requests', {
          user_id: this.target.id,
          message: this.requestMsg
        })
        this.showRequest = false
        uni.showToast({
          title: res.accepted ? '已添加好友' : '申请已发送，等待对方同意',
          icon: 'none'
        })
        if (res.accepted) {
          fetchFriends()
          this.doSearch()
        }
      } catch (e) {
        // toast 已统一处理
      } finally {
        this.sending = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.add-page {
  min-height: 100vh;
  background: #ededed;
}
.search-bar {
  display: flex;
  align-items: center;
  background: #ffffff;
  margin: 20rpx 24rpx;
  border-radius: 12rpx;
  padding: 0 24rpx;
}
.search-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
}
.search-btn {
  color: #576b95;
  font-size: 30rpx;
  padding-left: 20rpx;
}
.ph {
  color: #c0c0c0;
}
.empty {
  padding: 160rpx 0;
  text-align: center;
  color: #aaaaaa;
}
.result-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 24rpx 30rpx;
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
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nickname {
  font-size: 32rpx;
}
.sub {
  font-size: 24rpx;
  color: #999999;
  margin-top: 6rpx;
}
.action {
  color: #576b95;
  font-size: 28rpx;
  padding: 10rpx 24rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.dialog {
  width: 600rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx 36rpx;
}
.dialog-user {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  .avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 12rpx;
    margin-right: 20rpx;
  }
  .nickname {
    font-size: 32rpx;
    font-weight: 600;
  }
}
.dialog-textarea {
  width: 100%;
  height: 160rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
button {
  margin-top: 30rpx;
}
</style>
