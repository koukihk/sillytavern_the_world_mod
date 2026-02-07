/**
 * The World - Weather System
 * @description Manages all weather and atmospheric effects.
 */
import { SakuraFX } from './effects/sakura.js';
import { RainyDay } from './effects/rainydrops.js';
import { Clouds3dFX } from './effects/complex/clouds_3d.js';
import { VaporTrailFX } from './effects/vapor_trail.js';
import { FireworksFX } from './effects/fireworks.js';
import { HolidayDetector } from '../core/HolidayDetector.js';

export class WeatherSystem {
    constructor({ $, state, config, logger, injectionEngine, timeGradient }) {
        this.$ = $;
        this.state = state;
        this.config = config;
        this.logger = logger;

        this.dependencies = { $, state, config, logger, injectionEngine, timeGradient };

        this.sakuraInstance = null;
        this.lastWeatherString = ''; // Add state to track last weather
        this.rainyDayInstance = null;
        this.clouds3dInstance = new Clouds3dFX({ $, config, logger, state });
        this.vaporTrailInstance = null;
        this.fireworksInstance = null;
        this.lightningLoopTimeout = null;
        this.globalLightningLoopTimeout = null;
        this.weatherEffects = {
            current: { type: null, variant: null, density: 0 },
            intervalId: null,
            particleClass: ''
        };
        this.milkyWayTimeout = null;
        this.holidayDetector = new HolidayDetector();
    }


