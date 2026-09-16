<template>
<div class="tab-root none-select">
    <div class="content-area">
    <template v-if="loginStatus === true">
        
        <div class="page-head no-print">
            <div>
                <h1 class="page-title">공금보고서</h1>
                <p class="page-desc">기간과 서식을 고르면 아래에 미리 보기가 뜹니다. 그대로 PDF로 받을 수 있습니다.</p>
            </div>
        </div>

        <div class="FILTER">
            <div class="filter-line">
                <span class="filter-label" id="report-range-label">기간</span>
                <div class="date-range-filter" role="group" aria-labelledby="report-range-label">
                    <label class="sr-only" for="report-start">시작 달</label>
                    <select id="report-start" v-model="selectedStartYearMonth" @change="updateEndMonthOptions">
                        <option :value="null">시작 달</option>
                        <option v-for="date in availableDates" :key="date.value" :value="date.value">
                            {{ date.text }}
                        </option>
                    </select>
                    <span aria-hidden="true">~</span>
                    <label class="sr-only" for="report-end">끝 달</label>
                    <select id="report-end" v-model="selectedEndYearMonth" @change="initRecordList">
                        <option :value="null">끝 달</option>
                        <option v-for="date in endMonthOptions" :key="date.value" :value="date.value">
                            {{ date.text }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="filter-line">
                <span class="filter-label" id="report-kind-label">서식</span>
                <!-- 여러 개를 함께 고를 수 있으므로 aria-pressed로 켜짐/꺼짐을 알린다 -->
                <div class="report-type-filter chipbar" role="group" aria-labelledby="report-kind-label">
                    <button
                        v-for="option in reportOptions"
                        :key="option.key"
                        type="button"
                        class="chip"
                        :class="{ on: isSelected(option.key) }"
                        :aria-pressed="isSelected(option.key) ? 'true' : 'false'"
                        @click="toggleReportType(option.key)"
                    >
                        <i :class="['bi', isSelected(option.key) ? 'bi-check-circle-fill' : 'bi-circle']" aria-hidden="true"></i>
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <button
                type="button"
                class="btn btn-primary download-btn"
                @click="downloadReportPDF"
                :disabled="!canDownload"
            >
                <i class="bi bi-file-earmark-arrow-down" aria-hidden="true"></i>
                PDF로 받기
            </button>
        </div>

        <p v-if="!canShowViewer" class="empty no-print" role="status">
            <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
            기간과 서식을 고르면 여기에 미리 보기가 뜹니다.
        </p>
        
        <div class="VIEWER" v-if="canShowViewer" id="report-content">
            <TotalPage
                v-if="isTotalSelected"
                :organizationName="organizationName"
                :startYearMonth="reportStartDate"
                :endYearMonth="reportEndDate"
                :hangList="hangList"
                :mokList="mokList"
                :ledgerList="ledgerList"
            />
            <HistoryPage
                v-if="isHistorySelected"
                :organizationName="organizationName"
                :startYearMonth="reportStartDate"
                :endYearMonth="reportEndDate"
                :hangList="hangList"
                :mokList="mokList"
                :ledgerList="ledgerList"
            />
            <ReceiptPage
                v-if="isReceiptSelected"
                :organizationName="organizationName"
                :startYearMonth="reportStartDate"
                :endYearMonth="reportEndDate"
                :hangList="hangList"
                :mokList="mokList"
                :ledgerList="ledgerList"
            />
        </div>
    </template>
    </div>
</div>
</template>

<script>
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

import TotalPage from './TotalPage.vue';
import HistoryPage from './HistoryPage.vue';
import ReceiptPage from './ReceiptPage.vue';

export default {
    props:['loginStatus', 'initDate', 'organizationName'],

    components: { TotalPage, HistoryPage, ReceiptPage },

    data() {
        return {
            availableDates: [],
            endMonthOptions: [],
            selectedStartYearMonth: null,
            selectedEndYearMonth: null,

            isTotalSelected: true,
            isHistorySelected: false,
            isReceiptSelected: false,

            reportOptions: [
                { key: 'total', label: '수입지출 결산서' },
                { key: 'history', label: '수입지출 내역서' },
                { key: 'receipt', label: '지출 결의서' },
            ],

            hangList: null,
            mokList: null,
            ledgerList: null,
        }
    },

    computed:{
        reportComponents() {
            const components = [];
            if (this.isTotalSelected) components.push('TotalPage');
            if (this.isHistorySelected) components.push('HistoryPage');
            if (this.isReceiptSelected) components.push('ReceiptPage');
            return components;
        },

        selectedReportLabel() {
            const selectedLabels = [];
            if (this.isTotalSelected) selectedLabels.push('결산서');
            if (this.isHistorySelected) selectedLabels.push('내역서');
            if (this.isReceiptSelected) selectedLabels.push('결의서');
            
            if (selectedLabels.length === 0) return '미선택';
            if (selectedLabels.length === 3) return '전체';
            
            return selectedLabels.join('_');
        },

        reportReady() {
            return (
                this.selectedStartYearMonth &&
                this.selectedEndYearMonth &&
                this.hangList &&
                this.mokList &&
                this.ledgerList
            );
        },

        // 뷰어를 보여줄 수 있는지
        canShowViewer() {
            const hasReports = this.isTotalSelected || this.isHistorySelected || this.isReceiptSelected;
            return hasReports && this.reportReady;
        },

        // 다운로드 가능 여부
        canDownload() {
            const hasReports = this.isTotalSelected || this.isHistorySelected || this.isReceiptSelected;
            return hasReports && this.reportReady;
        },

        reportStartDate() {
            if (!this.selectedStartYearMonth) return null;
            return Number(this.selectedStartYearMonth + '010000');
        },

        reportEndDate() {
            if (!this.selectedEndYearMonth) return null;
            
            const year = parseInt(this.selectedEndYearMonth.substring(0, 4));
            const month = parseInt(this.selectedEndYearMonth.substring(4, 6));
            
            const lastDayDate = new Date(year, month, 0); 
            const lastDay = lastDayDate.getDate();
        
            const lastDayStr = String(lastDay).padStart(2, '0');
            return Number(this.selectedEndYearMonth + lastDayStr + '2359');
        }
    },

    created(){
        this.makeAvailableDates();

        if (this.availableDates.length > 0) {
            this.selectedStartYearMonth = this.availableDates[0].value;
            this.selectedEndYearMonth = this.availableDates[this.availableDates.length - 1].value;
            this.updateEndMonthOptions();
        }
    },

    watch: {
        selectedEndYearMonth(newVal) {
            if (newVal && this.selectedStartYearMonth) {
                this.initRecordList();
            }
        }
    },

    methods: {
        /** 템플릿에서 this[`is...Selected`]를 문자열로 조립하던 자리를 한곳으로 모은다 */
        isSelected(key) {
            return this[`is${key.charAt(0).toUpperCase() + key.slice(1)}Selected`]
        },

        async downloadReportPDF() {
            if (!this.canDownload) {
                alert('보고서 기간 설정 및 항목 선택을 완료해주세요.');
                return;
            }

            // 인쇄 대화 상자 호출. CSS @media print가 모든 불필요한 요소를 숨깁니다.
            window.print();
        },

        toggleReportType(key) {
            const propName = `is${key.charAt(0).toUpperCase() + key.slice(1)}Selected`;
            if (propName in this) {
                this[propName] = !this[propName];
            }
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
        
        makeAvailableDates() {
            const startDate = this.parseDate(this.initDate)
            const now = new Date()

            const dates = []
        
            let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 1)

            while (cursor <= end) {
                const year = cursor.getFullYear()
                const month = cursor.getMonth() + 1
                const monthStr = String(month).padStart(2, '0')
                
                const value = `${year}${monthStr}`
                const text = `${year}년 ${month}월`
                
                dates.push({ value, text })
                
                cursor = new Date(year, cursor.getMonth() + 1, 1)
            }

            this.availableDates = dates; 
        },
        
        updateEndMonthOptions() {
            if (!this.selectedStartYearMonth) {
                this.endMonthOptions = [];
                this.selectedEndYearMonth = null;
                return;
            }

            // 선택된 시작 연월 이후의 모든 연월만 필터링
            this.endMonthOptions = this.availableDates.filter(date => 
                date.value >= this.selectedStartYearMonth
            );
            
            // 현재 선택된 종료 연월이 시작 연월보다 이전이라면, 종료 연월을 시작 연월로 강제 조정
            if (this.selectedEndYearMonth < this.selectedStartYearMonth) {
                this.selectedEndYearMonth = this.selectedStartYearMonth;
            } else if (!this.selectedEndYearMonth) {
                 // 초기화 시 종료 연월도 시작 연월과 동일하게 설정
                 this.selectedEndYearMonth = this.selectedStartYearMonth;
            }

            // 옵션이 변경될 때 데이터를 다시 로드
            this.initRecordList();
        },
        
        async initRecordList(){
            if (!this.reportStartDate || !this.reportEndDate) {
                this.hangList = this.mokList = this.ledgerList = null;
                return;
            }

            const startDT = this.reportStartDate.toString();
            const endDT = this.reportEndDate.toString();

            this.hangList = this.mokList = this.ledgerList = null; 

            const [hangList, mokList, ledgerList] = await Promise.all([
                pb.collection('AssetsHang').getFullList({ sort: 'priority', requestKey: null }),
                pb.collection('AssetsMok').getFullList({ sort: 'priority', requestKey: null }),
                pb.collection('Ledger').getFullList({
                    filter: `transaction.datetime >= ${startDT} && transaction.datetime <= ${endDT}`,
                    expand: `transaction,hang,mok,saemok`,
                    requestKey: null
                })
            ]);

            this.hangList = hangList;
            this.mokList = mokList;
            this.ledgerList = ledgerList;
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

/* -------------------- 고르는 띠 -------------------- */
.FILTER {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
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

/* 무엇을 고르는 자리인지 왼쪽에 이름을 세워 둔다 */
.filter-label {
    min-width: 40px;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
}

.date-range-filter {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
    color: var(--text-muted);
}

.date-range-filter select {
    min-height: 36px;
    padding: 0 var(--spacing-3);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.date-range-filter select:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .date-range-filter select:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.download-btn {
    align-self: flex-start;
}

/* -------------------- 미리 보기 -------------------- */
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

@media (max-width: 768px) {
    .FILTER {
        padding: var(--spacing-4);
    }

    .filter-line {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--spacing-2);
    }

    .download-btn {
        align-self: stretch;
    }

    .VIEWER {
        padding: var(--spacing-2);
    }
}
</style>
