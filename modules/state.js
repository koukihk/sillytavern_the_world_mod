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
    buttonTop: 10,
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
    locationFxEnabled: true,
    celestialFxEnabled: true,
    isSkygazingModeActive: false,
    hasLoadedBefore: false,
    fontSize: '14px',
    panelOpacity: 50, // Panel transparency 0-100
    panelBlur: 12, // Panel blur 0-20px
    mapMode: 'advanced', // 'lite' or 'advanced'

    // --- Audio Settings ---
    isAudioEnabled: true,
    ambientVolume: 0.5,
    sfxVolume: 0.8,
};