    updateEffects(weatherString, periodString, seasonString, $panel, $toggleBtn) {
        const safeWeatherString = weatherString || '';
        const safePeriodString = periodString || '';
        const safeSeasonString = seasonString || '';

        this.logger.log('[天气系统] 正在更新天气效果...', { weather: safeWeatherString, period: safePeriodString, season: safeSeasonString });

        const $localFxContainer = $panel.find('.tw-fx-container-local');
        const $globalFgFxLayer = this.$(`#${this.config.FX_LAYER_ID}`);
        const $globalBgFxLayer = this.$(`#${this.config.FX_LAYER_BG_ID}`);

        const $fgFxTarget = this.state.isFxGlobal ? $globalFgFxLayer : $localFxContainer;
        const $bgFxTarget = this.state.isFxGlobal ? $globalBgFxLayer : $localFxContainer;

        const density = this.getWeatherDensity(safeWeatherString);
        const isRaining = safeWeatherString.includes('雨') && !safeWeatherString.includes('雪');
        const isSnowing = safeWeatherString.includes('雪');
        const isWindy = density.wind > 0;
        const isFoggy = safeWeatherString.includes('雾');
        const hasMeteors = safePeriodString.includes('夜') && safeWeatherString.includes('流星');
        const shouldShowSakura = safeWeatherString.includes('樱');
        const wasSakura = this.lastWeatherString.includes('樱');
        const shouldShowFireworks = safeWeatherString.includes('烟花');
        const isCloudy = (safeWeatherString.includes('云') && !safeWeatherString.includes('无云')) || safeWeatherString.includes('阴') || isRaining || isSnowing || safeWeatherString.includes('雷');

        const isNight = safePeriodString.includes('夜');
        const noBadWeather = !safeWeatherString.match(/([雨雪雷])/);
        const isGoodWeather = !safeWeatherString.match(/([雨雪雷])/);
        const isClearSky = safeWeatherString.includes('晴') && !safeWeatherString.match(/([雨雪雷云雾])/);
        const hasMilkyWay = isNight && noBadWeather && safeWeatherString.includes('银河');
        const wasMilkyWay = this.lastWeatherString.includes('银河');
        const hasRegularStars = isNight && noBadWeather && safeWeatherString.includes('星') && !hasMilkyWay;
        const hasFireflies = isNight && safeWeatherString.includes('萤火');

        if (this.state.weatherFxEnabled && this.state.isHighPerformanceFxEnabled && isCloudy) {
            this.clouds3dInstance.activate(safePeriodString, safeWeatherString, density, $bgFxTarget);
        } else {
            this.clouds3dInstance.deactivate();
        }

        this._manageStaticEffect('star', hasRegularStars, 150, () => this._createComplexStar(), $bgFxTarget);

        // --- Milky Way Burst Logic (Sakura Style) ---
        const $existingMilkyWay = $bgFxTarget.find('.milky-way-container');

        if (this.state.isHighPerformanceFxEnabled && hasMilkyWay) {
            // Only trigger if it's a NEW activation
            if (!wasMilkyWay) {
                this.logger.log('[天气系统] 首次激活银河特效 (爆发模式)...');
                clearTimeout(this.milkyWayTimeout); // Clear any lingering timeout
                this._renderMilkyWay($bgFxTarget);

                this.milkyWayTimeout = setTimeout(() => {
                    const $milkyWay = $bgFxTarget.find('.milky-way-container');
                    if ($milkyWay.length) {
                        $milkyWay.addClass('fading-out');
                        setTimeout(() => {
                            $milkyWay.remove();
                            // Fallback to regular stars after the show
                            if (!this._isAnyStaticEffectActive($bgFxTarget, ['star'])) {
                                this._manageStaticEffect('star', true, 150, () => this._createComplexStar(), $bgFxTarget);
                            }
                        }, 3000);
                    }
                }, 15000); // 15 seconds burst
            }
            // If it was already milky way, do nothing and let the timeout run its course.
        } else {
            // If the state is no longer milky way, ensure it's cleaned up.
            if ($existingMilkyWay.length) {
                clearTimeout(this.milkyWayTimeout);
                this.milkyWayTimeout = null;
                $existingMilkyWay.addClass('fading-out');
                setTimeout(() => $existingMilkyWay.remove(), 3000);
            }
        }

        let newEffect = { type: null, variant: null, density: 0, targetCount: 0, particleClass: null, creator: null, interval: 0 };
        if (this.state.weatherFxEnabled) {
            if (isRaining) {
                const baseCount = this.state.isLowPerformanceMode ? 15 : 50;
                const rainCount = Math.round(baseCount * (this.state.particleDensity / 100));
                newEffect = {
                    type: 'rain', variant: isWindy ? 'windy' : 'normal', density: density.count, particleClass: 'particle-wrapper', targetCount: rainCount * density.count, interval: 150 / density.speed,
                    creator: () => { const p = this.$('<div class="raindrop"></div>').css('opacity', Math.random() * .6 + .2); if (isWindy) p.addClass(density.wind >= 1.5 ? 'slanted-strong' : 'slanted-light'); const w = this._createParticleWrapper(density, 'rain').append(p); $fgFxTarget.append(w); }
                };
            } else if (isSnowing) {
                const baseCount = this.state.isLowPerformanceMode ? 12 : 40;
                const snowCount = Math.round(baseCount * (this.state.particleDensity / 100));
                newEffect = {
                    type: 'snow', variant: isWindy ? 'windy' : 'normal', density: density.count, particleClass: 'particle-wrapper', targetCount: snowCount * density.count, interval: 200 / density.speed,
                    creator: () => { const size = `${2 + Math.random() * 3}px`; const p = this.$('<div class="snowflake"></div>').css({ width: size, height: size, opacity: 0.5 + Math.random() * 0.5 }); const w = this._createParticleWrapper(density, 'snow').append(p); if (isWindy) w.find('.snowflake').css('animation-name', 'fall-sway'); $fgFxTarget.append(w); }
                };
            } else if (isWindy && !isCloudy && !shouldShowSakura) { // MODIFIED: Do not show wind effect if sakura is active
                const baseCount = this.state.isLowPerformanceMode ? 5 : 15;
                const leafCount = Math.round(baseCount * (this.state.particleDensity / 100));
                newEffect = {
                    type: 'wind', variant: 'normal', density: density.count, particleClass: 'leaf', targetCount: leafCount * density.count, interval: 300 / density.speed,
                    creator: () => { let p = (safeSeasonString.includes('春')) ? ['🍃', '🌸'] : (safeSeasonString.includes('秋')) ? ['🍂', '🍁'] : ['🍃']; const h = p[Math.floor(Math.random() * p.length)]; const l = this.$('<div></div>').addClass('leaf').html(h).css({ fontSize: `${12 + Math.random() * 8}px`, animationDuration: `${(10 + Math.random() * 8) / density.speed}s`, animationDelay: `-${Math.random() * 10}s`, left: `${Math.random() * 100}%`, animationName: this.state.isFxGlobal ? 'fall-sway-rotate-global' : 'fall-sway-rotate-local' }); $fgFxTarget.append(l); }
                };
            }
        }
        this._manageContinuousEffect(newEffect, $fgFxTarget);
        const fireflyCount = this.state.isLowPerformanceMode ? 6 : 20;
        this._manageStaticEffect('firefly', hasFireflies, fireflyCount * density.count, () => { const size = `${2 + Math.random() * 2}px`; return this.$('<div>').addClass('firefly').css({ width: size, height: size, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: `${4 + Math.random() * 4}s`, animationDelay: `${Math.random() * 8}s` }); }, $fgFxTarget);

        // --- 节日彩蛋特效 ---
        this._renderHolidayEffect($fgFxTarget);

        // --- New Sakura Logic ---
        if (this.state.isHighPerformanceFxEnabled && shouldShowSakura) {
            if (!wasSakura) {
                // First time activation: dense burst
                this.logger.log('[天气系统] 首次激活樱花特效 (密集模式)...');
                const $canvas = this.$('<canvas>').addClass('sakura-canvas');
                $fgFxTarget.append($canvas);
                SakuraFX.init($canvas.get(0), {
                    density: 'dense',
                    isLowPerformanceMode: this.state.isLowPerformanceMode,
                    densityMultiplier: this.state.particleDensity / 100
                });
                this.sakuraInstance = SakuraFX;
            }
            // If it was already sakura, do nothing, let the instance manage its state.
        } else if (wasSakura && this.sakuraInstance) {
            // Weather changed from sakura to something else
            this.logger.log('[天气系统] 正在停止樱花特效...');
            this.sakuraInstance.stop();
            this.sakuraInstance = null;
        }
        // --- End New Sakura Logic ---

        if (this.state.isHighPerformanceFxEnabled && shouldShowFireworks && !this.fireworksInstance) {
            this.logger.log('[天气系统] 正在激活烟花特效...');
            this.fireworksInstance = new FireworksFX({ ...this.dependencies, $fxTarget: $fgFxTarget, state: this.state });
            this.fireworksInstance.init();
        } else if ((!shouldShowFireworks || !this.state.isHighPerformanceFxEnabled) && this.fireworksInstance) {
            this.logger.log('[天气系统] 正在停止烟花特效...');
            this.fireworksInstance.stop();
            this.fireworksInstance = null;
        }


        if (isRaining) { this.activateRainyDayEffect($panel); }
        else if (this.rainyDayInstance) { this.rainyDayInstance.stop(); this.rainyDayInstance = null; }

        this._manageStaticEffect('fog-layer', isFoggy, 5, () => this.$('<div>').addClass('fog-layer').css({ animationDuration: `${20 + Math.random() * 15}s`, animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * .2 + .1 }), $fgFxTarget);
        this._manageMeteorEffect(hasMeteors, $fgFxTarget);

        clearTimeout(this.lightningLoopTimeout); this.lightningLoopTimeout = null;
        clearTimeout(this.globalLightningLoopTimeout); this.globalLightningLoopTimeout = null;

        $fgFxTarget.find('.effect-thunder').remove();
        if (this.state.weatherFxEnabled && this.state.isLightningEnabled && safeWeatherString.includes('雷')) {
            this.logger.log('[天气系统] 正在激活雷电效果。');
            this.clouds3dInstance.triggerLightning();
            this.startThunderstormEffect($toggleBtn);
            if (this.state.isFxGlobal) {
                $fgFxTarget.append(this.$('<div>').addClass('effect-thunder'));
                this.startGlobalThunderstormEffect($fgFxTarget);
            }
        }

        if (this.state.weatherFxEnabled) {
            // Bird animation removed as per user request
            if (!isNight && isClearSky && !this.vaporTrailInstance) {
                if (Math.random() < 0.025) {
                    this.logger.log('[天气系统] 正在触发飞机尾迹云特效...');
                    this.vaporTrailInstance = new VaporTrailFX({
                        ...this.dependencies,
                        $fxTarget: $bgFxTarget,
                        onComplete: () => { this.vaporTrailInstance = null; }
                    });
                    this.vaporTrailInstance.init();
                }
            }
        }

        // Update last weather string at the end
        this.lastWeatherString = safeWeatherString;
    }

