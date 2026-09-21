<template>
  <view class="chat-page">
    <!-- 消息列表 -->
    <scroll-view
      class="msg-list"
      scroll-y
      :scroll-into-view="scrollInto"
      :scroll-with-animation="true"
      upper-threshold="60"
      @scrolltoupper="loadMore"
    >
      <view class="load-tip" v-if="hasMore">
        <text>上滑加载更多</text>
      </view>

      <block v-for="(m, idx) in messages" :key="m.localId">
        <view :id="'m' + m.localId" class="msg-item">
          <!-- 时间分隔 -->
          <view v-if="needTimeSplit(messages[idx - 1], m)" class="time-row">
            <text>{{ chatTime(m.created_at) }}</text>
          </view>

          <!-- 撤回提示 -->
          <view v-if="m.recalled" class="recall-row">
            <text>{{ m.sender_id === myId ? '你' : m.sender.nickname }} 撤回了一条消息</text>
          </view>

          <!-- 普通消息 -->
          <view v-else class="msg-row" :class="{ self: m.sender_id === myId }">
            <image class="avatar" :src="avatarUrl(m.sender.avatar)" mode="aspectFill" @longpress="onAvatarPress" />
            <view class="bubble-wrap">
              <text v-if="isGroup && m.sender_id !== myId" class="sender-name">{{ m.sender.nickname }}</text>
              <view
                class="bubble"
                :class="[m.sender_id === myId ? 'bubble-self' : 'bubble-other', { 'voice-bubble': m.type === 3 }]"
                @longpress="onMsgPress(m, idx)"
                @click="m.type === 3 && playVoice(m)"
              >
                <image
                  v-if="m.type === 2"
                  class="msg-img"
                  :style="imgStyle(m.extra)"
                  :src="fullUrl(m.content)"
                  mode="aspectFill"
                  @click="previewImg(m)"
                />
                <view v-else-if="m.type === 3" class="voice-content">
                  <text class="voice-icon" :class="{ playing: playingId === m.id }">{{ m.sender_id === myId ? '🎙️' : '🔈' }}</text>
                  <text class="voice-dur">{{ voiceDuration(m.extra) }}</text>
                </view>
                <text v-else class="msg-text" user-select>{{ m.content }}</text>
              </view>
              <view v-if="m.sending" class="sending-tip">
                <text>发送中...</text>
              </view>
            </view>
          </view>
        </view>
      </block>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 输入区 -->
    <view class="input-bar">
      <view class="input-row">
        <text class="icon-btn" @click="toggleVoiceMode">{{ voiceMode ? '⌨️' : '🗣️' }}</text>
        <input
          v-if="!voiceMode"
          v-model="input"
          class="text-input"
          type="text"
          confirm-type="send"
          :cursor-spacing="20"
          :adjust-position="true"
          @confirm="sendText"
          @focus="onInputFocus"
        />
        <view
          v-else
          class="hold-btn"
          :class="{ recording: recording, cancel: recordCancel }"
          @touchstart="onRecordStart"
          @touchmove="onRecordMove"
          @touchend="onRecordEnd"
          @touchcancel="onRecordEnd"
        >
          <text>{{ recordCancel ? '松开 取消' : (recording ? '松开 发送' : '按住 说话') }}</text>
        </view>
        <text class="icon-btn" @click="togglePanel('emoji')">😀</text>
        <text class="icon-btn plus" @click="togglePanel('plus')">＋</text>
        <button v-if="input.trim() && !voiceMode" class="send-btn" @click="sendText">发送</button>
      </view>

      <!-- 录音浮层提示 -->
      <view v-if="recording" class="record-mask">
        <view class="record-toast" :class="{ cancel: recordCancel }">
          <text class="record-anim">{{ recordCancel ? '✕' : '🎙️' }}</text>
          <text class="record-tip">{{ recordCancel ? '松开取消发送' : '正在录音，上滑取消' }}</text>
        </view>
      </view>

      <!-- 表情面板 -->
      <view v-if="panel === 'emoji'" class="panel emoji-panel">
        <scroll-view scroll-y class="emoji-scroll">
          <view class="emoji-grid">
            <text
              v-for="e in emojis"
              :key="e"
              class="emoji-item"
              @click="input += e"
            >{{ e }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 更多面板 -->
      <view v-if="panel === 'plus'" class="panel plus-panel">
        <view class="plus-grid">
          <view class="plus-item" @click="chooseImage('album')">
            <text class="plus-icon">🖼️</text>
            <text class="plus-label">相册</text>
          </view>
          <view class="plus-item" @click="chooseImage('camera')">
            <text class="plus-icon">📷</text>
            <text class="plus-label">拍摄</text>
          </view>
          <view class="plus-item" v-if="!isGroup" @click="startCall('audio')">
            <text class="plus-icon">📞</text>
            <text class="plus-label">语音通话</text>
          </view>
          <view class="plus-item" v-if="!isGroup" @click="startCall('video')">
            <text class="plus-icon">📹</text>
            <text class="plus-label">视频通话</text>
          </view>
          <view class="plus-item" @click="openChatInfo">
            <text class="plus-icon">💬</text>
            <text class="plus-label">聊天信息</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import store, { bus, markRead, updateLastMessage, startCall } from '../../store'
import { chatTime, needTimeSplit, imgStyle, voiceDuration } from '../../utils/format'
import { get, post, uploadImage, uploadFile, uploadBlob } from '../../utils/request'
import { BASE_URL } from '../../config'

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '😉', '😍', '🥰', '😘', '😜', '🤪', '🤨', '🧐', '🤓',
  '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😴',
  '👍', '👎', '👌', '✌️', '🤝', '🙏', '💪', '👏', '🙌', '👊',
  '❤️', '💔', '💯', '🔥', '🎉', '🎁', '🌹', '🍺', '☕', '🍉'
]

