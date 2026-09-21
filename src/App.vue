<script>
import store, {
  restoreSession,
  bindSocket,
  fetchMe,
  fetchConversations,
  fetchFriends,
  fetchRequests
} from './store'
import socket from './utils/socket'

export default {
  onLaunch() {
    if (restoreSession()) {
      bindSocket()
      socket.connect()
      fetchMe()
      fetchConversations()
      fetchFriends()
      fetchRequests()
    }
  },
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
page {
  background-color: #ededed;
  height: 100%;
  font-size: 28rpx;
  color: #191919;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

// 通用白色圆角卡片行（微信列表风格）
.cell-group {
  background: #ffffff;
  border-radius: 16rpx;
  margin: 20rpx 24rpx;
  overflow: hidden;
}
.cell {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  position: relative;
  &:active {
    background: #e5e5e5;
  }
  & + & {
    border-top: 1rpx solid #f0f0f0;
  }
}
.cell-title {
  flex: 1;
  font-size: 30rpx;
}
.cell-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #c8c8c8;
  border-right: 3rpx solid #c8c8c8;
  transform: rotate(45deg);
  margin-left: 12rpx;
}

// 主按钮
.btn-primary {
  background: $im-green;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  padding: 22rpx 0;
  &:active {
    opacity: 0.85;
  }
  &[disabled] {
    opacity: 0.5;
  }
}

// 未读红点
.badge {
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 10rpx;
  border-radius: 16rpx;
  background: #fa5151;
  color: #ffffff;
  font-size: 20rpx;
  text-align: center;
}
</style>
