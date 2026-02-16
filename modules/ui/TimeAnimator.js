/**
 * The World - Time Animator
 * @description Creates the illusion of passing time by animating seconds.
 */
export class TimeAnimator {
    constructor({ $, win }) {
        this.$ = $;
        this.win = win;
        this.intervalId = null;
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
    }

    start(timeString) {
        this.stop();
        const match = timeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (match) {
            this.hours = parseInt(match[1], 10);
            this.minutes = parseInt(match[2], 10);
            this.seconds = parseInt(match[3], 10) || 0;
            this.intervalId = setInterval(() => this._tick(), 1000);
            this._updateDisplay();
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    _tick() {
        this.seconds++;
        if (this.seconds >= 60) {
            this.seconds = 0;
            this.minutes++;
            if (this.minutes >= 60) {
                this.minutes = 0;
                this.hours++;
                if (this.hours >= 24) {
                    this.hours = 0;
                }
            }
        }
        this._updateDisplay();

        // NEW: Emit a custom event with the current time
        this.$(this.win.document).trigger('tw-time-tick', {
            hours: this.hours,
            minutes: this.minutes,
            seconds: this.seconds
        });
    }

    _updateDisplay() {
        const $target = this.$('#tw-time-display-main');
        if (!$target.length || !$target.is(':visible')) return;

        const h = String(this.hours).padStart(2, '0');
        const m = String(this.minutes).padStart(2, '0');
        const s = String(this.seconds).padStart(2, '0');

        // 检查子元素是否已存在，避免每秒用 .html() 整体替换 DOM
        const $seconds = $target.find('.tw-time-animator-seconds');
        if ($seconds.length) {
            // 只更新秒数部分（最频繁变化的）
            $seconds.text(`:${s}`);
            // 分钟和小时只在秒数归零时才可能变化，在 _tick 中已处理
            if (this.seconds === 0) {
                $target.find('.tw-time-animator-minutes').text(`:${m}`);
                $target.find('.tw-time-animator-hours').text(h);
            }
        } else {
            // 首次渲染，创建完整结构
            const timeHtml = `<span class="tw-time-animator-hours">${h}</span><span class="tw-time-animator-minutes">:${m}</span><span class="tw-time-animator-seconds">:${s}</span>`;
            $target.html(timeHtml);
        }
    }
}