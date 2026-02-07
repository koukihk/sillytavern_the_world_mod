/**
 * The World - HolidayDetector
 * @description 检测当前日期是否为节日并返回对应特效配置
 */
export class HolidayDetector {
    constructor() {
        // 节日配置
        this.holidays = [
            {
                id: 'christmas',
                name: '圣诞节',
                check: (date) => (date.getMonth() === 11 && date.getDate() >= 24 && date.getDate() <= 26),
                particles: ['❄️', '🎄', '🎁', '⭐'],
                colors: ['#ff0000', '#00ff00', '#ffffff', '#ffd700']
            },
            {
                id: 'new_year',
                name: '新年',
                check: (date) => {
                    const month = date.getMonth();
                    const day = date.getDate();
                    return (month === 11 && day === 31) || (month === 0 && day <= 2);
                },
                particles: ['🎉', '🎊', '✨', '🎆'],
                colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffffff']
            },
            {
                id: 'spring_festival',
                name: '春节',
                check: (date) => this._isSpringFestival(date),
                particles: ['🧧', '🏮', '🎊', '💰'],
                colors: ['#ff0000', '#ffd700', '#ff4500']
            },
            {
                id: 'valentine',
                name: '情人节',
                check: (date) => date.getMonth() === 1 && date.getDate() === 14,
                particles: ['❤️', '💕', '💖', '💗'],
                colors: ['#ff69b4', '#ff1493', '#ff6b6b']
            }
        ];
    }

    /**
     * 检测当前是否为节日
     * @param {Date} [date] - 可选的日期，默认为当前日期
     * @returns {Object|null} 节日配置对象或 null
     */
    detect(date = new Date()) {
        for (const holiday of this.holidays) {
            if (holiday.check(date)) {
                return holiday;
            }
        }
        return null;
    }

    /**
     * 获取节日粒子配置
     * @param {Date} [date] - 可选的日期
     * @returns {Object|null} 包含粒子和颜色的配置
     */
    getParticleConfig(date = new Date()) {
        const holiday = this.detect(date);
        if (!holiday) return null;

        return {
            id: holiday.id,
            name: holiday.name,
            particles: holiday.particles,
            colors: holiday.colors
        };
    }

    /**
     * 简化的春节检测（使用近似算法）
     * 春节通常在1月21日至2月20日之间
     */
    _isSpringFestival(date) {
        const month = date.getMonth();
        const day = date.getDate();

        // 简单近似：农历新年大约在公历1月下旬到2月中旬
        // 这里使用一个简化的范围检测
        if (month === 0) { // 1月
            return day >= 21;
        }
        if (month === 1) { // 2月
            return day <= 15;
        }
        return false;
    }
}
