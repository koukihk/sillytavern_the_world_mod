/**
 * The World - UI Renderer
 * @description Responsible for generating HTML content for the UI panes.
 */
import { HOLIDAY_DATA } from '../utils/holidays.js';
import { Icons, getIcon } from '../utils/icons.js';
import { getAnimatedWeatherIcon } from '../utils/animatedWeatherIcons.js';

export class UIRenderer {
    constructor({ $, config, state, skyThemeController, mapSystem, logger, mapViewportManager, globalThemeManager }) {
        this.$ = $;
        this.config = config;
        this.state = state;
        this.skyThemeController = skyThemeController;
        this.mapSystem = mapSystem; // For direct access to map data
        this.logger = logger;
        this.mapViewportManager = mapViewportManager;
        this.globalThemeManager = globalThemeManager; // For illustration background
    }

    getWeatherIconHtml(weather, period) {
        const container = (iconHtml) => `<div class="tw-weather-icon">${iconHtml}</div>`;

        if (weather.includes('雷')) {
            return container(`<div class="icon thunder-storm"><div class="cloud"></div><div class="lightning"><div class="bolt"></div><div class="bolt"></div></div></div>`);
        }
        if (weather.includes('雨')) {
            if (weather.includes('晴')) {
                return container(`<div class="icon sun-shower"><div class="cloud"></div><div class="sun"><div class="rays"></div></div><div class="rain"></div></div>`);
            }
            return container(`<div class="icon rainy"><div class="cloud"></div><div class="rain"></div></div>`);
        }
        if (weather.includes('雪')) {
            return container(`<div class="icon flurries"><div class="cloud"></div><div class="snow"><div class="flake"></div><div class="flake"></div></div></div>`);
        }
        if (weather.includes('云') || weather.includes('阴')) {
            return container(`<div class="icon cloudy"><div class="cloud"></div><div class="cloud"></div></div>`);
        }
        if (weather.includes('晴') || period.includes('白天')) {
            return container(`<div class="icon sunny"><div class="sun"><div class="rays"></div></div></div>`);
        }
        if (weather.includes('星') || period.includes('夜')) {
            // A simple moon icon representation using cloud styles
            return container(`<div class="icon sunny"><div class="sun" style="color: #f0e68c; box-shadow: 0 0 0 0.375em #f0e68c88;"><div class="rays" style="background:transparent; box-shadow:none;"></div></div></div>`);
        }

        // Fallback to emoji for unhandled weather
        let emoji = '🌦️';
        if (weather.includes('风')) emoji = '🌬️';
        else if (weather.includes('雾')) emoji = '🌫️';
        else if (weather.includes('樱')) emoji = '🌸';
        else if (weather.includes('流星')) emoji = '🌠';
        else if (weather.includes('萤火')) emoji = '✨';

        return `<span class="weather-emoji">${emoji}</span>`;
    }

