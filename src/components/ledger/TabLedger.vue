<template>
    <div class="tab-root">
        <template v-if="loginStatus == true">
            <div class="page-head">
                <div>
                    <h1 class="page-title">장부</h1>
                    <p class="page-desc">은행에서 불러온 거래에 항·목·세목과 내용을 적습니다.</p>
                </div>
                <div class="acts" v-if="effectiveCanEdit">
                    <AddTransactionModal
                        ref="addTransactionModal"
                        @refresh="refreshLedger"
                        :filter-start-date=filterStartDate
                        :filter-end-date=filterEndDate>
                    </AddTransactionModal>
                </div>
                <p class="notice notice-warning closed-period-notice" v-else-if="canEdit && isCurrentPeriodClosed" role="status">
                    <i class="bi bi-lock-fill" aria-hidden="true"></i>
                    마감된 회계기간이라 고칠 수 없습니다
                </p>
            </div>

            <!--
                기간 고르기.
                예전에는 눌리는 자리가 div라 키보드로는 닿지 않았고,
                보고 있는 달도 글자 색으로만 알렸다.
            -->
            <div class="toolbar none-select" @keydown="onFilterKeydown">
                <div class="filter" role="toolbar" aria-label="기간 고르기" aria-orientation="horizontal">
                    <div class="date-filter" v-for="[year, months] in Object.entries(filterDateList)" :key="year">
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
                            @click="changeFilter(Number(year), month)"
                        >{{ month }}</button>
                        <button
                            type="button"
                            class="month is-all"
                            :class="{ active: isOn(year, 'all') }"
                            :tabindex="isOn(year, 'all') ? 0 : -1"
                            :aria-pressed="isOn(year, 'all') ? 'true' : 'false'"
                            :aria-label="`${year}년 전체`"
                            @click="changeFilter(Number(year), 'all')"
                        >전체</button>
                    </div>
                </div>
            </div>

            <LedgerTable
                v-if="filterStartDate && filterEndDate"
                ref="ledgerTable"
                @refresh="refreshAddTransactionModal"
                :filter-start-date=filterStartDate
                :filter-end-date=filterEndDate
                :canEdit="effectiveCanEdit">
            </LedgerTable>
        </template>
    </div>
</template>

