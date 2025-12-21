/**
 * The World - Audio Manager
 * @description Handles loading, caching, and playback of all ambient sounds and SFX
 *              based on AI commands, with non-persistent ambient logic.
 *              V2.1: Implements robust, gapless looping for ambient sounds and
 *              automatic fade-in/fade-out for all audio sources.
 */
import { Logger } from '../logger.js';

export class AudioManager {
    constructor({ $, win, state, config }) {
        this.$ = $;
        this.win = win;
        this.state = state;
        this.config = config;
        this.logger = Logger;

        this.audioCache = {};
        this.audioContext = null;
        this.masterGain = null;
        this.ambientGain = null;
        this.sfxGain = null;
        this.currentAmbientSound = null;
        this.isAudioUnlocked = false;
        this.activeSfxSources = []; // 跟踪正在播放的 SFX 音源
    }

    unlockAudio() {
        if (this.isAudioUnlocked && this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(e => this.logger.error('Failed to resume AudioContext:', e));
            }
            return;
        }
        if (this.isAudioUnlocked) return;

        this.isAudioUnlocked = true;
        this.logger.log('Audio unlocked by user interaction.');
        try {
            const AudioContext = this.win.AudioContext || this.win.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.ambientGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.ambientGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            this.logger.success('AudioContext created successfully.');
            this.setMasterEnabled(this.state.isAudioEnabled);
            this.setAmbientVolume(this.state.ambientVolume);
            this.setSfxVolume(this.state.sfxVolume);
        } catch (e) {
            this.logger.error('Failed to create AudioContext:', e);
            this.isAudioUnlocked = false;
        }
    }

    _getAudioContext() {
        return this.audioContext;
    }

    async _loadAudio(path) {
        let finalPath = path;
        if (!path.startsWith('assets/audio/')) {
            finalPath = `assets/audio/${path.replace(/^.*[\\\/]/, '')}`;
        }

        if (this.audioCache[finalPath]) return this.audioCache[finalPath];

        const audioCtx = this._getAudioContext();
        if (!audioCtx) {
            this.logger.error(`Cannot load audio, AudioContext not available.`);
            return null;
        }

        const scriptUrl = new URL(import.meta.url);
        const basePath = scriptUrl.pathname.substring(0, scriptUrl.pathname.lastIndexOf('/modules'));
        const fullUrl = `${this.win.location.origin}${basePath}/${finalPath}`;

        try {
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            this.audioCache[finalPath] = audioBuffer;
            return audioBuffer;
        } catch (error) {
            this.logger.error(`Failed to load audio from "${fullUrl}":`, error);
            return null;
        }
    }

    processMessage(messageText) {
        if (!messageText || !this.isAudioUnlocked) return;

        // 淡出所有正在播放的 SFX（无论新消息是否包含音效命令）
        if (this.activeSfxSources.length > 0) {
            this.logger.log('New message received, fading out previous SFX sounds.');
            this.fadeOutAllSfx({ fade_duration: 0.5 });
        }

        // 处理环境音
        if (!messageText.includes('[FX.PlayAmbient')) {
            if (this.currentAmbientSound) {
                this.logger.log('New message lacks PlayAmbient command, stopping current ambient sound.');
                this.stopAmbient({});
            }
        }
    }

    /**
     * 淡出并停止所有正在播放的 SFX 音效
     * @param {Object} options - 配置选项
     * @param {number} options.fade_duration - 淡出持续时间（秒），默认 0.5
     */
    fadeOutAllSfx({ fade_duration = 0.5 } = {}) {
        const audioCtx = this._getAudioContext();
        if (!audioCtx || this.activeSfxSources.length === 0) return;

        const now = audioCtx.currentTime;
        const stopTime = now + fade_duration;

        // 复制数组，因为我们会在回调中修改它
        const sourcesToStop = [...this.activeSfxSources];
        this.activeSfxSources = []; // 立即清空，防止重复处理

        sourcesToStop.forEach(sfxItem => {
            if (sfxItem.isStopping) return; // 已经在停止中
            sfxItem.isStopping = true;

            try {
                // 取消已计划的音量变化，然后线性淡出到 0
                sfxItem.gainNode.gain.cancelScheduledValues(now);
                sfxItem.gainNode.gain.setValueAtTime(sfxItem.gainNode.gain.value, now);
                sfxItem.gainNode.gain.linearRampToValueAtTime(0, stopTime);

                // 在淡出完成后停止音源
                sfxItem.source.stop(stopTime);
            } catch (e) {
                // 音源可能已经停止，忽略错误
            }

            // 延迟断开连接以确保淡出完成
            setTimeout(() => {
                try {
                    sfxItem.gainNode.disconnect();
                    if (sfxItem.panner) sfxItem.panner.disconnect();
                } catch (e) { }
            }, fade_duration * 1000 + 100);
        });

        this.logger.log(`[Audio] Fading out ${sourcesToStop.length} SFX sounds.`);
    }

    _ambientLoopScheduler() {
        if (!this.currentAmbientSound || this.currentAmbientSound.isStopping) return;

        const audioCtx = this._getAudioContext();
        const sound = this.currentAmbientSound;
        const now = audioCtx.currentTime;
        const lookaheadSeconds = 2.0;

        while (sound.nextSourceStartTime < now + lookaheadSeconds) {
            const source = audioCtx.createBufferSource();
            source.buffer = sound.buffer;
            source.connect(sound.gainNode);
            source.start(sound.nextSourceStartTime);

            sound.sources.push(source);
            sound.nextSourceStartTime += sound.buffer.duration;
        }

        sound.loopTimeoutId = setTimeout(() => this._ambientLoopScheduler(), 500);
    }

    async playAmbient({ path, volume = 1.0, fade_duration = 2 }) {
        const audioCtx = this._getAudioContext();
        if (!audioCtx) return;

        if (this.currentAmbientSound && this.currentAmbientSound.path === path) {
            this.currentAmbientSound.gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + fade_duration);
            return;
        }

        if (this.currentAmbientSound) {
            this.stopAmbient({ fade_duration });
        }

        const buffer = await this._loadAudio(path);
        if (!buffer) return;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.connect(this.ambientGain);
        gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + fade_duration);

        this.currentAmbientSound = {
            path,
            buffer,
            gainNode,
            sources: [],
            isStopping: false,
            nextSourceStartTime: audioCtx.currentTime,
            loopTimeoutId: null
        };

        this._ambientLoopScheduler();
        this.logger.log(`[Audio] Playing ambient: ${path}`);
    }

    stopAmbient({ fade_duration = 2 }) {
        const audioCtx = this._getAudioContext();
        if (!this.currentAmbientSound || !audioCtx) return;

        const ambientToStop = this.currentAmbientSound;
        this.currentAmbientSound = null;

        this.logger.log(`[Audio] Stopping ambient: ${ambientToStop.path}`);
        ambientToStop.isStopping = true;
        clearTimeout(ambientToStop.loopTimeoutId);

        const stopTime = audioCtx.currentTime + fade_duration;
        ambientToStop.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        ambientToStop.gainNode.gain.setValueAtTime(ambientToStop.gainNode.gain.value, audioCtx.currentTime);
        ambientToStop.gainNode.gain.linearRampToValueAtTime(0, stopTime);

        ambientToStop.sources.forEach(source => {
            try { source.stop(stopTime); } catch (e) { }
        });

        setTimeout(() => {
            ambientToStop.gainNode.disconnect();
        }, fade_duration * 1000 + 200);
    }

    async playSoundQueue(queue) {
        const audioCtx = this._getAudioContext();
        if (!audioCtx || !Array.isArray(queue) || queue.length === 0) return;

        // 用于跟踪当前队列是否被取消
        let isCancelled = false;
        const queueId = Date.now();

        const playNextSound = async (index) => {
            if (isCancelled || index >= queue.length) return;

            const sound = queue[index];
            if (!sound.path) {
                playNextSound(index + 1);
                return;
            }

            const buffer = await this._loadAudio(sound.path);
            if (!buffer || isCancelled) {
                playNextSound(index + 1);
                return;
            }

            const source = audioCtx.createBufferSource();
            const panner = audioCtx.createStereoPanner();
            const gainNode = audioCtx.createGain();

            source.buffer = buffer;
            panner.pan.value = sound.pan || 0;

            const targetVolume = sound.volume !== undefined ? sound.volume : 1.0;
            const now = audioCtx.currentTime;
            const soundDuration = buffer.duration;
            const fadeInDuration = Math.min(0.1, soundDuration / 2);
            const fadeOutDuration = Math.min(0.2, soundDuration / 2);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(targetVolume, now + fadeInDuration);

            if (soundDuration > fadeInDuration + fadeOutDuration) {
                gainNode.gain.setValueAtTime(targetVolume, now + soundDuration - fadeOutDuration);
            }
            gainNode.gain.linearRampToValueAtTime(0, now + soundDuration);

            source.connect(panner).connect(gainNode).connect(this.sfxGain);
            source.start(now);
            this.logger.log(`[Audio] Playing SFX: "${sound.path}" with automatic fades.`);

            // 创建 SFX 跟踪对象
            const sfxItem = {
                source,
                gainNode,
                panner,
                queueId,
                isStopping: false
            };

            // 添加到活跃音源列表
            this.activeSfxSources.push(sfxItem);

            source.onended = () => {
                // 从活跃列表中移除
                const idx = this.activeSfxSources.indexOf(sfxItem);
                if (idx !== -1) {
                    this.activeSfxSources.splice(idx, 1);
                }
                try {
                    gainNode.disconnect();
                    panner.disconnect();
                } catch (e) { }
            };

            const durationMs = buffer.duration * 1000;
            const nextDelayMs = (sound.delay || 0) * 1000;
            const totalWait = durationMs + nextDelayMs;

            setTimeout(() => {
                if (!isCancelled) {
                    playNextSound(index + 1);
                }
            }, totalWait);
        };

        playNextSound(0);
    }

    setMasterEnabled(isEnabled) {
        const audioCtx = this._getAudioContext();
        if (this.masterGain && audioCtx) {
            this.masterGain.gain.linearRampToValueAtTime(isEnabled ? 1 : 0, audioCtx.currentTime + 0.1);
        }
    }

    setAmbientVolume(volume) {
        const audioCtx = this._getAudioContext();
        if (this.ambientGain && audioCtx) {
            this.ambientGain.gain.linearRampToValueAtTime(parseFloat(volume), audioCtx.currentTime + 0.1);
        }
    }

    setSfxVolume(volume) {
        const audioCtx = this._getAudioContext();
        if (this.sfxGain && audioCtx) {
            this.sfxGain.gain.linearRampToValueAtTime(parseFloat(volume), audioCtx.currentTime + 0.1);
        }
    }
}
