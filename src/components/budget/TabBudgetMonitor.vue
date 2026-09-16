<template>
<div class="tab-root none-select">
    <div class="content-area">
    <template v-if="loginStatus === true">

        <div class="page-head no-print">
            <div>
                <h1 class="page-title">예산현황</h1>
                <p class="page-desc">정한 예산을 얼마나 썼는지 기간별로 봅니다.</p>
            </div>
        </div>

        <div class="FILTER">
            <div class="filter-line" v-if="periodList.length > 0">
                <label class="filter-label" for="monitor-period">회계기간</label>
                <select id="monitor-period" v-model="selectedPeriodId" @change="onPeriodChange">
                    <option v-for="period in periodList" :key="period.id" :value="period.id">
                        {{ period.name }}
                    </option>
                </select>
            </div>

            <button
                type="button"
                class="btn btn-primary download-btn"
                @click="downloadReportPDF"
                :disabled="!budgetReportReady"
            >
                <i class="bi bi-file-earmark-arrow-down" aria-hidden="true"></i>
                PDF로 받기
            </button>
        </div>

        <div class="VIEWER" v-if="budgetReportReady" id="report-content">
            <BudgetMonitorPage
                :selectedPeriod="selectedPeriod"
                :budgetList="budgetList"
                :ledgerList="budgetLedgerList"
                :hangList="hangList"
                :mokList="mokList"
                :saemokList="saemokList"
            />
        </div>

        <p class="empty" v-else-if="periodList.length === 0" role="status">
            <i class="bi bi-calendar-x" aria-hidden="true"></i>
            아직 정한 회계기간이 없습니다.
            <span class="hint">예산 탭에서 기간을 먼저 정해 주세요.</span>
        </p>

        <p class="empty" v-else role="status">
            <i class="bi bi-hourglass-split" aria-hidden="true"></i>
            불러오는 중입니다…
        </p>
    </template>
    </div>
</div>
</template>

<script>
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

import BudgetMonitorPage from '../report/BudgetMonitorPage.vue';

export default {
    props: ['loginStatus'],

    components: { BudgetMonitorPage },

    data() {
        return {
            periodList: [],
            selectedPeriodId: null,
            budgetList: [],
            saemokList: [],
            budgetLedgerList: [],
            hangList: [],
            mokList: [],
        }
    },

    computed: {
        selectedPeriod() {
            if (!this.selectedPeriodId) return null;
            return this.periodList.find(p => p.id === this.selectedPeriodId);
        },

        budgetReportReady() {
            return this.selectedPeriod && this.budgetList.length > 0;
        }
    },

    created() {
        this.loadPeriods();
        this.loadAssets();
    },

    methods: {
        async downloadReportPDF() {
            if (!this.budgetReportReady) {
                alert('예산현황 데이터가 준비되지 않았습니다.');
                return;
            }
            window.print();
        },

        async loadAssets() {
            try {
                const [hangs, moks, saemoks] = await Promise.all([
                    pb.collection('AssetsHang').getFullList({ sort: 'priority', requestKey: null }),
                    pb.collection('AssetsMok').getFullList({ sort: 'priority', requestKey: null }),
                    pb.collection('AssetsSaemok').getFullList({ sort: 'priority', requestKey: null })
                ]);
                this.hangList = hangs;
                this.mokList = moks;
                this.saemokList = saemoks;
            } catch (error) {
                console.error('Failed to load assets:', error);
            }
        },

        async loadPeriods() {
            try {
                this.periodList = await pb.collection('Periods').getFullList({
                    sort: '-start_date',
                    requestKey: null
                });
                if (this.periodList.length > 0) {
                    this.selectedPeriodId = this.periodList[0].id;
                    this.loadBudgetData();
                }
            } catch (error) {
                console.error('Failed to load periods:', error);
            }
        },

        async loadBudgetData() {
            if (!this.selectedPeriodId || !this.selectedPeriod) return;

            try {
                const startDT = this.selectedPeriod.start_date;
                const endDT = this.selectedPeriod.end_date;

                const [budgets, ledgers] = await Promise.all([
                    pb.collection('PeriodAndBudget').getFullList({
                        filter: `field="${this.selectedPeriodId}"`,
                        requestKey: null
                    }),
                    pb.collection('Ledger').getFullList({
                        filter: `transaction.datetime >= ${startDT} && transaction.datetime <= ${endDT}`,
                        expand: 'transaction',
                        requestKey: null
                    })
                ]);

                this.budgetList = budgets;
                this.budgetLedgerList = ledgers;
            } catch (error) {
                console.error('Failed to load budget data:', error);
            }
        },

        onPeriodChange() {
            this.loadBudgetData();
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

.content-area {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
}

.FILTER {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    flex-wrap: wrap;
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-sm);
}

.filter-line {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: wrap;
}

.filter-label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
}

.FILTER select {
    min-height: 36px;
    padding: 0 var(--spacing-3);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.FILTER select:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .FILTER select:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.VIEWER {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-5);
    padding: var(--spacing-5);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
    overflow: auto;
}

.empty .hint {
    display: block;
}

@media (max-width: 768px) {
    .FILTER {
        align-items: stretch;
        flex-direction: column;
        padding: var(--spacing-4);
    }

    .VIEWER {
        padding: var(--spacing-2);
    }
}
</style>
