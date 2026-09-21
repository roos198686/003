<template>
  <view class="call-page" :class="{ 'video-mode': isVideo }">
    <!-- 视频通话：远端全屏 -->
    <view v-if="isVideo" ref="remoteContainer" class="remote-container"></view>

    <!-- 语音通话：居中头像 -->
    <view v-else class="audio-center">
      <image class="peer-avatar" :src="avatarUrl(peer && peer.avatar)" mode="aspectFill" />
      <text class="peer-name">{{ (peer && peer.nickname) || '未知用户' }}</text>
      <text class="call-status">{{ statusText }}</text>
      <text v-if="!supported" class="call-tip">音视频通话目前仅支持 H5 端</text>
    </view>

    <!-- 视频模式：本地小窗 + 状态浮层 -->
    <template v-if="isVideo">
      <view ref="localContainer" class="local-container"></view>
      <view class="video-overlay">
        <text class="peer-name">{{ (peer && peer.nickname) || '未知用户' }}</text>
        <text class="call-status">{{ statusText }}</text>
      </view>
    </template>

    <!-- 控制按钮 -->
    <view class="controls">
      <view class="ctrl-btn" @click="toggleMute" v-if="supported">
        <text class="ctrl-icon">{{ muted ? '🔇' : '🎤' }}</text>
        <text class="ctrl-label">{{ muted ? '取消静音' : '静音' }}</text>
      </view>
      <view class="ctrl-btn" @click="hangup">
        <view class="hangup-btn">
          <text class="ctrl-icon">📞</text>
        </view>
        <text class="ctrl-label">挂断</text>
      </view>
      <view class="ctrl-btn" @click="toggleCamera" v-if="isVideo && supported">
        <text class="ctrl-icon">{{ cameraOff ? '📷' : '📹' }}</text>
        <text class="ctrl-label">{{ cameraOff ? '开启' : '关闭' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import store, { bus, hangupCall, sendCallSignal } from '../../store'
import { BASE_URL } from '../../config'

export default {
  data() {
    return {
      callId: '',
      mode: 'audio',
      peer: {},
      isCaller: false,
      statusText: '',
      muted: false,
      cameraOff: false,
      pc: null,
      localStream: null,
      remoteVideoEl: null,
      localVideoEl: null,
      pcReady: null,
      timer: null,
      callSeconds: 0,
      supported: true
    }
  },
  computed: {
    isVideo() {
      return this.mode === 'video'
    }
  },
  onLoad(options) {
    this.callId = options.id
    this.mode = options.mode || 'audio'
    this.peer = JSON.parse(decodeURIComponent(options.peer || '{}'))
    this.isCaller = options.caller === '1'
    this.statusText = this.isCaller ? '正在等待对方接听...' : '正在连接...'

    // 仅 H5 端支持 WebRTC
    // #ifndef H5
    this.supported = false
    this.statusText = '音视频通话仅支持 H5 端'
    // #endif
  },
  mounted() {
    bus.on('call_accept', this.onPeerAccept)
    bus.on('call_reject', this.onPeerReject)
    bus.on('call_offer', this.onPeerOffer)
    bus.on('call_answer', this.onPeerAnswer)
    bus.on('call_ice', this.onPeerIce)
    bus.on('call_close', this.onPeerClose)

    // #ifdef H5
    this.setupVideoElements()
    this.init()
    // #endif
  },
  onUnload() {
    this.cleanup()
    bus.off('call_accept', this.onPeerAccept)
    bus.off('call_reject', this.onPeerReject)
    bus.off('call_offer', this.onPeerOffer)
    bus.off('call_answer', this.onPeerAnswer)
    bus.off('call_ice', this.onPeerIce)
    bus.off('call_close', this.onPeerClose)
  },
  methods: {
    avatarUrl(url) {
      if (url) return url.startsWith('http') ? url : BASE_URL + url
      return '/static/avatar.png'
    },

    // #ifdef H5
    setupVideoElements() {
      // 远端媒体元素
      this.remoteVideoEl = document.createElement('video')
      this.remoteVideoEl.autoplay = true
      this.remoteVideoEl.playsInline = true
      this.remoteVideoEl.className = 'media-el remote-el'
      const remoteEl = this.$refs.remoteContainer?.$el || this.$refs.remoteContainer
      if (remoteEl) remoteEl.appendChild(this.remoteVideoEl)

      if (this.isVideo) {
        this.localVideoEl = document.createElement('video')
        this.localVideoEl.autoplay = true
        this.localVideoEl.playsInline = true
        this.localVideoEl.muted = true
        this.localVideoEl.className = 'media-el local-el'
        const localEl = this.$refs.localContainer?.$el || this.$refs.localContainer
        if (localEl) localEl.appendChild(this.localVideoEl)
      }
    },

    async init() {
      this.pcReady = new Promise((resolve) => { this._markReady = resolve })
      try {
        this.createPC()
        await this.getLocalStream()
        this._markReady()
        // 被叫可能在 init 完成前就收到 offer，pcReady 会保证按序处理
      } catch (e) {
        console.error('[call] init failed', e)
        uni.showToast({ title: '无法访问麦克风/摄像头，请检查权限', icon: 'none' })
        setTimeout(() => this.hangup(), 1200)
      }
    },

    createPC() {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendCallSignal('ice', { candidate: e.candidate })
        }
      }
      pc.ontrack = (e) => {
        if (this.remoteVideoEl) {
          this.remoteVideoEl.srcObject = e.streams[0]
        }
        this.statusText = '通话中'
        this.startTimer()
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          if (!this.timer) {
            this.statusText = '通话中'
            this.startTimer()
          }
        } else if (pc.connectionState === 'disconnected') {
          this.statusText = '连接中断...'
        } else if (pc.connectionState === 'failed') {
          uni.showToast({ title: '连接失败', icon: 'none' })
          this.hangup()
        }
      }
      this.pc = pc
    },

    async getLocalStream() {
      const constraints = {
        audio: true,
        video: this.isVideo ? { facingMode: 'user' } : false
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.localStream = stream
      stream.getTracks().forEach((track) => {
        this.pc.addTrack(track, stream)
      })
      if (this.isVideo && this.localVideoEl) {
        this.localVideoEl.srcObject = stream
      }
    },

    async onPeerAccept() {
      this.statusText = '正在建立连接...'
      await this.pcReady
      try {
        const offer = await this.pc.createOffer()
        await this.pc.setLocalDescription(offer)
        sendCallSignal('offer', { sdp: offer })
      } catch (e) {
        console.error('[call] createOffer failed', e)
        this.hangup()
      }
    },

    async onPeerOffer(res) {
      await this.pcReady
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(res.sdp))
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        sendCallSignal('answer', { sdp: answer })
        this.statusText = '正在建立连接...'
      } catch (e) {
        console.error('[call] createAnswer failed', e)
        this.hangup()
      }
    },

    async onPeerAnswer(res) {
      await this.pcReady
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(res.sdp))
      } catch (e) {
        console.error('[call] setRemoteDescription failed', e)
      }
    },

    async onPeerIce(res) {
      await this.pcReady
      if (res.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(res.candidate))
        } catch (e) {
          // 忽略 ICE 候选添加失败
        }
      }
    },
    // #endif

    onPeerReject() {
      uni.showToast({ title: '对方拒绝了通话', icon: 'none' })
      setTimeout(() => this.back(), 800)
    },
    onPeerClose() {
      this.back()
    },

    startTimer() {
      if (this.timer) return
      this.callSeconds = 0
      this.timer = setInterval(() => {
        this.callSeconds++
        const m = String(Math.floor(this.callSeconds / 60)).padStart(2, '0')
        const s = String(this.callSeconds % 60).padStart(2, '0')
        this.statusText = `通话中 ${m}:${s}`
      }, 1000)
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    toggleMute() {
      // #ifdef H5
      if (!this.localStream) return
      this.muted = !this.muted
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.muted))
      // #endif
    },
    toggleCamera() {
      // #ifdef H5
      if (!this.localStream) return
      this.cameraOff = !this.cameraOff
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.cameraOff))
      // #endif
    },

    hangup() {
      hangupCall()
      this.back()
    },
    back() {
      this.cleanup()
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/chat/list' }) })
    },
    cleanup() {
      this.stopTimer()
      // #ifdef H5
      if (this.pc) {
        try { this.pc.close() } catch (e) {}
        this.pc = null
      }
      if (this.localStream) {
        this.localStream.getTracks().forEach((t) => t.stop())
        this.localStream = null
      }
      // #endif
    }
  }
}
</script>