    triggerEffect(effectName) {
        this.logger.log(`[Debug] 强制触发特效: ${effectName}`);
        const $fxTarget = this.state.isFxGlobal
            ? this.$(`#${this.config.FX_LAYER_ID}`)
            : this.$(`#${this.config.PANEL_ID}`).find('.tw-fx-container-local');

        if (!$fxTarget.length) {
            this.logger.error(`[Debug] 无法触发特效，找不到FX目标层。`);
            return;
        }

        switch (effectName) {
            case 'vapor_trail':
                if (this.vaporTrailInstance) {
                    this.logger.warn(`[Debug] 飞机尾迹云特效已在运行。`);
                    return;
                }
                this.vaporTrailInstance = new VaporTrailFX({
                    ...this.dependencies,
                    $fxTarget: $fxTarget,
                    onComplete: () => { this.vaporTrailInstance = null; }
                });
                this.vaporTrailInstance.init();
                break;
            case 'bird':
                this.logger.warn('[Debug] Bird animation has been removed.');
                break;
            default:
                this.logger.warn(`[Debug] 未知的特效名称: ${effectName}`);
        }
    }

    _createComplexStar() {
        const nightsky = ["#280F36", "#632B6C", "#BE6590", "#FFC1A0", "#FE9C7F"];
        const rand = Math.random();
        const dur = 2 + Math.random() * 6;
        let $star;

        if (rand < 0.6) { // 60% chance for a simple white star
            const size = `${0.5 + Math.random() * 1.5}px`;
            $star = this.$('<div>').addClass('star').css({
                width: size, height: size
            });
            if (Math.random() < 0.5) $star.addClass('blink');
        } else if (rand < 0.8) { // 20% chance for a slightly bigger white star with shadow
            const size = `${2 + Math.random() * 1}px`;
            $star = this.$('<div>').addClass('star star-4').css({
                width: size, height: size,
                boxShadow: `0px 0px 6px 1px rgba(255,255,255,${0.3 + Math.random() * 0.3})`
            }).addClass('blink');
        } else { // 20% chance for a colored star
            const size = `${1 + Math.random() * 1}px`;
            const color = nightsky[Math.floor(Math.random() * nightsky.length)];
            const shadow = nightsky[Math.floor(Math.random() * nightsky.length)];
            $star = this.$('<div>').addClass('star star-1 blink').css({
                width: size, height: size,
                backgroundColor: color,
                boxShadow: `0px 0px 6px 1px ${shadow}`
            });
        }

        $star.css({
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            animationDuration: `${dur}s`,
            animationDelay: `${Math.random() * dur}s`,
            opacity: 0.4 + Math.random() * 0.6
        });
        return $star;
    }

