/**
 * The World - Global Theme Manager
 * @description Manages the lifecycle and rendering of the global dynamic background.
 */
export class GlobalThemeManager {
    constructor({ $, win, state, config, logger, injectionEngine, timeGradient }) {
        this.$ = $;
        this.win = win;
        this.state = state;
        this.config = config;
        this.logger = logger;
        this.injectionEngine = injectionEngine;

        this.timeGradient = timeGradient; // Use shared instance
        this.isActive = false;
        this.bgLayer1 = null;
        this.bgLayer2 = null;
        this.activeLayer = 1;
        this.currentBackground = null;
        this.currentBrightness = null; // New: track brightness

        // 插图背景状态
        this.currentIllustrationUrl = null;
        this.isIllustrationActive = false;
        this.illustrationLayer = null;
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
        this.logger.success('全局主题引擎已激活！');
        // Defer the first update slightly to ensure body class is set
        setTimeout(() => this.updateTheme(), 50);
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        this.logger.warn('全局主题引擎已停用。正在移除背景和样式...');
        this._removeBgLayers();
        this.injectionEngine.removeCss(this.config.GLOBAL_THEME_STYLE_ID);
    }

    updateTheme() {
        if (!this.isActive) return;

        // NEW: Check for mobile view and deactivate if necessary
        if (this.$('body').hasClass('tw-is-mobile-view')) {
            this.logger.log('[全局主题] 检测到移动端视图，暂时禁用背景。');
            this._removeBgLayers();
            this.injectionEngine.removeCss(this.config.GLOBAL_THEME_STYLE_ID);
            return;
        }

        this.logger.log('正在更新全局主题...');

        const data = this.state.latestWorldStateData || {};
        const timeString = data['时间'] || '12:00';
        const weatherString = data['天气'] || '晴';
        const periodString = data['时段']; // Pass period string if available
        const theme = this.timeGradient.getThemeForTime({ timeString, weatherString, periodString });

        this._updateBackground(theme.background, theme.brightness);
        this._applyThemeStyles();
    }

    _ensureBgLayers() {
        if (!this.bgLayer1 || !this.win.document.body.contains(this.bgLayer1)) {
            const $body = this.$('body');
            const $container = this.$('<div>').addClass('tw-global-theme-container').css({
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -10, pointerEvents: 'none'
            });
            this.bgLayer1 = this.$('<div>').addClass('tw-global-bg-layer').css('opacity', '1').get(0);
            this.bgLayer2 = this.$('<div>').addClass('tw-global-bg-layer').css('opacity', '0').get(0);
            $container.append(this.bgLayer1, this.bgLayer2);
            $body.prepend($container);
        }
    }

    _removeBgLayers() {
        this.$('.tw-global-theme-container').remove();
        this.bgLayer1 = null;
        this.bgLayer2 = null;
        this.currentBackground = null;
    }

    _updateBackground(newBackground, newBrightness) {
        this._ensureBgLayers();

        if (newBackground === this.currentBackground) {
            return;
        }

        // --- Dark-to-Dark Fast Path ---
        if (this.currentBrightness === 'dark' && newBrightness === 'dark') {
            this.logger.log('[Global Theme] Executing dark-to-dark fast path.');
            this.currentBackground = newBackground;
            this.currentBrightness = newBrightness;

            // Immediately apply to both layers to prevent any flash
            this.bgLayer1.style.transition = 'none';
            this.bgLayer2.style.transition = 'none';

            if (this.activeLayer === 1) {
                this.bgLayer1.style.background = newBackground;
            } else {
                this.bgLayer2.style.background = newBackground;
            }

            // Use a timeout to re-enable transitions after the immediate paint
            setTimeout(() => {
                if (this.bgLayer1) this.bgLayer1.style.transition = 'opacity 9s ease-in-out';
                if (this.bgLayer2) this.bgLayer2.style.transition = 'opacity 9s ease-in-out';
            }, 50);
            return;
        }

        // --- Standard Cross-Fade Path ---
        this.currentBackground = newBackground;
        this.currentBrightness = newBrightness;

        requestAnimationFrame(() => {
            if (!this.bgLayer1 || !this.bgLayer2) return; // Guard against layers being removed

            if (this.activeLayer === 1) {
                this.bgLayer2.style.background = newBackground;
                this.bgLayer1.style.opacity = 0;
                this.bgLayer2.style.opacity = 1;
                this.activeLayer = 2;
            } else {
                this.bgLayer1.style.background = newBackground;
                this.bgLayer2.style.opacity = 0;
                this.bgLayer1.style.opacity = 1;
                this.activeLayer = 1;
            }
        });
    }