    renderWorldStatePane($pane, data) {
        if (!data) {
            $pane.html('<p class="tw-notice">等待世界状态数据...</p>');
            return;
        }

        const period = data['时段'] || '白天';
        const weather = data['天气'] || '';
        const timeString = data['时间'] || '2024年01月01日-00:00';
        const seasonStr = data['季节'] || (timeString.match(/(春|夏|秋|冬)/) || [])[0];

        // Season Icon Logic (SVG instead of Emoji)
        let seasonDisplayHtml = '';
        if (seasonStr) {
            let iconName = 'calendar';
            if (seasonStr.includes('春')) iconName = 'flower2';
            else if (seasonStr.includes('夏')) iconName = 'sunMedium';
            else if (seasonStr.includes('秋')) iconName = 'leaf';
            else if (seasonStr.includes('冬')) iconName = 'snowflake';

            seasonDisplayHtml = `<span class="ws-season-icon">${seasonStr} ${getIcon(iconName, 'ws-season-svg')}</span>`;
        }

        // New Time Parsing Logic
        const modernRegex = /(\d{4})[年-]?.*?(\d{1,2})[月-]?(\d{1,2})[日-]?.*?(\d{2}:\d{2})/;
        const fantasyRegex = /(\d{1,2}:\d{2})/;
        const modernMatch = timeString.match(modernRegex);
        const fantasyMatch = timeString.match(fantasyRegex);

        let timeHtml;
        let weekdayHtml = '';
        let holidayHtml = '';

        if (modernMatch) {
            const [, year, month, day, time] = modernMatch;
            const date = new Date(year, month - 1, day);
            const weekday = `星期${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
            weekdayHtml = `<div class="ws-weekday">${weekday}</div>`;

            const holidayKey = `${month}-${day}`;
            if (HOLIDAY_DATA[holidayKey]) {
                const holiday = HOLIDAY_DATA[holidayKey];
                holidayHtml = `<div class="ws-holiday-display">${holiday.icon} ${holiday.name}</div>`;
            }

            const [hour, minute] = time.split(':');

            // Season display (Text + Emoji)
            const seasonPart = seasonDisplayHtml || '';

            timeHtml = `
                <div class="ws-time-main" id="tw-time-display-main">${hour}<span>:${minute}</span></div>
                <div class="ws-time-secondary">
                    <div class="ws-date-row">
                        <div class="ws-date-full">${year} / ${String(month).padStart(2, '0')} / ${String(day).padStart(2, '0')} ${seasonPart}</div>
                    </div>
                    ${weekdayHtml}
                </div>
            `;
        } else if (fantasyMatch) {
            const time = fantasyMatch[1];
            const datePart = timeString.replace(time, '').trim().replace(/,$/, '').trim();
            const [hour, minute] = time.split(':');
            const seasonPart = seasonDisplayHtml || '';
            timeHtml = `
                <div class="ws-time-main" id="tw-time-display-main">${hour}<span>:${minute}</span></div>
                <div class="ws-time-secondary">
                    <div class="ws-date-row">
                        <div class="ws-date-full-single">${datePart} ${seasonPart}</div>
                    </div>
                </div>
            `;
        } else {
            timeHtml = `<div class="ws-time-secondary"><div class="ws-date-full-single" id="tw-time-display-main">${timeString}</div></div>`;
        }

        // Get animated weather icon (Meteocons)
        const animatedWeatherIcon = getAnimatedWeatherIcon(weather, period);

        const contentHtml = `
            <div class="ws-details">
                <div class="ws-details-left">
                    <div class="ws-time-interact" title="改变时间">
                         <div class="ws-period-display">${period}</div>
                         <div class="ws-time-display">
                            ${timeHtml}
                        </div>
                    </div>
                </div>
                
                <div class="ws-details-right">
                    <div class="ws-weather-interact" title="改变天气">
                        <div class="ws-weather-box">
                            <div class="ws-weather-animated-icon">${animatedWeatherIcon}</div>
                        </div>
                        <div class="ws-weather-text">${weather}</div>
                    </div>
                </div>
            </div>
            <div class="ws-content-inner">
                <hr class="ws-separator">
                <div class="ws-secondary-info">
                     ${holidayHtml}
                </div>
                
                <div class="ws-hero-section">
                    <!-- Season Hero -->
                    <!-- Season Hero Removed -->

                    <!-- Scene Hero -->
                    ${data['场景'] ? `
                    <div class="ws-hero-item">
                        <div class="ws-hero-label">${getIcon('image')} 场景</div>
                        <div class="ws-hero-value scene">
                            ${(data['场景'] || '').replace(/\[\[(.*?)\]\]/g, '<span class="ws-interactive-keyword" data-keyword="$1">$1</span>')}
                        </div>
                    </div>` : ''}

                    <!-- Illustration (隐藏当动态背景激活时) -->
                    ${(data['插图'] && !this.state.isDynamicIllustrationBgEnabled) ? `
                    <div class="ws-illustration-item">
                        <a href="${this.config.IMAGE_BASE_URL}${data['插图']}" target="_blank" rel="noopener noreferrer">
                            <img src="${this.config.IMAGE_BASE_URL}${data['插图']}" 
                                 alt="${data['插图']}"
                                 onerror="this.parentElement.parentElement.style.display='none'">
                        </a>
                    </div>` : ''}
                </div>
            </div>`;
        $pane.html(contentHtml);

        // 动态插图背景处理
        if (this.state.isDynamicIllustrationBgEnabled && this.globalThemeManager) {
            if (data['插图']) {
                const imageUrl = `${this.config.IMAGE_BASE_URL}${data['插图']}`;
                this.globalThemeManager.setIllustrationBackground(imageUrl);
            } else {
                // 无插图时清除，回退天色
                this.globalThemeManager.clearIllustrationBackground();
            }
        }
    }

    async renderMapPane($pane) {
        $pane.empty();
        if (this.state.mapMode === 'lite') {
            this._renderLiteMapPane($pane);
        } else {
            await this._renderAdvancedMapPane($pane);
        }
    }

    async _renderAdvancedMapPane($pane) {
        const { mapDataManager, atlasManager } = this.mapSystem;
        const { advancedMapPathStack } = this.state;

        const $mapContent = this.$('<div id="tw-advanced-map-content"></div>');
        $pane.append($mapContent);

        const $editButton = this.$('<button id="tw-map-edit-toggle-btn" class="has-ripple">编辑地图 ✏️</button>');
        $mapContent.append($editButton);

        if (!mapDataManager.isInitialized()) {
            const $placeholder = this.$(`
                <div class="tw-map-placeholder">
                    <p class="tw-notice">当前角色没有地图档案。</p>
                    <button id="tw-create-map-placeholder-btn" class="tw-create-map-button has-ripple">
                        <span class="button-icon">🗺️</span> 创建地图档案
                    </button>
                    <p class="tw-notice" style="font-size: 0.8em; opacity: 0.7; margin-top: 10px;">
                        或者，让AI在故事中通过 &lt;MapUpdate&gt; 标签自动创建。
                    </p>
                </div>`);
            $mapContent.append($placeholder);
            return;
        }

        const isIndoor = advancedMapPathStack.length > 0;
        let nodesToRender = [];
        let currentBuildingNode = null;

        if (isIndoor) {
            this.logger.log('[Map Renderer] Rendering "Indoor" view.');
            const currentBuildingId = advancedMapPathStack[advancedMapPathStack.length - 1];
            currentBuildingNode = mapDataManager.nodes.get(currentBuildingId);
            nodesToRender = Array.from(mapDataManager.nodes.values()).filter(node => node.parentId === currentBuildingId);

            const $breadcrumbs = this.$('<div class="tw-adv-map-breadcrumbs"></div>');
            $breadcrumbs.append('<span class="tw-adv-map-breadcrumb-item tw-adv-map-breadcrumb-item-root">世界</span>');

            let path = [];
            let currentNode = currentBuildingNode;
            while (currentNode) {
                path.unshift(currentNode);
                currentNode = currentNode.parentId ? mapDataManager.nodes.get(currentNode.parentId) : null;
            }

            path.forEach((node, index) => {
                $breadcrumbs.append('<span>&nbsp;/&nbsp;</span>');
                $breadcrumbs.append(
                    `<span class="tw-adv-map-breadcrumb-item ${index === path.length - 1 ? 'current' : ''}" data-index="${index}">${node.name}</span>`
                );
            });
            $mapContent.append($breadcrumbs);

        } else {
            this.logger.log('[Map Renderer] Rendering "Outdoor" view.');
            nodesToRender = Array.from(mapDataManager.nodes.values());
        }

        const $viewport = this.$('<div class="tw-map-viewport"></div>');
        $mapContent.append($viewport);

        const $rulerX = this.$('<div class="tw-map-ruler-x"></div>');
        const $rulerY = this.$('<div class="tw-map-ruler-y"></div>');
        const $rulerCorner = this.$('<div class="tw-map-ruler-corner"></div>');
        $mapContent.append($rulerX, $rulerY, $rulerCorner);

        const vw = $viewport.width();
        const vh = $viewport.height();

        const canvasSize = isIndoor ? 800 : 1200;
        const logicalMax = isIndoor ? 30 : 1200;

        const canvasOffsetLeft = (vw - canvasSize) / 2;
        const canvasOffsetTop = (vh - canvasSize) / 2;
        const canvasCss = { width: `${canvasSize}px`, height: `${canvasSize}px`, left: `${canvasOffsetLeft}px`, top: `${canvasOffsetTop}px` };

        const $canvas = this.$('<div class="tw-map-canvas"></div>').css(canvasCss);

        if (isIndoor && currentBuildingNode && currentBuildingNode.mapImage) {
            const imageUrl = `${this.config.IMAGE_BASE_URL}${currentBuildingNode.mapImage}`;
            $canvas.css('background-image', `url(${imageUrl})`);
            this.logger.log(`[UIRenderer] Applied indoor map background: ${imageUrl}`);
        } else if (!isIndoor) {
            const globalBgUrl = await atlasManager.getBackgroundImage();
            if (globalBgUrl) {
                $canvas.css('background-image', `url(${globalBgUrl})`);
                this.logger.log(`[UIRenderer] Applied global map background: ${globalBgUrl}`);
            }
        }

        const $svgLayer = this.$(`<svg class="tw-map-lines-svg"></svg>`).css(canvasCss);

        const nodesWithChildren = new Map();
        mapDataManager.nodes.forEach(node => {
            if (node.parentId && mapDataManager.nodes.has(node.parentId)) {
                if (!nodesWithChildren.has(node.parentId)) {
                    nodesWithChildren.set(node.parentId, []);
                }
                nodesWithChildren.get(node.parentId).push(node);
            }
        });

        nodesToRender.forEach(node => {
            if (node.coords) {
                const [x, y] = node.coords.split(',').map(Number);
                const leftPercent = (x / logicalMax) * 100;
                const topPercent = (y / logicalMax) * 100;

                const enterableTypes = ['building', 'dungeon', 'landmark', 'shop', 'house', 'camp'];
                const isEnterable = enterableTypes.includes(node.type);

                const $pin = this.$('<div>')
                    .addClass('tw-map-pin')
                    .addClass(`type-${node.type || 'default'}`) // Add type-specific class
                    .toggleClass('is-enterable', isEnterable) // Add enterable class
                    .attr('data-node-id', node.id)
                    .css({ left: `${leftPercent}%`, top: `${topPercent}%` });

                if (node.parentId && mapDataManager.nodes.has(node.parentId)) {
                    $pin.addClass('is-child-node');
                } else {
                    $pin.addClass('is-parent-node');
                }

                const $pinLabel = this.$(`<div class="tw-map-pin-label">${node.name}</div>`);
                $pin.append($pinLabel);
                $canvas.append($pin);
            }
        });

        $viewport.append($canvas, $svgLayer);

        if (!isIndoor) {
            const $sidebar = this.$('<div class="tw-map-sidebar"><h4>孤立节点</h4><p style="font-size:0.8em; opacity:0.7; padding: 0 10px;">拖拽到地图上以设置坐标。</p></div>');
            const unplottedNodes = Array.from(mapDataManager.nodes.values()).filter(node => !node.coords);
            if (unplottedNodes.length > 0) {
                const nodeMap = new Map(unplottedNodes.map(node => [node.id, { ...node, children: [] }]));
                const roots = [];
                nodeMap.forEach(node => {
                    if (node.parentId && nodeMap.has(node.parentId)) {
                        nodeMap.get(node.parentId).children.push(node);
                    } else {
                        roots.push(node);
                    }
                });
                const sortNodes = (nodes) => {
                    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
                    nodes.forEach(node => { if (node.children.length > 0) sortNodes(node.children); });
                };
                sortNodes(roots);
                const buildTreeHtml = (nodes, depth) => {
                    let html = '';
                    for (const node of nodes) {
                        html += `<li class="tw-sidebar-item" data-node-id="${node.id}" style="padding-left: ${10 + depth * 20}px;">${node.name}</li>`;
                        if (node.children.length > 0) {
                            html += buildTreeHtml(node.children, depth + 1);
                        }
                    }
                    return html;
                };
                const $sidebarTree = this.$('<ul class="tw-sidebar-tree"></ul>');
                $sidebarTree.html(buildTreeHtml(roots, 0));
                $sidebar.append($sidebarTree);
                $viewport.append($sidebar);
            }
        }

        const isPlayerLocationKnown = !!this.state.currentPlayerLocationId;
        const recenterTitle = isPlayerLocationKnown ? '跳转至当前位置' : '重置地图视图';
        const $zoomControls = this.$(`
            <div class="tw-map-zoom-controls">
                <button class="tw-map-zoom-btn has-ripple" data-zoom-direction="in" title="放大">+</button>
                <button class="tw-map-zoom-btn has-ripple" data-zoom-direction="out" title="缩小">-</button>
                <button id="tw-map-recenter-btn" class="tw-map-zoom-btn has-ripple" title="${recenterTitle}">🎯</button>
                <button id="tw-map-fit-bounds-btn" class="tw-map-zoom-btn has-ripple" title="世界概览 (缩放至所有节点)">🌐</button>
            </div>`);
        $mapContent.append($zoomControls);

        // Automatically fit bounds after rendering
        if (this.mapViewportManager) {
            // Use a short timeout to ensure the DOM is fully painted
            setTimeout(() => this.mapViewportManager.fitToBounds(), 100);
        }
    }

    _renderLiteMapPane($pane) {
        $pane.css('padding', '15px'); // Add padding back for lite mode
        const { mapDataManager } = this.mapSystem;
        const { liteMapPathStack } = this.state;

        if (!mapDataManager.isInitialized()) {
            $pane.html(`
                <div class="tw-map-placeholder" style="padding:15px;">
                    <p class="tw-notice">当前角色没有地图档案。</p>
                    <button id="tw-create-map-placeholder-btn" class="tw-create-map-button has-ripple">
                        <span class="button-icon">🗺️</span> 创建地图档案
                    </button>
                    <p class="tw-notice" style="font-size: 0.8em; opacity: 0.7; margin-top: 10px;">
                        或者，让AI在故事中通过 &lt;MapUpdate&gt; 标签自动创建。
                    </p>
                </div>`);
            return;
        }

        // 1. Render Breadcrumbs
        const $breadcrumbs = this.$('<div class="tw-lite-map-breadcrumbs"></div>');
        $breadcrumbs.append('<span class="tw-lite-map-breadcrumb-item tw-lite-map-breadcrumb-item-root">世界</span>');

        liteMapPathStack.forEach((nodeId, index) => {
            const node = mapDataManager.nodes.get(nodeId);
            if (node) {
                const isCurrent = index === liteMapPathStack.length - 1;
                $breadcrumbs.append('<span>&nbsp;/&nbsp;</span>');
                $breadcrumbs.append(
                    `<span class="tw-lite-map-breadcrumb-item ${isCurrent ? 'current' : ''}" data-index="${index}">${node.name}</span>`
                );
            }
        });
        $pane.append($breadcrumbs);

        // 2. Render Node List
        const currentParentId = liteMapPathStack.length > 0 ? liteMapPathStack[liteMapPathStack.length - 1] : null;

        const children = Array.from(mapDataManager.nodes.values()).filter(node => {
            return (currentParentId === null && !node.parentId) || node.parentId === currentParentId;
        }).sort((a, b) => a.name.localeCompare(b.name));

        const $list = this.$('<ul class="tw-lite-map-list"></ul>');
        if (children.length === 0) {
            $list.append('<p class="tw-notice">这里空空如也。</p>');
        } else {
            children.forEach(node => {
                const hasChildren = this._nodeHasChildren(node.id);
                const $item = this.$(`
                    <li class="tw-lite-map-item" data-node-id="${node.id}">
                        <div class="tw-lite-map-item-name">
                            <span class="tw-lite-map-item-icon">${this._getNodeIcon(node)}</span>
                            <span>${node.name}</span>
                        </div>
                        ${hasChildren ? '<span class="tw-lite-map-item-children-indicator">▶</span>' : ''}
                    </li>
                `);
                $list.append($item);
            });
        }
        $pane.append($list);
    }

    _nodeHasChildren(nodeId) {
        for (const node of this.mapSystem.mapDataManager.nodes.values()) {
            if (node.parentId === nodeId) return true;
        }
        return false;
    }

    _getNodeIcon(node) {
        if (node.type) {
            if (node.type.toLowerCase() === 'region') return '🏞️';
            if (node.type.toLowerCase() === 'city') return '🏙️';
            if (node.type.toLowerCase() === 'dungeon') return '🦇';
            if (node.type.toLowerCase() === 'landmark') return '📍';
        }
        return '🌍'; // Default icon
    }

    renderSettingsPane($pane) {
        $pane.empty();

        // 辅助函数：生成带图标的设置项标题
        const settingTitle = (iconName, title) => `${getIcon(iconName, 'tw-setting-icon')} ${title}`;

        // 辅助函数：生成卡片结构
        const createCard = (titleHtml, desc, controlHtml) => `
            <div class="tw-settings-card">
                <div class="tw-settings-card-header">
                    <div class="tw-settings-item-text">
                        <h4>${titleHtml}</h4>
                        <p>${desc}</p>
                    </div>
                </div>
                <div class="tw-settings-control">
                    ${controlHtml}
                </div>
            </div>
        `;

        // 辅助函数：生成分类标题
        const categoryTitle = (iconName, title, id) => `
            <div class="tw-settings-category-title" id="${id}">
                ${getIcon(iconName, 'tw-category-icon')} ${title}
            </div>
        `;

        // 侧边书签导航 HTML - 使用分类图标
        const bookmarkNav = `
            <nav class="tw-settings-nav">
                <div class="tw-nav-line"></div>
                <a href="#cat-panel" class="tw-nav-item active" data-target="cat-panel" title="面板 UI">
                    ${getIcon('palette', 'tw-nav-icon')}
                </a>
                <a href="#cat-tavern" class="tw-nav-item" data-target="cat-tavern" title="酒馆注入">
                    ${getIcon('home', 'tw-nav-icon')}
                </a>
                <a href="#cat-audio" class="tw-nav-item" data-target="cat-audio" title="音效设置">
                    ${getIcon('music', 'tw-nav-icon')}
                </a>
                <a href="#cat-effects" class="tw-nav-item" data-target="cat-effects" title="特效设置">
                    ${getIcon('sparkles', 'tw-nav-icon')}
                </a>
                <a href="#cat-theme" class="tw-nav-item" data-target="cat-theme" title="天色主题">
                    ${getIcon('sun', 'tw-nav-icon')}
                </a>
                <a href="#cat-data" class="tw-nav-item" data-target="cat-data" title="数据管理">
                    ${getIcon('database', 'tw-nav-icon')}
                </a>
            </nav>
        `;

        // ==================== 分类 1: 面板 UI 设置 ====================
        const panelUIContent = `
            ${categoryTitle('palette', '面板 UI 设置', 'cat-panel')}
            <div class="tw-settings-grid">
                ${createCard(
            settingTitle('mapPin', '地图模式'),
            '在简洁的列表视图和高级的画布视图之间切换。',
            `<div class="tw-map-mode-switch">
                        <button data-mode="lite" class="${this.state.mapMode === 'lite' ? 'active' : ''}">轻量模式</button>
                        <button data-mode="advanced" class="${this.state.mapMode === 'advanced' ? 'active' : ''}">高级模式</button>
                    </div>`
        )}
                ${createCard(
            settingTitle('type', '字体大小'),
            '调整世界仪表盘内所有文本的字体大小。',
            `<div class="tw-select-container">
                        <select id="font-size-select">
                            <option value="12px" ${this.state.fontSize === '12px' ? 'selected' : ''}>小</option>
                            <option value="14px" ${this.state.fontSize === '14px' ? 'selected' : ''}>默认</option>
                            <option value="16px" ${this.state.fontSize === '16px' ? 'selected' : ''}>中</option>
                            <option value="18px" ${this.state.fontSize === '18px' ? 'selected' : ''}>大</option>
                        </select>
                    </div>`
        )}
                ${createCard(
            settingTitle('layers', '面板透明度'),
            '调整面板背景的透明程度 (0-100%)。',
            `<div class="tw-slider-container" style="width: 100%;">
                        <input type="range" id="panel-opacity-slider" min="0" max="100" step="5" value="${this.state.panelOpacity ?? 50}">
                        <span id="panel-opacity-value" class="tw-slider-value">${this.state.panelOpacity ?? 50}%</span>
                    </div>`
        )}
                ${createCard(
            settingTitle('focus', '模糊程度'),
            '调整面板背景的模糊强度 (0-20px)。',
            `<div class="tw-slider-container" style="width: 100%;">
                        <input type="range" id="panel-blur-slider" min="0" max="20" step="1" value="${this.state.panelBlur ?? 12}">
                        <span id="panel-blur-value" class="tw-slider-value">${this.state.panelBlur ?? 12}px</span>
                    </div>`
        )}
            </div>
        `;

        // ==================== 分类 2: 酒馆 UI 注入 ====================
        const tavernUIContent = `
            ${categoryTitle('home', '酒馆 UI 注入', 'cat-tavern')}
            <div class="tw-settings-grid">
                ${createCard(
            settingTitle('sun', '动态背景'),
            '根据游戏内时间，将动态渐变色应用为酒馆背景。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="global-theme-toggle" ${this.state.isGlobalThemeEngineEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('eye', '沉浸模式'),
            '让聊天界面变为半透明的"毛玻璃"效果，透出动态背景。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="immersive-mode-toggle" ${this.state.isImmersiveModeEnabled ? 'checked' : ''} ${!this.state.isGlobalThemeEngineEnabled ? 'disabled' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('image', '动态插图背景'),
            '勾选后，场景插图将自动设为酒馆背景，无插图时回退天色。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="illustration-bg-toggle" ${this.state.isDynamicIllustrationBgEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
            </div>
        `;

        // ==================== 分类 3: 音效设置 ====================
        const audioContent = `
            ${categoryTitle('music', '音效设置', 'cat-audio')}
            <div class="tw-settings-grid">
                ${createCard(
            settingTitle('volume2', '开启音频'),
            '启用或禁用所有环境音和音效。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="audio-enabled-toggle" ${this.state.isAudioEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('volume1', '环境音音量'),
            '调整背景环境音的音量大小。',
            `<div class="tw-slider-container" style="width: 100%;">
                        <input type="range" id="ambient-volume-slider" min="0" max="1" step="0.05" value="${this.state.ambientVolume}">
                        <span id="ambient-volume-value" class="tw-slider-value">${Math.round(this.state.ambientVolume * 100)}%</span>
                    </div>`
        )}
                ${createCard(
            settingTitle('zap', '音效音量'),
            '调整动作和事件音效的音量大小。',
            `<div class="tw-slider-container" style="width: 100%;">
                        <input type="range" id="sfx-volume-slider" min="0" max="1" step="0.05" value="${this.state.sfxVolume}">
                        <span id="sfx-volume-value" class="tw-slider-value">${Math.round(this.state.sfxVolume * 100)}%</span>
                    </div>`
        )}
            </div>
        `;

        // ==================== 分类 4: 特效设置 ====================
        const effectsContent = `
            ${categoryTitle('sparkles', '特效设置', 'cat-effects')}
            <div class="tw-settings-grid">
                ${createCard(
            settingTitle('globe', '全屏显示特效'),
            '勾选后，雨、雪等粒子效果将在整个屏幕上显示。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="fx-global-toggle" ${this.state.isFxGlobal ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('droplets', '显示雨滴特效'),
            '在雨天时，模拟雨滴落在玻璃上的视觉效果。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="raindrop-fx-toggle" ${this.state.isRaindropFxOn ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('cloudRain', '天气粒子动画'),
            '勾选后显示雨滴、雪花、风等粒子动画效果。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="weather-fx-toggle" ${this.state.weatherFxEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('cpu', '3D高级特效'),
            '勾选后启用 3D 云、樱花、烟花等高消耗特效。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="high-performance-fx-toggle" ${this.state.isHighPerformanceFxEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('zap', '省电模式'),
            '开启后大幅减少粒子数量，提升低配设备性能。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="low-performance-mode-toggle" ${this.state.isLowPerformanceMode ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('sliders', '粒子密度'),
            `<span id="particle-density-value">${this.state.particleDensity}%</span>`,
            `<input type="range" class="tw-range-slider" id="particle-density-slider" 
                        min="10" max="100" step="5" value="${this.state.particleDensity}">`
        )}
                ${createCard(
            settingTitle('activity', '自动性能调节'),
            '检测到掉帧时自动降低粒子密度。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="auto-performance-toggle" ${this.state.isAutoPerformanceEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
                ${createCard(
            settingTitle('zap-off', '雷电效果'),
            '关闭后下雨打雷时不显示闪电效果。',
            `<label class="tw-checkbox">
                        <input type="checkbox" id="lightning-toggle" ${this.state.isLightningEnabled ? 'checked' : ''}>
                        <span class="tw-checkmark"></span>
                    </label>`
        )}
            </div>
        `;

        // ==================== 分类 5: 天色主题 ====================
        const themeTitle = `
            ${categoryTitle('palette', '天色主题', 'cat-theme')}
        `;

        // 组合所有内容
        const mainContent = `
            <div class="tw-settings-container">
                ${bookmarkNav}
                <div class="tw-settings-content" id="tw-settings-content-inner">
                    ${panelUIContent}
                    ${tavernUIContent}
                    ${audioContent}
                    ${effectsContent}
                    ${themeTitle}
                </div>
            </div>
        `;
        $pane.append(mainContent);

        // 获取内部容器引用
        const $contentInner = this.$('#tw-settings-content-inner');

        // 天色主题列表
        const $themeList = this.$('<div class="tw-theme-list"></div>');
        if (this.skyThemeController && this.skyThemeController.availableThemes) {
            this.skyThemeController.availableThemes.forEach(theme => {
                const isActive = this.state.activeSkyThemeId === theme.id;

                // 获取主题代表性渐变色（根据主题特性选择合适时段）
                let gradientColors = ['#38a3d1', '#90dffe']; // 默认蓝天色
                if (theme.gradients && theme.gradients.length > 0) {
                    let targetGradient;

                    // 根据主题名称/ID选择合适的时段
                    if (theme.id === 'legacy' || theme.name.includes('日落') || theme.name.includes('黄昏')) {
                        // 日落主题 → 取黄昏时段 (17-18时)
                        targetGradient = theme.gradients.find(g => g.hour >= 17 && g.hour <= 18.5);
                    } else if (theme.id === 'eternal_night' || theme.name.includes('夜') || theme.name.includes('暗')) {
                        // 夜晚主题 → 取午夜时段
                        targetGradient = theme.gradients.find(g => g.hour >= 0 && g.hour <= 4);
                    } else {
                        // 默认主题 → 取中午时段 (11-14时)
                        targetGradient = theme.gradients.find(g => g.hour >= 11 && g.hour <= 14);
                    }

                    // 如果没找到，取中间的渐变
                    if (!targetGradient) {
                        targetGradient = theme.gradients[Math.floor(theme.gradients.length / 2)];
                    }

                    if (targetGradient && targetGradient.colors) {
                        gradientColors = targetGradient.colors;
                    }
                }
                const gradientStyle = `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1] || gradientColors[0]})`;

                const $card = this.$(`
                    <div class="tw-theme-card ${isActive ? 'active' : ''}" data-theme-id="${theme.id}">
                        <div class="tw-theme-gradient-bar" style="background: ${gradientStyle};"></div>
                        <div class="tw-theme-card-content">
                            <h4>${theme.name}</h4>
                            <p>作者: ${theme.author}</p>
                            <div class="tw-theme-actions">
                                <button class="tw-btn-preview has-ripple">预览</button>
                                <button class="tw-btn-activate has-ripple">${isActive ? '当前' : '启用'}</button>
                            </div>
                        </div>
                    </div>
                `);
                $themeList.append($card);
            });
        }
        $contentInner.append($themeList);

        // 数据与管理区域
        const managementContent = this.$(`
            <div class="tw-settings-category-title" id="cat-data">
                ${getIcon('database', 'tw-category-icon')} 数据与管理
            </div>
            <div class="tw-settings-actions-grid">
                ${!this.mapSystem.mapDataManager.isInitialized() ? `
                    <button id="tw-create-map-btn" class="tw-action-btn primary has-ripple">
                        ${getIcon('folderPlus')} 创建地图档案
                    </button>
                ` : `
                    <button id="tw-reset-map-btn" class="tw-action-btn primary has-ripple">
                        ${getIcon('save')} 初始化地图
                    </button>
                `}
                
                <button id="reset-ui-btn" class="tw-action-btn has-ripple">
                    ${getIcon('move')} 重置UI位置
                </button>
                
                <button id="clear-all-data-btn" class="tw-action-btn danger has-ripple" style="grid-column: span 2;">
                    ${getIcon('trash2')} 清空所有存储
                </button>
            </div>
            
            ${this.mapSystem.mapDataManager.isInitialized() ? `
                <div style="margin: 10px 5px 0 5px; font-size: 0.8em; opacity: 0.6; text-align: center;">
                    当前地图: ${this.mapSystem.mapDataManager.bookName}
                </div>
            ` : ''}
        `);
        $contentInner.append(managementContent);
    }
}