    _renderMilkyWay($fxTarget) {
        if ($fxTarget.find('.milky-way-container').length > 0) return;

        this.logger.log('[天气系统] 渲染银河彩蛋...');
        const $container = this.$('<div>').addClass('milky-way-container');
        const $stars = this.$('<div>').addClass('stars');
        const $starsCross = this.$('<div>').addClass('stars-cross');
        const $starsCrossAux = this.$('<div>').addClass('stars-cross-aux');
        $container.append($stars, $starsCross, $starsCrossAux);

        const nightsky = ["#280F36", "#632B6C", "#BE6590", "#FFC1A0", "#FE9C7F"];
        const getRandomInt = (min, max) => Math.random() * (max - min) + min;

        // PERFORMANCE OPTIMIZATION: Reduce blinking stars without reducing total star count.
        const blinkChance = 0.15; // Only 15% of stars will blink
        const templates = {
            star: (sizeClass, top, left, dur, doBlink) => `<div class='star ${sizeClass} ${doBlink ? 'blink' : ''}' style='top:${top}%;left:${left}%;animation-duration:${dur}s;'></div>`,
            starColor: (sizeClass, top, left, dur, color, shadow, doBlink) => `<div class='star ${sizeClass} ${doBlink ? 'blink' : ''}' style='top:${top}%;left:${left}%;animation-duration:${dur}s;background-color:${color};box-shadow:0px 0px 6px 1px ${shadow};'></div>`,
            blur: (top, left, color) => `<div class='nebula-milky-way' style='top:${top}%;left:${left}%;background-color:${color}'></div>`
        };

        // Generate a large number of static stars
        const staticStarCount = this.state.isLowPerformanceMode ? 400 : 1200;
        for (let i = 0; i < staticStarCount; i++) {
            const size = `star-${Math.floor(Math.random() * 3)}`; // star-0, star-1, star-2
            $stars.append(templates.star(size, getRandomInt(0, 100), getRandomInt(0, 100), getRandomInt(2, 8), Math.random() < blinkChance));
        }

        // Generate a smaller number of larger/brighter stars
        const largeStarCount = this.state.isLowPerformanceMode ? 60 : 200;
        for (let i = 0; i < largeStarCount; i++) {
            const size = `star-${3 + Math.floor(Math.random() * 2)}`; // star-3, star-4
            $stars.append(templates.star(size, getRandomInt(0, 100), getRandomInt(0, 100), getRandomInt(4, 10), Math.random() < blinkChance));
        }

        // Generate colored stars and nebula for the main cross
        const crossStarCount = this.state.isLowPerformanceMode ? 50 : 150;
        for (let i = 0; i < crossStarCount; i++) {
            const color1 = nightsky[Math.floor(getRandomInt(0, nightsky.length))];
            const shadow1 = nightsky[Math.floor(getRandomInt(0, nightsky.length))];
            $starsCross.append(templates.blur(getRandomInt(0, 100), getRandomInt(0, 100), color1));
            $starsCross.append(templates.starColor('star-1', getRandomInt(0, 100), getRandomInt(0, 100), getRandomInt(6, 12), color1, shadow1, Math.random() < blinkChance));
        }

        // Generate colored stars and nebula for the auxiliary cross
        const auxStarCount = this.state.isLowPerformanceMode ? 15 : 50;
        for (let i = 0; i < auxStarCount; i++) {
            const color2 = nightsky[Math.floor(getRandomInt(0, nightsky.length))];
            const shadow2 = nightsky[Math.floor(getRandomInt(0, nightsky.length))];
            $starsCrossAux.append(templates.blur(getRandomInt(0, 100), getRandomInt(0, 100), color2));
            $starsCrossAux.append(templates.starColor('star-2', getRandomInt(0, 100), getRandomInt(0, 100), getRandomInt(4, 10), color2, shadow2, false)); // These are more like nebula, no blink
        }

        $fxTarget.append($container);
    }

