<template>
<div class="main-content none-select">
    <div class="content-area">
    <template v-if="loginStatus === true">

        <div class="FILTER">
            <span class="filter-title">예산현황</span>

            <div class="period-selector" v-if="periodList.length > 0">
                <select v-model="selectedPeriodId" @change="onPeriodChange">
                    <option v-for="period in periodList" :key="period.id" :value="period.id">
                        {{ period.name }}
                    </option>
                </select>
            </div>

            <button
                class="download-btn"
                @click="downloadReportPDF"
                :disabled="!budgetReportReady"
            >
                <i class="bi bi-cloud-arrow-down-fill"></i>
                PDF 다운로드
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

        <div class="empty-state" v-else-if="periodList.length === 0">
            <i class="bi bi-calendar-x"></i>
            <p>등록된 회계기간이 없습니다.</p>
            <p class="sub">예산 탭에서 회계기간을 먼저 등록해주세요.</p>
        </div>

        <div class="empty-state" v-else>
            <i class="bi bi-hourglass-split"></i>
            <p>데이터를 불러오는 중...</p>
        </div>
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
.content-area {
    display: flex;
    flex-direction: column;
    gap: 30px;
    height: 100%;
    max-height: 1050px;
}

.FILTER {
    width: 100%;
    height: auto;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

    display: flex;
    align-items: center;
    padding: 15px 25px;
    gap: 20px;
    box-sizing: border-box;
}

.filter-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--strong-color, #333);
    padding-right: 20px;
    border-right: 1px solid var(--medium-color, #ccc);
}

.VIEWER {
    width: 100%;
    flex-grow: 1;
    background-color: var(--medium-color);

    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 0;
    overflow-y: auto;
}

.download-btn {
    margin-left: auto;
    padding: 10px 18px;
    border: none;
    border-radius: 6px;
    background-color: var(--primary-color);
    color: white;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;

    display: flex;
    gap: 8px;
}

.download-btn:hover:not(:disabled) {
    background-color: var(--none-color);
    color: var(--primary-color);
}

.download-btn:disabled {
    background-color: var(--medium-color);
    cursor: not-allowed;
}

.period-selector {
    display: flex;
    align-items: center;
}

.period-selector select {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--medium-color);
    background-color: var(--none-color);
    font-size: 15px;
    color: var(--strong-color);
    cursor: pointer;
}

.period-selector select:focus {
    border-color: var(--primary-color);
    outline: none;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--medium-color);
    text-align: center;
}

.empty-state i {
    font-size: 48px;
    margin-bottom: 20px;
}

.empty-state p {
    margin: 5px 0;
    font-size: 16px;
}

.empty-state p.sub {
    font-size: 14px;
    opacity: 0.8;
}

/* 다크모드 */
[data-theme="dark"] .FILTER {
    background-color: var(--bg-primary);
    box-shadow: var(--shadow-md);
}

[data-theme="dark"] .filter-title {
    color: var(--text-primary);
    border-right-color: var(--border-color);
}

[data-theme="dark"] .period-selector select {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

[data-theme="dark"] .period-selector select:focus {
    border-color: var(--primary-500);
}

[data-theme="dark"] .download-btn {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
}

[data-theme="dark"] .download-btn:hover:not(:disabled) {
    background: var(--bg-primary);
    color: var(--primary-400);
}

[data-theme="dark"] .download-btn:disabled {
    background-color: var(--bg-tertiary);
    color: var(--text-muted);
}

[data-theme="dark"] .VIEWER {
    background-color: var(--bg-tertiary);
}

[data-theme="dark"] .empty-state {
    color: var(--text-secondary);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
    .FILTER {
        flex-direction: column;
        align-items: stretch;
        padding: 15px;
        gap: 15px;
    }

    .filter-title {
        border-right: none;
        border-bottom: 1px solid var(--border-color);
        padding-right: 0;
        padding-bottom: 10px;
        text-align: center;
    }

    .period-selector {
        justify-content: center;
    }

    .download-btn {
        width: 100%;
        justify-content: center;
        margin-left: 0;
    }

    .VIEWER {
        padding: 15px 0;
    }
}
</style>
