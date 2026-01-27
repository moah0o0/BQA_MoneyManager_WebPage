<template>
    <div class="main-content">
        <template v-if="loginStatus == true">
            <div class="toolbar none-select">
                <div class="filter">
                    <div class="date-filter" v-if="filterDateList" v-for="[year, months] in Object.entries(filterDateList)">
                        <div class="year">{{ year }}년</div>
                        <div :class="filterYear == year && filterMonth == month ? 'month active' : 'month'" 
                                v-for="month in months"
                                @click="changeFilter(year, month)">
                            {{ month }}월
                        </div>
                        <div :class="filterYear == year && filterMonth == 'all' ? 'month active' : 'month'" 
                                @click="changeFilter(year, 'all')">
                            전체
                        </div>
                    </div>
                </div>
                <div class="action" v-if="effectiveCanEdit">
                    <AddTransactionModal
                        ref="addTransactionModal"
                        @refresh="refreshLedger"
                        :filter-start-date=filterStartDate
                        :filter-end-date=filterEndDate>
                    </AddTransactionModal>
                </div>
                <div class="closed-period-notice" v-else-if="canEdit && isCurrentPeriodClosed">
                    <i class="bi bi-lock-fill"></i> 마감된 회계기간입니다
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

        <template v-if="loginStatus == false">
            <div class="toolbar disable"></div>
            <div class="content disable"></div>
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
.none-select {
  user-select: none;
  -moz-user-select: none;
  -webkit-user-drag: none;
}

.main-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom:50px;
}

.toolbar {
    width: 100%;
    min-height: 50px;
    
    display: flex;
    flex-direction: row;
}

.toolbar > .filter {
    flex:1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 15px;
}

.toolbar > .filter > .date-filter { 
    display: flex;
    flex-direction: row;
    gap:2px;
    align-items: start; 
}

.toolbar > .filter > .date-filter > .year {
    font-size: 15px;
    font-weight: 700;

    width: 65px;
    padding: 4px 0;
    border-radius: 6px;

    color: var(--strong-color);

    text-align: center;
}

.toolbar > .filter > .date-filter > .month {
    cursor: pointer;
    font-size: 15px;
    width: 45px;
    padding: 4px 0;
    text-align: center;

    border-radius: 6px;
    background-color: transparent;
    transition: all 0.2s ease;
}

.toolbar > .filter > .date-filter > .month:hover {
    background-color: var(--light-color);
    border-color: var(--strong-color);
    color: var(--strong-color);
}

.toolbar > .filter > .date-filter > .month.active {
    color: var(--primary-color);
    font-weight: 600;
}

.toolbar > .action {
    flex:1;
    display: flex;
    flex-direction: column;
    align-items: end;
}

.closed-period-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--danger-50);
    color: var(--danger-600);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
}


.content {
    width: 100%;
    min-height: 730px;
}

.toolbar.disable,
.content.disable {
    background-color: var(--bg-primary);
    box-shadow: var(--shadow-sm);
    border-radius: var(--border-radius-md);
}

/* 다크모드 */
[data-theme="dark"] .toolbar > .filter > .date-filter > .year {
    color: var(--text-primary);
}

[data-theme="dark"] .toolbar > .filter > .date-filter > .month:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

[data-theme="dark"] .toolbar > .filter > .date-filter > .month.active {
    color: var(--primary-400);
}

[data-theme="dark"] .closed-period-notice {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger-400);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        gap: 15px;
    }

    .toolbar > .filter > .date-filter {
        flex-wrap: wrap;
    }

    .toolbar > .filter > .date-filter > .year {
        width: 55px;
        font-size: 14px;
    }

    .toolbar > .filter > .date-filter > .month {
        width: 40px;
        font-size: 14px;
    }

    .toolbar > .action {
        align-items: stretch;
    }
}
</style>