    // _createBirdAnimation method removed as per user request

    _clearAllParticles($fxTarget) {
        const selectors = ['.particle-wrapper', '.leaf', '.star', '.firefly', '.shooting_star', '.fog-layer', '.milky-way-container'];
        const particles = $fxTarget.children(selectors.join(', '));
        if (particles.length > 0) {
            this.logger.log(`[天气系统] Clearing particles: ${selectors.join(', ')}`);
            particles.remove();
        }
    }

    startThunderstormEffect($container) {
        if (!$container || !$container.length) return;
        const createStrike = () => {
            const delay = 25000 + Math.random() * 5000;
            this.lightningLoopTimeout = setTimeout(() => {
                if ($container.hasClass('weather-thunderstorm')) {
                    this.createLightningStrike($container[0]);
                    createStrike();
                }
            }, delay);
        };
        createStrike();
    }

    startGlobalThunderstormEffect($container) {
        if (!$container || !$container.length) return;
        const createStrike = () => {
            const delay = 25000 + Math.random() * 5000;
            this.globalLightningLoopTimeout = setTimeout(() => {
                if ($container.find('.effect-thunder').length > 0) {
                    this.createLightningStrike($container[0]);
                    createStrike();
                }
            }, delay);
        };
        createStrike();
    }

    createLightningStrike(container) {
        container.classList.add('lightning-flash');

        const cardWidth = container.offsetWidth;
        const cardHeight = container.offsetHeight;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute('class', 'lightning-strike-svg');

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute('class', 'lightning-strike-path');

        let pathX = cardWidth * 0.2 + Math.random() * (cardWidth * 0.6);
        const yOffset = cardHeight * 0.15;
        const steps = 10;
        let points = `M${pathX},0`;

        for (let i = 0; i < steps; i++) {
            const x = pathX + (Math.random() * yOffset - (yOffset / 2));
            const y = (cardHeight / steps) * (i + 1);
            points += ` L${x},${y}`;
        }

        path.setAttribute('d', points);
        path.style.strokeWidth = `${1 + Math.random()}px`;

        svg.appendChild(path);
        container.appendChild(svg);

        setTimeout(() => {
            if (svg.parentNode) {
                svg.remove();
            }
            container.classList.remove('lightning-flash');
        }, 500);
    }


