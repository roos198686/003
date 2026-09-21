<template>
  <view class="contacts-page">
    <!-- 顶部功能入口 -->
    <view class="cell-group">
      <view class="cell" @click="goRequests">
        <view class="entry-avatar entry-orange">
          <text>👤</text>
        </view>
        <text class="cell-title">新朋友</text>
        <view v-if="requestsCount" class="badge">{{ requestsCount > 99 ? '99+' : requestsCount }}</view>
        <view class="cell-arrow"></view>
      </view>
      <view class="cell" @click="goGroups">
        <view class="entry-avatar entry-green">
          <text>👥</text>
        </view>
        <text class="cell-title">群聊</text>
        <view class="cell-arrow"></view>
      </view>
      <view class="cell" @click="goAdd">
        <view class="entry-avatar entry-blue">
          <text>➕</text>
        </view>
        <text class="cell-title">添加朋友</text>
        <view class="cell-arrow"></view>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <input v-model="keyword" class="search-input" type="text" placeholder="搜索好友" placeholder-class="ph" />
    </view>

    <!-- 好友列表 -->
    <view v-if="!filteredFriends.length" class="empty">
      <text>{{ keyword ? '没有匹配的好友' : '还没有好友，点击“添加朋友”认识新朋友吧' }}</text>
    </view>
    <view class="friend-group" v-for="group in groupedFriends" :key="group.letter">
      <view class="letter-row">
        <text>{{ group.letter }}</text>
      </view>
      <view
        class="friend-item"
        v-for="f in group.items"
        :key="f.id"
        @click="goFriendDetail(f)"
      >
        <image class="avatar" :src="avatarUrl(f.avatar)" mode="aspectFill" />
        <text class="nickname">{{ displayName(f) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import store, { fetchFriends, fetchRequests, restoreSession } from '../../store'
import { BASE_URL } from '../../config'

// 模块级拼音排序器（避免渲染期访问实例属性）
let pinyinCollator = null
function getPinyinCollator() {
  if (!pinyinCollator) pinyinCollator = new Intl.Collator('zh-Hans-CN-u-co-pinyin')
  return pinyinCollator
}

export default {
  computed: {
    requestsCount() {
      return store.requests.length
    },
    filteredFriends() {
      const kw = this.keyword.trim().toLowerCase()
      const list = store.friends || []
      if (!kw) return list
      return list.filter(
        (f) =>
          (f.nickname || '').toLowerCase().includes(kw) ||
          (f.remark || '').toLowerCase().includes(kw) ||
          (f.wx_id || '').toLowerCase().includes(kw)
      )
    },
    // 按昵称首字母分组
    groupedFriends() {
      const groups = {}
      for (const f of this.filteredFriends) {
        const letter = this.firstLetter(f)
        if (!groups[letter]) groups[letter] = []
        groups[letter].push(f)
      }
      return Object.keys(groups)
        .sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
        .map((letter) => ({ letter, items: groups[letter] }))
    }
  },
  data() {
    return { keyword: '' }
  },
  onShow() {
    if (!restoreSession()) {
      uni.reLaunch({ url: '/pages/login/index' })
      return
    }
    fetchFriends()
    fetchRequests().then(this.updateBadge)
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    displayName(f) {
      return f.remark || f.nickname
    },
    firstLetter(f) {
      const name = this.displayName(f) || '#'
      const ch = name.charAt(0).toUpperCase()
      if (/[A-Z]/.test(ch)) return ch
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        try {
          // 按拼音排序归入首字母
          const coll = getPinyinCollator()
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
          for (let i = 0; i < letters.length; i++) {
            if (coll.compare(ch, letters[i]) < 0) return i === 0 ? 'A' : letters[i - 1]
          }
          return 'Z'
        } catch (e) {
          return '#'
        }
      }
      return '#'
    },
    updateBadge() {
      const n = store.requests.length
      if (n > 0) {
        uni.setTabBarBadge({ index: 1, text: n > 99 ? '99+' : String(n), fail: () => {} })
      } else {
        uni.removeTabBarBadge({ index: 1, fail: () => {} })
      }
    },
    goRequests() {
      uni.navigateTo({ url: '/pages/contacts/requests' })
    },
    goGroups() {
      uni.navigateTo({ url: '/pages/contacts/groups' })
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/contacts/add' })
    },
    goFriendDetail(f) {
      uni.navigateTo({ url: `/pages/contacts/detail?id=${f.id}` })
    }
  }
}
</script>

<style lang="scss" scoped>
.contacts-page {
  min-height: 100vh;
  background: #ededed;
  padding-bottom: 40rpx;
}
.entry-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  margin-right: 24rpx;
  color: #ffffff;
}
.entry-orange {
  background: #fa9d3b;
}
.entry-green {
  background: $im-green;
}
.entry-blue {
  background: #10aeff;
}
.search-bar {
  margin: 0 24rpx 20rpx;
}
.search-input {
  background: #ffffff;
  border-radius: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}
.ph {
  color: #c0c0c0;
}
.empty {
  padding: 120rpx 0;
  text-align: center;
  color: #aaaaaa;
}
.friend-group {
  margin: 0 24rpx 20rpx;
}
.letter-row {
  padding: 10rpx 30rpx;
  font-size: 24rpx;
  color: #999999;
}
.friend-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 20rpx 30rpx;
  &:active {
    background: #ececec;
  }
  & + & {
    border-top: 1rpx solid #f0f0f0;
  }
}
.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 10rpx;
  background: #e0e0e0;
  margin-right: 24rpx;
}
.nickname {
  font-size: 30rpx;
}
</style>
