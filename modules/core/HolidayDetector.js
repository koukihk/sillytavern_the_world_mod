/**
 * The World - HolidayDetector
 * @description 检测游戏内日期是否为节日并返回对应特效配置
 */
export class HolidayDetector {
    constructor() {
        // 节日配置 - 使用月份(1-12)和日期(1-31)
        this.holidays = [
            {
                id: 'christmas',
                name: '圣诞节',
                check: (month, day) => (month === 12 && day >= 24 && day <= 26),
                particles: ['❄️', '🎄', '🎁', '⭐'],
                colors: ['#ff0000', '#00ff00', '#ffffff', '#ffd700']
            },
            {
                id: 'new_year',
                name: '新年',
                check: (month, day) => (month === 12 && day === 31) || (month === 1 && day <= 2),
                particles: ['🎉', '🎊', '✨', '🎆'],
                colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffffff']
            },
            {
                id: 'spring_festival',
                name: '春节',
                check: (month, day) => (month === 1 && day >= 21) || (month === 2 && day <= 15),
                particles: ['🧧', '🏮', '🎊', '💰'],
                colors: ['#ff0000', '#ffd700', '#ff4500']
            },
            {
                id: 'valentine',
                name: '情人节',
                check: (month, day) => month === 2 && day === 14,
                particles: ['❤️', '💕', '💖', '💗'],
                colors: ['#ff69b4', '#ff1493', '#ff6b6b']
            }
        ];
    }

    /**
     * 从游戏时间字符串解析月份和日期
     * @param {string} timeString - 游戏时间字符串，如 "202X年6月15日 16:45:17"
     * @returns {{month: number, day: number}|null}
     */
    parseGameDate(timeString) {
        if (!timeString) return null;

        const match = timeString.match(/(\d{4})[年-]?.*?(\d{1,2})[月-](\d{1,2})[日-]?/);
        if (match) {
            return {
                month: parseInt(match[2], 10),
                day: parseInt(match[3], 10)
            };
        }
        return null;
    }

    /**
     * 检测是否为节日
     * @param {string} timeString - 游戏时间字符串
     * @returns {Object|null} 节日配置对象或 null
     */
    detect(timeString) {
        const gameDate = this.parseGameDate(timeString);
        if (!gameDate) return null;

        for (const holiday of this.holidays) {
            if (holiday.check(gameDate.month, gameDate.day)) {
                return holiday;
            }
        }
        return null;
    }

    /**
     * 获取节日粒子配置
     * @param {string} timeString - 游戏时间字符串
     * @returns {Object|null} 包含粒子和颜色的配置
     */
    getParticleConfig(timeString) {
        const holiday = this.detect(timeString);
        if (!holiday) return null;

        return {
            id: holiday.id,
            name: holiday.name,
            particles: holiday.particles,
            colors: holiday.colors
        };
    }
}