    activateRainyDayEffect($panel) {
        if (!this.state.isRaindropFxOn) {
            if (this.rainyDayInstance) {
                this.rainyDayInstance.stop();
                this.rainyDayInstance = null;
            }
            return;
        }

        if (this.rainyDayInstance) return;

        const width = Math.floor($panel.width());
        const height = Math.floor($panel.height());

        if (width <= 0 || height <= 0) return;

        const $rainContainer = $panel.find('.tw-rain-layer').empty();
        const refractionUrl = this.config.RAIN_REFRACTION_URL;

        if (!refractionUrl) return;

        const bgImg = new Image();
        bgImg.crossOrigin = 'Anonymous';
        bgImg.onload = () => {
            this.rainyDayInstance = new RainyDay({
                image: bgImg,
                parentElement: $rainContainer[0],
                width: width,
                height: height
            });
            this.rainyDayInstance.rain([[1, 1, 0.8], [2, 2, 0.95], [3, 2, 0.96], [4, 1, 0.97], [5, 2, 0.98], [6, 3, 1]], 150);
        };
        bgImg.src = refractionUrl;
    }

    _manageContinuousEffect(newEffect, $fxTarget) {
        const oldEffect = this.weatherEffects;
        const isDifferentEffect = oldEffect.current.type !== newEffect.type || oldEffect.current.variant !== newEffect.variant;

        if (oldEffect.intervalId) {
            clearInterval(oldEffect.intervalId);
            oldEffect.intervalId = null;
        }

        if (isDifferentEffect) {
            if (oldEffect.particleClass) {
                const oldParticles = $fxTarget.children(`.${oldEffect.particleClass}`);
                if (oldParticles.length > 0) {
                    oldParticles.addClass('fading-out');
                    setTimeout(() => oldParticles.remove(), 3000);
                }
            }
            if (newEffect.type) {
                setTimeout(() => this._startGenerator(newEffect, $fxTarget), 200);
            }
        } else if (newEffect.type !== null) {
            const currentParticles = $fxTarget.children(`.${oldEffect.particleClass}`);
            const diff = newEffect.targetCount - currentParticles.length;

            if (diff > 0) {
                this._startGenerator(newEffect, $fxTarget);
            } else if (diff < 0) {
                currentParticles.slice(0, Math.abs(diff)).addClass('fading-out').delay(3000).remove(0);
            }
        }

        this.weatherEffects.current = newEffect.type ? { ...newEffect } : { type: null };
        this.weatherEffects.particleClass = newEffect.particleClass || '';
    }