let localSeq = 0
function nextLocalId() {
  return 'x' + Date.now() + '_' + ++localSeq
}

export default {
  data() {
    return {
      convId: 0,
      isGroup: false,
      peerId: 0,
      peer: null,
      convName: '',
      messages: [],
      hasMore: false,
      loadingMore: false,
      input: '',
      panel: '',
      scrollInto: '',
      emojis: EMOJIS,
      // 语音相关
      voiceMode: false,
      recording: false,
      recordCancel: false,
      recordStartY: 0,
      recordStartTime: 0,
      recorderManager: null,
      recordFile: '',
      recordDuration: 0,
      playingId: 0,
      innerAudio: null,
      // H5 端 MediaRecorder 录音
      mediaRecorder: null,
      audioStream: null,
      audioChunks: [],
      audioBlob: null,
      audioMimeType: ''
    }
  },
  computed: {
    myId() {
      return (store.user && store.user.id) || 0
    }
  },
  onLoad(options) {
    this.convId = Number(options.id) || 0
    this.convName = decodeURIComponent(options.name || '')
    uni.setNavigationBarTitle({ title: this.convName })
    // #ifndef H5
    // 小程序端用 uni.RecorderManager
    this.recorderManager = uni.getRecorderManager()
    this.recorderManager.onStart(() => {
      this.recording = true
      this.recordStartTime = Date.now()
    })
    this.recorderManager.onStop((res) => {
      this.recording = false
      if (this.recordCancel) return
      this.recordFile = res.tempFilePath
      this.recordDuration = res.duration || (Date.now() - this.recordStartTime)
      this.sendVoice()
    })
    this.recorderManager.onError((err) => {
      this.recording = false
      uni.showToast({ title: '录音失败，请检查权限', icon: 'none' })
    })
    // #endif
  },
  async onShow() {
    if (!this.messages.length) {
      await this.loadMessages()
    }
    store.currentConversationId = this.convId
    markRead(this.convId)
  },
  onHide() {
    store.currentConversationId = 0
    this.stopVoice()
  },
  onUnload() {
    store.currentConversationId = 0
    bus.off('msg', this.onBusMsg)
    bus.off('recall', this.onBusRecall)
    this.stopVoice()
    // #ifdef H5
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop())
      this.audioStream = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    // #endif
  },
  mounted() {
    bus.on('msg', this.onBusMsg)
    bus.on('recall', this.onBusRecall)
  },
  methods: {
    chatTime,
    needTimeSplit,
    imgStyle,
    voiceDuration,
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },
    fullUrl(url) {
      if (!url) return ''
      return url.startsWith('http') ? url : BASE_URL + url
    },

    onInputFocus() {
      this.panel = ''
    },
    toggleVoiceMode() {
      this.voiceMode = !this.voiceMode
      this.panel = ''
    },

    onBusMsg(message) {
      if (message.conversation_id !== this.convId) return
      this.appendMessage({ ...message, localId: nextLocalId() })
      markRead(this.convId)
    },
    onBusRecall({ conversation_id, message_id }) {
      if (conversation_id !== this.convId) return
      const m = this.messages.find((x) => x.id === message_id)
      if (m) {
        m.recalled = true
        m.content = ''
      }
    },

    async loadMessages() {
      try {
        const res = await get(`/api/conversations/${this.convId}/messages`, { limit: 20 })
        const list = (res.messages || []).map((m) => ({ ...m, localId: nextLocalId() }))
        this.messages = list
        this.hasMore = !!res.has_more
        this.scrollToBottom()
        this.loadConvInfo()
      } catch (e) {
        // toast 已统一处理
      }
    },
    async loadConvInfo() {
      try {
        const res = await get(`/api/conversations/${this.convId}`)
        const conv = res.conversation
        this.isGroup = conv.type === 2
        if (conv.type === 1) {
          const peerMember = res.members.find((m) => m.id !== this.myId)
          this.peerId = (peerMember && peerMember.id) || 0
          this.peer = peerMember || null
        }
        const title = this.isGroup ? `${conv.name}(${conv.member_count})` : conv.name
        this.convName = conv.name
        uni.setNavigationBarTitle({ title })
      } catch (e) {
        uni.navigateBack({ fail: () => {} })
      }
    },
    async loadMore() {
      if (!this.hasMore || this.loadingMore || !this.messages.length) return
      this.loadingMore = true
      const firstId = this.messages[0].id
      try {
        const res = await get(`/api/conversations/${this.convId}/messages`, {
          before_id: firstId,
          limit: 20
        })
        const older = (res.messages || []).map((m) => ({ ...m, localId: nextLocalId() }))
        this.messages = older.concat(this.messages)
        this.hasMore = !!res.has_more
        this.$nextTick(() => {
          this.scrollInto = 'm' + this.messages.find((m) => m.id === firstId).localId
        })
      } catch (e) {
        // 忽略
      } finally {
        this.loadingMore = false
      }
    },

    appendMessage(m) {
      const exists = m.id && this.messages.some((x) => x.id === m.id)
      if (exists) return
      this.messages.push(m)
      this.scrollToBottom()
    },
    scrollToBottom() {
      this.scrollInto = ''
      this.$nextTick(() => {
        if (this.messages.length) {
          this.scrollInto = 'm' + this.messages[this.messages.length - 1].localId
        }
      })
    },

    togglePanel(p) {
      this.panel = this.panel === p ? '' : p
    },

    async sendText() {
      const text = this.input.trim()
      if (!text) return
      this.input = ''
      this.panel = ''
      const tmp = {
        localId: nextLocalId(),
        id: 0,
        sender_id: this.myId,
        type: 1,
        content: text,
        extra: '',
        recalled: false,
        created_at: new Date().toISOString(),
        sender: {
          id: this.myId,
          nickname: (store.user && store.user.nickname) || '',
          avatar: (store.user && store.user.avatar) || ''
        },
        sending: true
      }
      this.appendMessage(tmp)
      try {
        const res = await post(`/api/conversations/${this.convId}/messages`, { type: 1, content: text })
        this.replaceTmp(tmp.localId, res.message)
        updateLastMessage(this.convId, res.message)
      } catch (e) {
        this.removeTmp(tmp.localId)
      }
    },

    chooseImage(source) {
      this.panel = ''
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: [source],
        success: async (res) => {
          const filePath = res.tempFilePaths[0]
          try {
            const info = await new Promise((resolve, reject) => {
              uni.getImageInfo({ src: filePath, success: resolve, fail: reject })
            })
            const tmp = {
              localId: nextLocalId(),
              id: 0,
              sender_id: this.myId,
              type: 2,
              content: filePath,
              extra: JSON.stringify({ w: info.width, h: info.height }),
              recalled: false,
              created_at: new Date().toISOString(),
              sender: {
                id: this.myId,
                nickname: (store.user && store.user.nickname) || '',
                avatar: (store.user && store.user.avatar) || ''
              },
              sending: true
            }
            this.appendMessage(tmp)
            const url = await uploadImage(filePath)
            const resMsg = await post(`/api/conversations/${this.convId}/messages`, {
              type: 2,
              content: url,
              extra: JSON.stringify({ w: info.width, h: info.height })
            })
            this.replaceTmp(tmp.localId, resMsg.message)
            updateLastMessage(this.convId, resMsg.message)
          } catch (e) {
            // 失败时移除本地占位
          }
        }
      })
    },

    // ---------- 语音消息 ----------
    onRecordStart(e) {
      this.recordCancel = false
      const touch = e.touches[0]
      this.recordStartY = touch ? touch.clientY : 0
      // #ifdef H5
      this.startH5Recording()
      // #endif
      // #ifndef H5
      this.recorderManager.start({ duration: 60000, format: 'mp3' })
      // #endif
    },
    onRecordMove(e) {
      const touch = e.touches[0]
      if (!touch) return
      this.recordCancel = touch.clientY - this.recordStartY < -60
    },
    onRecordEnd() {
      if (!this.recording) return
      // #ifdef H5
      this.stopH5Recording()
      // #endif
      // #ifndef H5
      this.recorderManager.stop()
      // #endif
    },

    // #ifdef H5
    async startH5Recording() {
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.audioChunks = []
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        let mimeType = ''
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break }
        }
        this.audioMimeType = mimeType
        this.mediaRecorder = new MediaRecorder(this.audioStream, mimeType ? { mimeType } : {})
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) this.audioChunks.push(e.data)
        }
        this.mediaRecorder.onstop = () => {
          this.recording = false
          this.audioBlob = new Blob(this.audioChunks, { type: this.audioMimeType || 'audio/webm' })
          if (this.audioStream) {
            this.audioStream.getTracks().forEach((t) => t.stop())
            this.audioStream = null
          }
          if (this.recordCancel) return
          this.sendVoice()
        }
        this.mediaRecorder.start()
        this.recording = true
        this.recordStartTime = Date.now()
      } catch (e) {
        this.recording = false
        uni.showToast({ title: '无法访问麦克风，请检查权限', icon: 'none' })
      }
    },
    stopH5Recording() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
    },
    // #endif

    async sendVoice() {
      // #ifdef H5
      if (!this.audioBlob) return
      const duration = Date.now() - this.recordStartTime
      const blob = this.audioBlob
      const mimeType = this.audioMimeType
      this.audioBlob = null
      this.audioMimeType = ''
      if (duration < 500) {
        uni.showToast({ title: '录音太短', icon: 'none' })
        return
      }
      const ext = mimeType.includes('mp4') ? '.m4a' : mimeType.includes('ogg') ? '.ogg' : '.webm'
      const tmp = this.createVoiceTmp(duration)
      this.appendMessage(tmp)
      try {
        const res = await uploadBlob(blob, 'voice' + ext)
        const resMsg = await post(`/api/conversations/${this.convId}/messages`, {
          type: 3, content: res.url, extra: JSON.stringify({ duration })
        })
        this.replaceTmp(tmp.localId, resMsg.message)
        updateLastMessage(this.convId, resMsg.message)
      } catch (e) {
        this.removeTmp(tmp.localId)
      }
      // #endif
      // #ifndef H5
      if (!this.recordFile) return
      const duration = this.recordDuration
      const filePath = this.recordFile
      this.recordFile = ''
      this.recordDuration = 0
      if (duration < 500) {
        uni.showToast({ title: '录音太短', icon: 'none' })
        return
      }
      const tmp = this.createVoiceTmp(duration)
      this.appendMessage(tmp)
      try {
        const res = await uploadFile(filePath)
        const resMsg = await post(`/api/conversations/${this.convId}/messages`, {
          type: 3, content: res.url, extra: JSON.stringify({ duration })
        })
        this.replaceTmp(tmp.localId, resMsg.message)
        updateLastMessage(this.convId, resMsg.message)
      } catch (e) {
        this.removeTmp(tmp.localId)
      }
      // #endif
    },
    createVoiceTmp(duration) {
      return {
        localId: nextLocalId(),
        id: 0,
        sender_id: this.myId,
        type: 3,
        content: '',
        extra: JSON.stringify({ duration }),
        recalled: false,
        created_at: new Date().toISOString(),
        sender: {
          id: this.myId,
          nickname: (store.user && store.user.nickname) || '',
          avatar: (store.user && store.user.avatar) || ''
        },
        sending: true
      }
    },
    playVoice(m) {
      this.stopVoice()
      if (!this.innerAudio) {
        this.innerAudio = uni.createInnerAudioContext()
      }
      this.innerAudio.src = this.fullUrl(m.content)
      this.playingId = m.id
      this.innerAudio.onEnded(() => {
        this.playingId = 0
      })
      this.innerAudio.onError(() => {
        this.playingId = 0
        uni.showToast({ title: '语音播放失败', icon: 'none' })
      })
      this.innerAudio.play()
    },
    stopVoice() {
      if (this.innerAudio) {
        try { this.innerAudio.stop() } catch (e) {}
        this.innerAudio.destroy()
        this.innerAudio = null
      }
      this.playingId = 0
    },

    // ---------- 音视频通话 ----------
    startCall(mode) {
      this.panel = ''
      if (this.isGroup || !this.peer) {
        return uni.showToast({ title: '仅支持单聊通话', icon: 'none' })
      }
      startCall({ peer: this.peer, mode, conversationId: this.convId })
    },

    replaceTmp(localId, message) {
      const i = this.messages.findIndex((m) => m.localId === localId)
      if (i >= 0) {
        this.messages.splice(i, 1, { ...message, localId })
        this.scrollToBottom()
      }
    },
    removeTmp(localId) {
      const i = this.messages.findIndex((m) => m.localId === localId)
      if (i >= 0) this.messages.splice(i, 1)
    },

    onMsgPress(m, idx) {
      if (m.sending) return
      const items = []
      const actions = []
      if (m.type === 1) {
        items.push('复制')
        actions.push('copy')
      }
      if (m.sender_id === this.myId && (m.type === 1 || m.type === 2 || m.type === 3)) {
        items.push('撤回')
        actions.push('recall')
      }
      items.push('删除')
      actions.push('delete')
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          const act = actions[res.tapIndex]
          if (act === 'copy') {
            uni.setClipboardData({ data: m.content, fail: () => {} })
          } else if (act === 'recall') {
            try {
              await post(`/api/messages/${m.id}/recall`)
            } catch (e) {
              // toast 已统一处理
            }
          } else if (act === 'delete') {
            this.messages.splice(idx, 1)
          }
        }
      })
    },
    onAvatarPress() {},

    previewImg(m) {
      const urls = this.messages
        .filter((x) => x.type === 2 && !x.recalled)
        .map((x) => this.fullUrl(x.content))
      uni.previewImage({ current: this.fullUrl(m.content), urls })
    },

    openChatInfo() {
      this.panel = ''
      if (this.isGroup) {
        uni.navigateTo({ url: `/pages/group/info?id=${this.convId}` })
      } else if (this.peerId) {
        uni.navigateTo({ url: `/pages/contacts/detail?id=${this.peerId}&from_chat=1` })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}
.msg-list {
  flex: 1;
  overflow: hidden;
}
.load-tip {
  text-align: center;
  color: #bbbbbb;
  font-size: 22rpx;
  padding: 16rpx 0;
}
.msg-item {
  padding: 0 24rpx;
}
.time-row {
  text-align: center;
  padding: 20rpx 0 10rpx;
  text {
    font-size: 22rpx;
    color: #b2b2b2;
  }
}
.recall-row {
  text-align: center;
  padding: 12rpx 0;
  text {
    font-size: 24rpx;
    color: #b2b2b2;
  }
}
.msg-row {
  display: flex;
  padding: 16rpx 0;
  &.self {
    flex-direction: row-reverse;
    .bubble-wrap {
      align-items: flex-end;
    }
    .voice-content {
      flex-direction: row-reverse;
    }
  }
}
.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 10rpx;
  background: #e0e0e0;
  flex-shrink: 0;
}
.bubble-wrap {
  display: flex;
  flex-direction: column;
  margin: 0 20rpx;
  max-width: 70%;
  .self & {
    align-items: flex-end;
  }
}
.sender-name {
  font-size: 22rpx;
  color: #a5a5a5;
  margin-bottom: 6rpx;
}
.bubble {
  padding: 18rpx 22rpx;
  border-radius: 12rpx;
  position: relative;
  word-break: break-all;
}
.bubble-other {
  background: #ffffff;
  border-top-left-radius: 4rpx;
}
.bubble-self {
  background: $im-bubble-green;
  border-top-right-radius: 4rpx;
}
.voice-bubble {
  min-width: 120rpx;
  padding: 18rpx 26rpx;
}
.voice-content {
  display: flex;
  align-items: center;
}
.voice-icon {
  font-size: 36rpx;
  &.playing {
    animation: voice-pulse 0.8s infinite;
  }
}
.voice-dur {
  margin-left: 16rpx;
  font-size: 28rpx;
}
@keyframes voice-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.msg-text {
  font-size: 30rpx;
  line-height: 1.5;
}
.msg-img {
  display: block;
  border-radius: 8rpx;
}
.sending-tip {
  font-size: 20rpx;
  color: #c0c0c0;
  margin-top: 4rpx;
}
.bottom-space {
  height: 30rpx;
}

