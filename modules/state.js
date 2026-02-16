/**
 * The World - State Management
 * @description A simple, centralized object to hold the application's state.
 */
export const TheWorldState = {
    // --- Data from AI ---
    latestMapData: null,
    latestWorldStateData: {
        "时间": "00:00",
        "天气": "晴",
        "地点": "未知",
        "季节": "春",
        "人物": [],
        "氛围": "平静",
        "光照": "正常"
    },

    // --- UI State ---
    isPanelVisible: false,
    selectedMainLocation: null,
    selectedSubLocation: null,
    panelWidth: 450,
    panelHeight: null,
    panelTop: 60,
    panelLeft: null,
    buttonTop: 65,
    buttonLeft: null,
    liteMapPathStack: [], // For lite map navigation state
    advancedMapPathStack: [], // For advanced map navigation state
    currentPlayerLocationId: null, // NEW: For Macro API
    lorebookTransactionHistory: {}, // Tracks lorebook changes by message_id for rollback

    // --- Settings State ---
    activeSkyThemeId: 'default', // NEW: To store the selected sky theme
    isGlobalThemeEngineEnabled: false, // New state for the global feature
    isFxGlobal: false,
    isImmersiveModeEnabled: false, // New toggle for the "glass" effect
    isDynamicIllustrationBgEnabled: false, // Dynamic illustration background toggle
    isRaindropFxOn: false,
    weatherFxEnabled: true,
    isHighPerformanceFxEnabled: true,
    isLowPerformanceMode: false, // 省电模式：大幅减少粒子数量提升性能
    particleDensity: 100, // 粒子密度 0-100
    isAutoPerformanceEnabled: true, // 自动性能调节
    isLightningEnabled: true, // 雷电效果开关
    locationFxEnabled: true,
    celestialFxEnabled: true,
    isSkygazingModeActive: false,
    hasLoadedBefore: false,
    fontSize: '14px',
    panelOpacity: 50, // Panel transparency 0-100
    panelBlur: 12, // Panel blur 0-20px
    mapMode: 'advanced', // 'lite' or 'advanced'
    fontColor: '', // Custom font color for panel text (empty = default)

    // --- Audio Settings ---
    isAudioEnabled: true,
    ambientVolume: 0.5,
    sfxVolume: 0.8,
};