    _startGenerator(effectConfig, $fxTarget) {
        const { creator, targetCount, particleClass, interval } = effectConfig;
        if (!creator) return;
        const batchSize = Math.max(1, Math.floor(targetCount / 10));
        const intervalId = setInterval(() => {
            const currentCount = $fxTarget.children(`.${particleClass}:not(.fading-out)`).length;

            if (currentCount >= targetCount) {
                clearInterval(intervalId);
                if (this.weatherEffects.intervalId === intervalId) { this.weatherEffects.intervalId = null; }
                return;
            }
            for (let i = 0; i < batchSize && ($fxTarget.children(`.${particleClass}:not(.fading-out)`).length < targetCount); i++) {
                creator();
            }
        }, interval);
        this.weatherEffects.intervalId = intervalId;
    }

    _createParticleWrapper(density, type) {
        const isRaining = type === 'rain';
        const isWindy = density.wind > 0;
        const wrapper = this.$('<div></div>').addClass('particle-wrapper').css({
            left: isWindy ? `${Math.random() * 150 - 50}%` : `${Math.random() * 110 - 5}%`,
            animationDelay: `-${Math.random() * (isRaining ? 6 : 12)}s`,
            animationDuration: `${((isRaining ? 0.4 : 10) + Math.random() * (isRaining ? 0.4 : 10)) / density.speed}s`
        });
        if (isWindy) { wrapper.addClass(density.wind >= 1.5 ? 'angled-strong' : 'angled-light'); }
        return wrapper;
    }

    getWeatherDensity(weatherString) {
        if (!weatherString) return { count: 1.0, speed: 1.0, wind: -1 };
        const density = { count: 1.0, speed: 1.0, wind: -1 };

        if (weatherString.includes('暴') || weatherString.includes('阴')) { density.count = 5.0; density.speed = 2.0; }
        else if (weatherString.includes('大') || weatherString.includes('强') || weatherString.includes('多云')) { density.count = 3.0; density.speed = 1.5; }
        else if (weatherString.includes('中')) { density.count = 2.0; density.speed = 1.0; }
        else if (weatherString.includes('小') || weatherString.includes('微') || weatherString.includes('少云')) { density.count = 0.5; density.speed = 0.8; }
        else if (weatherString.includes('无云')) { density.count = 0; density.speed = 0; }

        if (weatherString.includes('风')) {
            if (weatherString.includes('狂') || weatherString.includes('暴')) { density.wind = 2.0; }
            else if (weatherString.includes('大') || weatherString.includes('强')) { density.wind = 1.5; }
            else { density.wind = 0.8; }
        }
        return density;
    }

    _isAnyStaticEffectActive($fxTarget, classNames) {
        for (const className of classNames) {
            if ($fxTarget.children(`.${className}`).length > 0) {
                return true;
            }
        }
        return false;
    }

    _manageStaticEffect(className, shouldShow, count, creator, $fxTarget) {
        const existing = $fxTarget.children(`.${className}`);
        if (shouldShow) {
            if (existing.length > 0) return;
            for (let i = 0; i < count; i++) { $fxTarget.append(creator()); }
        } else if (existing.length > 0) {
            existing.addClass('fading-out');
            setTimeout(() => existing.remove(), 3000);
        }
    }