<style lang="scss" scoped>
.call-page {
  position: fixed;
  inset: 0;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1000;
}
.video-mode {
  background: #000000;
}
.remote-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.audio-center {
  margin-top: 280rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.peer-avatar {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: #333333;
}
.peer-name {
  margin-top: 40rpx;
  font-size: 40rpx;
  color: #ffffff;
}
.call-status {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #aaaaaa;
}
.call-tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #666666;
}
.local-container {
  position: absolute;
  top: 100rpx;
  right: 30rpx;
  width: 200rpx;
  height: 300rpx;
  border-radius: 16rpx;
  overflow: hidden;
  z-index: 10;
  background: #333333;
}
.video-overlay {
  position: absolute;
  top: 80rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  pointer-events: none;
  .peer-name {
    text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.6);
  }
  .call-status {
    text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.6);
  }
}
.controls {
  position: absolute;
  bottom: 120rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 60rpx;
  z-index: 20;
}
.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ctrl-icon {
  font-size: 56rpx;
}
.ctrl-label {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #ffffff;
}
.hangup-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #fa5151;
  display: flex;
  align-items: center;
  justify-content: center;
  .ctrl-icon {
    transform: rotate(135deg);
    font-size: 60rpx;
  }
}
</style>

<style>
/* 全局样式：动态创建的 video 元素 */
.call-page .media-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.call-page .remote-el {
  position: absolute;
  inset: 0;
}
.call-page .local-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
</style>
