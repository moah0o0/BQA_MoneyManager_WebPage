<template>
<!--
    기간 고르기. 장부와 거래내역이 함께 쓴다.

    예전에는 눌리는 자리가 div라 키보드로는 닿지 않았고, 보고 있는 달도 글자 색으로만 알렸다.
    해가 두엇만 쌓여도 단추가 서른 개라, 다음 것으로 가는 데만 Tab을 서른 번 눌러야 했다.
    그래서 탭 자리는 하나로 묶고(roving tabindex) 안에서는 방향키로 옮긴다.
-->
<div class="period-filter none-select" @keydown="onKeydown">
    <div class="filter" role="toolbar" aria-label="기간 고르기" aria-orientation="horizontal">
        <div class="date-filter" v-for="[year, months] in Object.entries(dateList)" :key="year">
            <span class="year num">{{ year }}</span>
            <button
                v-for="month in months"
                :key="month"
                type="button"
                class="month num"
                :class="{ active: isOn(year, month) }"
                :tabindex="isOn(year, month) ? 0 : -1"
                :aria-pressed="isOn(year, month) ? 'true' : 'false'"
                :aria-label="`${year}년 ${month}월`"
                @click="choose(Number(year), month)"
            >{{ month }}</button>
            <button
                type="button"
                class="month is-all"
                :class="{ active: isOn(year, 'all') }"
                :tabindex="isOn(year, 'all') ? 0 : -1"
                :aria-pressed="isOn(year, 'all') ? 'true' : 'false'"
                :aria-label="`${year}년 전체`"
                @click="choose(Number(year), 'all')"
            >전체</button>
        </div>
    </div>
</div>
</template>

<script>
export default {
    props: {
        /** 단체가 공금을 관리하기 시작한 날 (YYYYMMDDHHmm) */
        initDate: { required: true },
    },

    emits: ['change'],

    data() {
        return {
            dateList: {},
            year: null,
            month: null,
        }
    },

    created() {
        this.makeDateList()
        this.initFromUrl()
    },

    methods: {
        isOn(year, month) {
            return this.year == year && this.month == month
        },

        /**
         * 달 고르개 안에서는 방향키로 옮긴다.
         * 옮기면 그 달을 바로 보여 준다 — 고르기 위해 한 번 더 누르게 하지 않는다.
         */
        onKeydown(e) {
            const KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
            if (!KEYS.includes(e.key)) return

            const buttons = [...e.currentTarget.querySelectorAll('button.month')]
            const here = buttons.indexOf(e.target)
            if (here < 0) return

            e.preventDefault()

            let next = here
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = here + 1
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = here - 1
            else if (e.key === 'Home') next = 0
            else if (e.key === 'End') next = buttons.length - 1

            // 끝에서 끝으로 돌아온다 — 막다른 길을 만들지 않는다
            if (next < 0) next = buttons.length - 1
            else if (next >= buttons.length) next = 0

            buttons[next].focus()
            buttons[next].click()
        },

        parseDate(num) {
            const s = num.toString()
            return new Date(
                parseInt(s.slice(0, 4)),
                parseInt(s.slice(4, 6)) - 1,
                parseInt(s.slice(6, 8)),
                parseInt(s.slice(8, 10)),
                parseInt(s.slice(10, 12)),
            )
        },

        formatDate(date) {
            const p = (n) => String(n).padStart(2, '0')
            return parseInt(
                `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}`
            )
        },

        makeDateList() {
            const start = this.parseDate(this.initDate)
            const now = new Date()

            const list = {}
            for (let year = start.getFullYear(); year <= now.getFullYear(); year += 1) list[year] = []

            let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 1)

            while (cursor <= end) {
                const year = cursor.getFullYear()
                if (!list[year]) list[year] = []
                list[year].push(cursor.getMonth() + 1)
                cursor = new Date(year, cursor.getMonth() + 1, 1)
            }

            this.dateList = list
        },

        /** 주소에 적힌 기간이 있으면 그대로 연다 — 링크를 건네면 같은 화면이 열려야 한다 */
        initFromUrl() {
            const params = new URLSearchParams(window.location.search)
            const yearParam = params.get('filter_year')
            const monthParam = params.get('filter_month')

            if (/^\d+$/.test(yearParam) && monthParam) {
                const year = Number(yearParam)

                if (monthParam === 'all') {
                    this.choose(year, 'all')
                    return
                }

                if (/^\d+$/.test(monthParam)) {
                    const month = Number(monthParam)
                    if (month >= 1 && month <= 12) {
                        this.choose(year, month)
                        return
                    }
                }
            }

            const today = new Date()
            this.choose(today.getFullYear(), today.getMonth() + 1)
        },

        choose(year, month) {
            let firstDay
            let lastDay

            if (month === 'all') {
                firstDay = new Date(year, 0, 1, 0, 0)
                lastDay = new Date(year, 12, 0, 23, 59)
            } else {
                firstDay = new Date(year, month - 1, 1, 0, 0)
                lastDay = new Date(year, month, 0, 23, 59)
            }

            this.year = year
            this.month = month

            const params = new URLSearchParams(window.location.search)
            params.set('filter_year', year)
            params.set('filter_month', month)
            window.history.replaceState({}, '', `${window.location.pathname}?${params}`)

            this.$emit('change', {
                year,
                month,
                startDate: this.formatDate(firstDay),
                endDate: this.formatDate(lastDay),
            })
        },
    },
}
</script>

<style scoped>
.period-filter {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    flex-shrink: 0;
}

.none-select {
    user-select: none;
    -webkit-user-select: none;
}

.filter {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
}

.date-filter {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-1);
    flex-wrap: wrap;
}

.date-filter > .year {
    min-width: 48px;
    padding-right: var(--spacing-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-bold);
    color: var(--text-secondary);
}

.date-filter > .year::after {
    content: '년';
    margin-left: 1px;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    color: var(--text-muted);
}

.month {
    min-width: 36px;
    min-height: 28px;
    padding: 0 var(--spacing-2);
    border: 1px solid transparent;
    border-radius: var(--border-radius-md);
    background-color: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.month.is-all {
    min-width: 46px;
}

.month:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
}

/* 보고 있는 달은 칠해서 알린다 — 글자 색만 바꾸면 눈에 걸리지 않는다 */
.month.active {
    background-color: var(--primary-600);
    border-color: var(--primary-600);
    color: #fff;
    font-weight: var(--font-weight-bold);
}

.month.active:hover {
    background-color: var(--primary-700);
}

[data-theme="dark"] .month.active {
    background-color: var(--primary-500);
    border-color: var(--primary-500);
}

@media (max-width: 768px) {
    .date-filter > .year {
        width: 100%;
        min-width: auto;
    }

    .month {
        min-width: 40px;
        min-height: 38px;
    }
}
</style>