    _manageMeteorEffect(shouldShow, $fxTarget) {
        const className = 'shooting_star';
        const existing = $fxTarget.children(`.${className}`);
        if (shouldShow) {
            if (existing.length > 0) return;
            for (let i = 0; i < 4; i++) {
                const meteor = this.$('<div>').addClass(className).css({
                    top: `${Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 15}s`,
                    animationDuration: `${3 + Math.random() * 2.5}s`
                });
                $fxTarget.append(meteor);
            }
        } else if (existing.length > 0) {
            existing.addClass('fading-out');
            setTimeout(() => existing.remove(), 3000);
        }
    }

    clearAllWeatherEffects(forceClear = true) {
        if (this.weatherEffects.intervalId) clearInterval(this.weatherEffects.intervalId);
        if (this.lightningLoopTimeout) clearTimeout(this.lightningLoopTimeout);
        if (this.globalLightningLoopTimeout) clearTimeout(this.globalLightningLoopTimeout);
        this.weatherEffects.intervalId = null;
        this.lightningLoopTimeout = null;
        this.globalLightningLoopTimeout = null;
        this.weatherEffects.current = { type: null };
        if (this.rainyDayInstance) this.rainyDayInstance.stop();
        if (this.sakuraInstance) this.sakuraInstance.stop();
        if (this.clouds3dInstance) this.clouds3dInstance.deactivate();
        if (this.fireworksInstance) this.fireworksInstance.stop();
        this.rainyDayInstance = null;
        this.sakuraInstance = null;
        this.fireworksInstance = null;
        const layers = [this.$(`#${this.config.FX_LAYER_ID}`), this.$(`#${this.config.PANEL_ID}`).find('.tw-fx-container-local'), this.$(`#${this.config.FX_LAYER_BG_ID}`)];
        layers.forEach($layer => {
            if ($layer.length) $layer.children().not('.tw-fx-glow, .sakura-canvas').remove();
        });
    }

    /**
     * 节日彩蛋特效渲染
     * @param {jQuery} $fxTarget - 特效容器
     */
    _renderHolidayEffect($fxTarget) {
        // 使用游戏内时间而非系统时间
        const gameTimeString = this.state.latestWorldStateData?.['时间'] || '';
        const holidayConfig = this.holidayDetector.getParticleConfig(gameTimeString);
        if (!holidayConfig) return;

        const className = 'holiday-particle';
        const existing = $fxTarget.children(`.${className}`);

        // 如果已有节日粒子且是同一节日，不重复生成
        if (existing.length > 0 && existing.data('holiday-id') === holidayConfig.id) return;

        // 清除旧的节日粒子
        existing.remove();

        // 根据性能模式决定粒子数量
        const baseCount = this.state.isLowPerformanceMode ? 8 : 25;
        const count = Math.round(baseCount * (this.state.particleDensity / 100));

        this.logger.log(`[天气系统] 检测到节日: ${holidayConfig.name}，生成 ${count} 个粒子`);

        for (let i = 0; i < count; i++) {
            const emoji = holidayConfig.particles[Math.floor(Math.random() * holidayConfig.particles.length)];
            const $particle = this.$('<div>')
                .addClass(className)
                .data('holiday-id', holidayConfig.id)
                .html(emoji)
                .css({
                    position: 'absolute',
                    fontSize: `${16 + Math.random() * 12}px`,
                    left: `${Math.random() * 100}%`,
                    top: `-20px`,
                    opacity: 0.8 + Math.random() * 0.2,
                    animation: `fall-sway-rotate-local ${8 + Math.random() * 6}s linear infinite`,
                    animationDelay: `-${Math.random() * 10}s`,
                    zIndex: 100,
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 3px ${holidayConfig.colors[Math.floor(Math.random() * holidayConfig.colors.length)]})`
                });
            $fxTarget.append($particle);
        }
    }
}