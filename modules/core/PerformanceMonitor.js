/**
 * The World - PerformanceMonitor
 * @description 监控帧率并在检测到性能问题时自动调整粒子密度
 */
export class PerformanceMonitor {
    constructor({ state, logger, dataManager }) {
        this.state = state;
        this.logger = logger;
        this.dataManager = dataManager;

        this.lastFrameTime = performance.now();
        this.lowFpsCount = 0;
        this.frameCount = 0;
        this.isRunning = false;
        this.rafId = null;

        // 配置
        this.FPS_THRESHOLD = 25; // 低于此帧率视为掉帧
        this.LOW_FPS_TRIGGER = 15; // 连续多少帧低帧率后触发调整
        this.DENSITY_REDUCTION = 10; // 每次降低的密度百分比
        this.MIN_DENSITY = 20; // 最低粒子密度
        this.CHECK_INTERVAL = 60; // 每隔多少帧检查一次
    }

    start() {
        if (this.isRunning || !this.state.isAutoPerformanceEnabled) return;

        this.isRunning = true;
        this.logger.log('[PerformanceMonitor] 已启动性能监控');
        this._loop();
    }

    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.logger.log('[PerformanceMonitor] 已停止性能监控');
    }

    _loop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // 计算当前帧率
        const fps = 1000 / deltaTime;
        this.frameCount++;

        // 每隔一定帧数检查一次
        if (this.frameCount % this.CHECK_INTERVAL === 0) {
            this._checkPerformance(fps);
        }

        this.rafId = requestAnimationFrame(() => this._loop());
    }

    _checkPerformance(fps) {
        // 如果自动调节被禁用，跳过检查
        if (!this.state.isAutoPerformanceEnabled) {
            this.stop();
            return;
        }

        if (fps < this.FPS_THRESHOLD) {
            this.lowFpsCount++;
            this.logger.log(`[PerformanceMonitor] 低帧率检测: ${fps.toFixed(1)} FPS (计数: ${this.lowFpsCount})`);
        } else {
            // 帧率恢复正常，逐渐重置计数
            this.lowFpsCount = Math.max(0, this.lowFpsCount - 1);
        }

        // 触发密度调整
        if (this.lowFpsCount >= this.LOW_FPS_TRIGGER) {
            this._reduceDensity();
            this.lowFpsCount = 0; // 重置计数
        }
    }

    _reduceDensity() {
        const currentDensity = this.state.particleDensity;
        const newDensity = Math.max(this.MIN_DENSITY, currentDensity - this.DENSITY_REDUCTION);

        if (newDensity < currentDensity) {
            this.state.particleDensity = newDensity;
            this.dataManager.saveState();
            this.logger.warn(`[PerformanceMonitor] 检测到性能问题，粒子密度已自动降低: ${currentDensity}% → ${newDensity}%`);

            // 触发 UI 更新（如果滑块可见）
            const $slider = document.getElementById('particle-density-slider');
            const $value = document.getElementById('particle-density-value');
            if ($slider) $slider.value = newDensity;
            if ($value) $value.textContent = `${newDensity}%`;
        }
    }

    // 外部调用：检查是否应该启动监控
    checkAndStart() {
        if (this.state.isAutoPerformanceEnabled && !this.isRunning) {
            this.start();
        } else if (!this.state.isAutoPerformanceEnabled && this.isRunning) {
            this.stop();
        }
    }
}
