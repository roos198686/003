<template>
  <view class="profile-page">
    <view class="cell-group">
      <view class="cell" @click="changeAvatar">
        <text class="cell-title">头像</text>
        <image class="avatar" :src="avatarUrl(user && user.avatar)" mode="aspectFill" />
        <view class="cell-arrow"></view>
      </view>
      <view class="cell" @click="editField('nickname')">
        <text class="cell-title">昵称</text>
        <text class="cell-value">{{ (user && user.nickname) || '' }}</text>
        <view class="cell-arrow"></view>
      </view>
      <view class="cell" @click="editField('wx_id')">
        <text class="cell-title">IM号</text>
        <text class="cell-value">{{ (user && user.wx_id) || '' }}</text>
        <view class="cell-arrow"></view>
      </view>
      <view class="cell" @click="editField('signature')">
        <text class="cell-title">个性签名</text>
        <text class="cell-value sig">{{ (user && user.signature) || '' }}</text>
        <view class="cell-arrow"></view>
      </view>
    </view>
  </view>
</template>

<script>
import store, { fetchMe } from '../../store'
import { put, uploadImage } from '../../utils/request'
import { BASE_URL } from '../../config'

export default {
  computed: {
    user() {
      return store.user || {}
    }
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    async changeAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: async (res) => {
          try {
            const url = await uploadImage(res.tempFilePaths[0])
            await put('/api/users/me', { avatar: url })
            await fetchMe()
            uni.showToast({ title: '头像已更新', icon: 'success' })
          } catch (e) {
            // toast 已统一处理
          }
        }
      })
    },
    editField(field) {
      const titles = { nickname: '修改昵称', wx_id: '修改IM号', signature: '修改签名' }
      const placeholders = { nickname: '1-20 位昵称', wx_id: '6-20 位，字母开头', signature: '介绍一下自己' }
      uni.showModal({
        title: titles[field],
        editable: true,
        content: this.user[field] || '',
        placeholderText: placeholders[field],
        success: async (res) => {
          if (!res.confirm) return
          const value = (res.content || '').trim()
          if (!value) return
          try {
            await put('/api/users/me', { [field]: value })
            await fetchMe()
            uni.showToast({ title: '已保存', icon: 'success' })
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
.profile-page {
  min-height: 100vh;
  background: #ededed;
}
.cell {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
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
  max-width: 380rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.sig {
    max-width: 300rpx;
  }
}
.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 14rpx;
  background: #e0e0e0;
}
.cell-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #c8c8c8;
  border-right: 3rpx solid #c8c8c8;
  transform: rotate(45deg);
  margin-left: 12rpx;
}
</style>
