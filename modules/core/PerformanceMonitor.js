/**
 * The World - PerformanceMonitor
 * @description 监控帧率并在检测到性能问题时自动调整粒子密度
 */
export class PerformanceMonitor {
    constructor({ state, logger, dataManager, toastr }) {
        this.state = state;
        this.logger = logger;
        this.dataManager = dataManager;
        this.toastr = toastr;

        this.lowFpsCount = 0;
        this.isRunning = false;
        this.samplingIntervalId = null;

        // 配置
        this.FPS_THRESHOLD = 25; // 低于此帧率视为掉帧
        this.LOW_FPS_TRIGGER = 5; // 连续多少次低帧率后触发调整 (每次间隔3秒)
        this.DENSITY_REDUCTION = 10; // 每次降低的密度百分比
        this.MIN_DENSITY = 20; // 最低粒子密度
    }

    start() {
        if (this.isRunning || !this.state.isAutoPerformanceEnabled) return;

        this.isRunning = true;
        this.logger.log('[PerformanceMonitor] 已启动性能监控');
        this._startSampling();
    }

    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.samplingIntervalId) {
            clearInterval(this.samplingIntervalId);
            this.samplingIntervalId = null;
        }
        this.logger.log('[PerformanceMonitor] 已停止性能监控');
    }

    /**
     * 每 3 秒采样一次帧率，而非持续运行 rAF 循环。
     * 每次采样仅请求一个 rAF 来测量帧间隔时间。
     */
    _startSampling() {
        this.samplingIntervalId = setInterval(() => {
            if (!this.isRunning) return;
            const t0 = performance.now();
            requestAnimationFrame(() => {
                const fps = 1000 / (performance.now() - t0);
                this._checkPerformance(fps);
            });
        }, 3000);
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

            // 显示通知
            if (this.toastr) {
                this.toastr.warning(`检测到帧率过低，已自动降低粒子密度至 ${newDensity}%`, '性能优化');
            }

            // 触发 UI 更新（如果滑块可见）
            const $slider = document.getElementById('particle-density-slider');
            const $value = document.getElementById('particle-density-value');
            if ($slider) {
                $slider.value = newDensity;
            }
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