<script>
import AddTransactionModal from './AddTransactionModal.vue';
import LedgerTable from './LedgerTable.vue';
import { nextTick } from "vue"
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
    props:['loginStatus', 'canEdit', 'initDate'],

    components: { LedgerTable, AddTransactionModal },

    data() {
        return {
            filterDateList: [],
            filterYear:null,
            filterMonth:null,
            filterStartDate:null,
            filterEndDate:null,
            closedPeriods: [],
            isCurrentPeriodClosed: false,
        }
    },


    computed: {
        effectiveCanEdit() {
            return this.canEdit && !this.isCurrentPeriodClosed;
        }
    },

    async created(){
        this.makeFilterDateList()
        await this.loadClosedPeriods()

        nextTick(() => {
            this.InitFilter()
        })

    },

    methods: {
        isOn(year, month) {
            return this.filterYear == year && this.filterMonth == month
        },

        /**
         * 달 고르개도 탭 자리 하나로 묶는다(roving tabindex).
         * 해가 두엇만 쌓여도 단추가 서른 개라, 장부까지 가는 데만 Tab을 서른 번 눌러야 했다.
         * 안에서는 방향키로 옮긴다.
         */
        onFilterKeydown(e) {
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

            // 옮기면 그 달을 바로 보여 준다. 고르기 위해 한 번 더 누르게 하지 않는다
            buttons[next].focus()
            buttons[next].click()
        },

        async loadClosedPeriods() {
            try {
                this.closedPeriods = await pb.collection('Periods').getFullList({
                    filter: 'is_closed = true',
                    requestKey: null
                });
            } catch (error) {
                console.error('Failed to load closed periods:', error);
                this.closedPeriods = [];
            }
        },

        checkPeriodClosed() {
            if (!this.filterStartDate || !this.filterEndDate) {
                this.isCurrentPeriodClosed = false;
                return;
            }

            // 현재 필터 범위가 마감된 기간과 겹치는지 확인
            this.isCurrentPeriodClosed = this.closedPeriods.some(period => {
                const periodStart = period.start_date;
                const periodEnd = period.end_date;
                // 기간이 겹치는지 확인: !(filterEnd < periodStart || filterStart > periodEnd)
                return !(this.filterEndDate < periodStart || this.filterStartDate > periodEnd);
            });
        },

        InitFilter(){
            const params = new URLSearchParams(window.location.search)

            const yearParam = params.get("filter_year")
            const monthParam = params.get("filter_month")

            if (/^\d+$/.test(yearParam) && monthParam) {
                const year = Number(yearParam)
                
                if (monthParam === 'all') {
                    this.changeFilter(year, 'all')
                    return
                }

                if (/^\d+$/.test(monthParam)) {
                    const month = Number(monthParam)

                    if (month >= 1 && month <= 12) {
                        this.changeFilter(year, month)
                        return
                    }
                }
            }

            const today = new Date()
            this.changeFilter(today.getFullYear(), today.getMonth() + 1)
        },

        refreshLedger() {
            this.$refs.ledgerTable.getLedger();
        },

        refreshAddTransactionModal(){
            nextTick(() => {
                if (this.$refs.addTransactionModal) {
                    this.$refs.addTransactionModal.getNotAddedTransactionList();
                } else {
                    console.warn("AddTransactionModal ref is null, skipping refresh.");
                }
            });
        },

        parseDate(num) {
            const s = num.toString()
            const y = parseInt(s.slice(0,4))
            const m = parseInt(s.slice(4,6)) - 1
            const d = parseInt(s.slice(6,8))
            const H = parseInt(s.slice(8,10))
            const M = parseInt(s.slice(10,12))
            return new Date(y, m, d, H, M)
        },

        formatDate(date) {
            const y = date.getFullYear()
            const m = String(date.getMonth()+1).padStart(2,'0')
            const d = String(date.getDate()).padStart(2,'0')
            const H = String(date.getHours()).padStart(2,'0')
            const M = String(date.getMinutes()).padStart(2,'0')
            return parseInt(`${y}${m}${d}${H}${M}`)
        },

        makeFilterDateList() {
            const start = this.parseDate(this.initDate)
            const now = new Date()

            const list = {}
            for (let year = start.getFullYear(); year <= now.getFullYear(); year++) {
                list[year] = []
            }

            let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 1)

            while (cursor <= end) {
                const year = cursor.getFullYear()
                const month = cursor.getMonth() + 1
                
                if (!list[year]) list[year] = []
                
                list[year].push(month)
                
                cursor = new Date(year, cursor.getMonth() + 1, 1)
            }

            this.filterDateList = list
        },

        changeFilter(year, month) {
            let firstDay, lastDay;

            if (month === 'all') {
                firstDay = new Date(year, 0, 1, 0, 0); // 해당 연도의 1월 1일 00:00
                lastDay = new Date(year, 12, 0, 23, 59); // 해당 연도의 12월 31일 23:59 (다음 해 1월 0일)
            } else {
                firstDay = new Date(year, month - 1, 1, 0, 0);
                lastDay = new Date(year, month, 0, 23, 59);
            }

            this.filterStartDate = this.formatDate(firstDay);
            this.filterEndDate = this.formatDate(lastDay);

            this.filterYear = year;
            this.filterMonth = month;

            // 마감된 기간인지 확인
            this.checkPeriodClosed();

            const params = new URLSearchParams(window.location.search);
            params.set("filter_year", year);
            params.set("filter_month", month);
            window.history.replaceState({}, "", `${window.location.pathname}?${params}`);

            this.$nextTick(() => {
                this.refreshLedger();
            });
        }

    }
}

</script>

<style scoped>
.tab-root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
}

.closed-period-notice {
    margin: 0;
}

.toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
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
    min-width: 38px;
    min-height: 32px;
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

[data-theme="dark"] .month.active {
    background-color: var(--primary-500);
    border-color: var(--primary-500);
}

[data-theme="dark"] .month.active:hover {
    background-color: var(--primary-400);
    color: var(--primary-950);
}
</style>
