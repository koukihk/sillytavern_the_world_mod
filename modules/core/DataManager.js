/**
 * The World - DataManager
 * @description Handles saving and loading state to/from localStorage.
 */
export class DataManager {
    constructor({ config, state, logger }) {
        this.config = config;
        this.state = state;
        this.logger = logger;
    }

    _storage(action, key, data = null) {
        try {
            if (action === 'save') {
                localStorage.setItem(key, JSON.stringify(data));
            } else if (action === 'load') {
                const saved = localStorage.getItem(key);
                return saved ? JSON.parse(saved) : null;
            } else if (action === 'clear') {
                localStorage.removeItem(key);
            }
        } catch (e) {
            this.logger.error(`存储操作失败 (${action} on ${key}):`, e);
            return null;
        }
    }

    loadState() {
        this.logger.log('正在从 localStorage 加载状态...');
        const loadedWorldState = this._storage('load', this.config.STORAGE_KEYS.WORLD_STATE);
        if (loadedWorldState) {
            this.state.latestWorldStateData = loadedWorldState;
        }
        // Only load map data if it exists, otherwise keep it null
        this.state.latestMapData = this._storage('load', this.config.STORAGE_KEYS.MAP_DATA);
        const settings = this._storage('load', this.config.STORAGE_KEYS.SETTINGS) || {};
        this.logger.log('加载到的设置:', settings);

        // A helper to safely assign settings
        const assignSetting = (key, defaultValue) => {
            this.state[key] = settings[key] !== undefined ? settings[key] : defaultValue;
        };

        assignSetting('isPanelVisible', this.state.isPanelVisible);
        assignSetting('activeSkyThemeId', this.state.activeSkyThemeId);
        assignSetting('isGlobalThemeEngineEnabled', this.state.isGlobalThemeEngineEnabled);
        assignSetting('isFxGlobal', this.state.isFxGlobal);
        assignSetting('isImmersiveModeEnabled', this.state.isImmersiveModeEnabled);
        assignSetting('isDynamicIllustrationBgEnabled', this.state.isDynamicIllustrationBgEnabled);
        assignSetting('isGoogleMapEnabled', this.state.isGoogleMapEnabled);
        assignSetting('isRaindropFxOn', this.state.isRaindropFxOn);
        assignSetting('weatherFxEnabled', this.state.weatherFxEnabled);
        assignSetting('isHighPerformanceFxEnabled', this.state.isHighPerformanceFxEnabled);
        assignSetting('isLowPerformanceMode', this.state.isLowPerformanceMode);
        assignSetting('particleDensity', this.state.particleDensity);
        assignSetting('isAutoPerformanceEnabled', this.state.isAutoPerformanceEnabled);
        assignSetting('isLightningEnabled', this.state.isLightningEnabled);
        assignSetting('locationFxEnabled', this.state.locationFxEnabled);
        assignSetting('celestialFxEnabled', this.state.celestialFxEnabled);
        assignSetting('panelWidth', this.state.panelWidth);
        assignSetting('panelHeight', this.state.panelHeight);
        assignSetting('panelTop', this.state.panelTop);
        assignSetting('panelLeft', this.state.panelLeft);
        assignSetting('hasLoadedBefore', this.state.hasLoadedBefore);
        assignSetting('fontSize', this.state.fontSize);
        assignSetting('panelOpacity', this.state.panelOpacity);
        assignSetting('panelBlur', this.state.panelBlur);
        assignSetting('mapMode', this.state.mapMode);
        assignSetting('isAudioEnabled', this.state.isAudioEnabled);
        assignSetting('ambientVolume', this.state.ambientVolume);
        assignSetting('sfxVolume', this.state.sfxVolume);
        assignSetting('audioCdnBaseUrl', this.state.audioCdnBaseUrl);
        assignSetting('whiteNoiseEnabled', this.state.whiteNoiseEnabled);
        assignSetting('whiteNoiseTrack', this.state.whiteNoiseTrack);
        assignSetting('fontColor', this.state.fontColor);
    }

    saveState() {
        this.logger.log('正在将状态保存到 localStorage...');
        this._storage('save', this.config.STORAGE_KEYS.WORLD_STATE, this.state.latestWorldStateData);
        this._storage('save', this.config.STORAGE_KEYS.MAP_DATA, this.state.latestMapData);

        const settings = {
            isPanelVisible: this.state.isPanelVisible,
            activeSkyThemeId: this.state.activeSkyThemeId,
            isGlobalThemeEngineEnabled: this.state.isGlobalThemeEngineEnabled,
            isFxGlobal: this.state.isFxGlobal,
            isImmersiveModeEnabled: this.state.isImmersiveModeEnabled,
            isDynamicIllustrationBgEnabled: this.state.isDynamicIllustrationBgEnabled,
            isGoogleMapEnabled: this.state.isGoogleMapEnabled,
            isRaindropFxOn: this.state.isRaindropFxOn,
            weatherFxEnabled: this.state.weatherFxEnabled,
            isHighPerformanceFxEnabled: this.state.isHighPerformanceFxEnabled,
            isLowPerformanceMode: this.state.isLowPerformanceMode,
            particleDensity: this.state.particleDensity,
            isAutoPerformanceEnabled: this.state.isAutoPerformanceEnabled,
            isLightningEnabled: this.state.isLightningEnabled,
            locationFxEnabled: this.state.locationFxEnabled,
            celestialFxEnabled: this.state.celestialFxEnabled,
            panelWidth: this.state.panelWidth,
            panelHeight: this.state.panelHeight,
            panelTop: this.state.panelTop,
            panelLeft: this.state.panelLeft,
            hasLoadedBefore: this.state.hasLoadedBefore,
            fontSize: this.state.fontSize,
            panelOpacity: this.state.panelOpacity,
            panelBlur: this.state.panelBlur,
            mapMode: this.state.mapMode,
            isAudioEnabled: this.state.isAudioEnabled,
            ambientVolume: this.state.ambientVolume,
            sfxVolume: this.state.sfxVolume,
            audioCdnBaseUrl: this.state.audioCdnBaseUrl,
            whiteNoiseEnabled: this.state.whiteNoiseEnabled,
            whiteNoiseTrack: this.state.whiteNoiseTrack,
            fontColor: this.state.fontColor,
        };
        this.logger.log('正在保存的设置:', settings);
        this._storage('save', this.config.STORAGE_KEYS.SETTINGS, settings);
    }

    clearAllStorage() {
        this.logger.warn('正在清空所有本地存储数据！');
        Object.values(this.config.STORAGE_KEYS).forEach(key => this._storage('clear', key));

        // Reset state to defaults
        this.state.latestMapData = null;
        // Do NOT reset latestWorldStateData to null, let it keep its default structure
        this.state.isPanelVisible = false;
        this.state.selectedMainLocation = null;
        this.state.selectedSubLocation = null;
        this.state.hasLoadedBefore = false;

        // Re-load to apply default settings
        this.loadState();
    }
}