.input-bar {
  background: #f7f7f7;
  border-top: 1rpx solid #e0e0e0;
  padding-bottom: env(safe-area-inset-bottom);
  position: relative;
}
.input-row {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
}
.icon-btn {
  font-size: 44rpx;
  padding: 0 12rpx;
  color: #191919;
  &.plus {
    font-weight: 300;
    font-size: 48rpx;
  }
}
.text-input {
  flex: 1;
  background: #ffffff;
  border-radius: 10rpx;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 30rpx;
}
.hold-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  background: #ffffff;
  border-radius: 10rpx;
  font-size: 30rpx;
  color: #555555;
  &.recording {
    background: #d0d0d0;
  }
  &.cancel {
    background: #fa5151;
    color: #ffffff;
  }
}
.send-btn {
  margin-left: 16rpx;
  background: $im-green;
  color: #ffffff;
  font-size: 28rpx;
  line-height: 60rpx;
  height: 60rpx;
  padding: 0 26rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

/* 录音浮层 */
.record-mask {
  position: absolute;
  bottom: 130rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
}
.record-toast {
  width: 240rpx;
  height: 240rpx;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  &.cancel {
    background: rgba(250, 81, 81, 0.85);
  }
}
.record-anim {
  font-size: 72rpx;
}
.record-tip {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #ffffff;
}

.panel {
  border-top: 1rpx solid #ececec;
  background: #f7f7f7;
}
.emoji-panel {
  height: 400rpx;
  .emoji-scroll {
    height: 400rpx;
  }
  .emoji-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 20rpx;
  }
  .emoji-item {
    width: 12.5%;
    height: 90rpx;
    text-align: center;
    line-height: 90rpx;
    font-size: 44rpx;
  }
}
.plus-panel {
  height: 500rpx;
  .plus-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 30rpx 30rpx;
  }
  .plus-item {
    width: 25%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 36rpx;
  }
  .plus-icon {
    width: 110rpx;
    height: 110rpx;
    background: #ffffff;
    border-radius: 20rpx;
    text-align: center;
    line-height: 110rpx;
    font-size: 52rpx;
  }
  .plus-label {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #888888;
  }
}
</style>