    _applyThemeStyles() {
        let css = `
            .tw-global-bg-layer {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                transition: opacity 9s ease-in-out;
                background-size: 200% 200%;
                animation: bg-pan 45s linear infinite alternate;
            }
            @keyframes bg-pan {
                0% { background-position: 0% 0%; }
                100% { background-position: 100% 100%; }
            }
        `;

        if (this.state.isImmersiveModeEnabled) {
            css += `
                body { background: transparent !important; }
                #chat { background: transparent !important; }
                #chat_background { background: transparent !important; }
                .mes_content { 
                    background-color: rgba(20, 22, 28, 0.6) !important;
                    backdrop-filter: blur(4px);
                }
                :root { --SmartThemeBodyColor: #f0f0f0 !important; }
            `;
        } else {
            css += `
                body { background: revert !important; }
             `;
        }

        this.injectionEngine.injectCss(this.config.GLOBAL_THEME_STYLE_ID, css);
    }

    // ==================== 插图背景功能 ====================

    /**
     * 设置插图为全局背景
     * @param {string} imageUrl - 完整的图片 URL
     */
    setIllustrationBackground(imageUrl) {
        if (!imageUrl || imageUrl === this.currentIllustrationUrl) {
            return;
        }

        this.logger.log(`[插图背景] 正在加载: ${imageUrl}`);

        // 预加载图片以检测质量和处理错误
        const img = new Image();
        img.onload = () => {
            this.currentIllustrationUrl = imageUrl;
            this.isIllustrationActive = true;

            const shouldBlur = this._checkImageQuality(img);
            this._applyIllustrationBackground(imageUrl, shouldBlur);

            this.logger.success(`[插图背景] 已应用${shouldBlur ? ' (模糊)' : ''}: ${imageUrl}`);
        };

        img.onerror = () => {
            this.logger.warn(`[插图背景] 加载失败: ${imageUrl}，回退到天色背景`);
            this.clearIllustrationBackground();
        };

        img.src = imageUrl;
    }

    /**
     * 清除插图背景，回退到天色渐变
     */
    clearIllustrationBackground() {
        if (!this.isIllustrationActive) return;

        this.currentIllustrationUrl = null;
        this.isIllustrationActive = false;

        // 淡出插图层
        if (this.illustrationLayer) {
            this.$(this.illustrationLayer).css('opacity', '0');
        }

        // 如果天色主题开启，恢复天色背景
        if (this.isActive) {
            this.updateTheme();
        }

        this.logger.log('[插图背景] 已清除，回退天色背景');
    }

    /**
     * 应用插图背景到界面
     */
    _applyIllustrationBackground(imageUrl, shouldBlur) {
        this._ensureIllustrationLayer();

        const $layer = this.$(this.illustrationLayer);

        // 设置背景图片
        $layer.css({
            'background-image': `url("${imageUrl}")`,
            'background-size': 'cover',
            'background-position': 'center',
            'filter': shouldBlur ? 'blur(12px)' : 'none',
            'transform': shouldBlur ? 'scale(1.1)' : 'none'
        });

        // 淡入效果
        requestAnimationFrame(() => {
            $layer.css('opacity', '1');
        });
    }

    /**
     * 确保插图背景层存在
     */
    _ensureIllustrationLayer() {
        if (!this.illustrationLayer || !this.win.document.body.contains(this.illustrationLayer)) {
            this._ensureBgLayers(); // 确保容器存在

            const $container = this.$('.tw-global-theme-container');
            if ($container.length) {
                const $layer = this.$('<div>').addClass('tw-illustration-layer').css({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    transition: 'opacity 0.5s ease-in-out',
                    zIndex: 1 // 在渐变层之上
                });
                $container.append($layer);
                this.illustrationLayer = $layer.get(0);
            }
        }
    }

    /**
     * 检查图片质量，决定是否应用模糊
     * @returns {boolean} 是否需要模糊
     */
    _checkImageQuality(img) {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / height;

        // 竖屏图 (aspectRatio < 1.0) 或 小尺寸图 (width < 800) 需要模糊
        const isPortrait = aspectRatio < 1.0;
        const isSmall = width < 800;

        if (isPortrait || isSmall) {
            this.logger.log(`[插图背景] 图片质量检测: ${width}x${height}, AR=${aspectRatio.toFixed(2)} → 应用模糊`);
            return true;
        }

        return false;
    }
}