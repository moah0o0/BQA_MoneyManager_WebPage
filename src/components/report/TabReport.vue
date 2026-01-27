<template>
<div class="main-content none-select">
    <div class="content-area">
    <template v-if="loginStatus === true">
        
        <div class="FILTER">
            <span class="filter-title">공금보고서 발급 기간설정</span>
            
            <div class="date-range-filter">
                <select v-model="selectedStartYearMonth" @change="updateEndMonthOptions">
                    <option :value="null">시작일 미선택</option>
                    <option v-for="date in availableDates" :key="date.value" :value="date.value">
                        {{ date.text }}
                    </option>
                </select>
                ~
                <select v-model="selectedEndYearMonth" @change="initRecordList">
                    <option :value="null">종료일 미선택</option>
                    <option v-for="date in endMonthOptions" :key="date.value" :value="date.value">
                        {{ date.text }}
                    </option>
                </select>
            </div>
            
            <div class="report-type-filter button-group">
                <button
                    v-for="option in reportOptions"
                    :key="option.key"
                    :class="['report-type-btn', { 'selected': this[`is${option.key.charAt(0).toUpperCase() + option.key.slice(1)}Selected`] }]"
                    @click="toggleReportType(option.key)"
                >
                    {{ option.label }}
                </button>
            </div>

            <button
                class="download-btn"
                @click="downloadReportPDF"
                :disabled="!canDownload"
            >
                <i class="bi bi-cloud-arrow-down-fill"></i>
                PDF 다운로드
            </button>
        </div>
        
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
/* 메인 탭 컴포넌트의 스타일만 남김 */
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

.date-range-filter {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--strong-color, #333);
    font-weight: 500;
}

.date-range-filter select {
    padding: 8px 12px; 
    border-radius: 6px; 
    border: 1px solid var(--medium-color);
    background-color: var(--none-color);
    font-size: 15px;
    color: var(--strong-color, #333);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:focus {
        border-color: var(--primary-color);
        outline: none;
    }
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

.report-type-filter.button-group {
    display: flex;
    gap: 10px; /* 버튼 간 간격 */
}

.report-type-btn {
    padding: 8px 15px;
    border: 1px solid var(--medium-color);
    border-radius: 6px;
    background-color: var(--none-color);
    color: var(--strong-color);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.report-type-btn.selected {
    border-color: var(--success-color);
    background-color: var(--success-color);
    color: white;

}

.report-type-btn:hover:not(.selected) {
    background-color: var(--medium-color);
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

[data-theme="dark"] .date-range-filter {
    color: var(--text-primary);
}

[data-theme="dark"] .date-range-filter select {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

[data-theme="dark"] .date-range-filter select:focus {
    border-color: var(--primary-500);
}

[data-theme="dark"] .report-type-btn {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

[data-theme="dark"] .report-type-btn:hover:not(.selected) {
    background-color: var(--bg-tertiary);
}

[data-theme="dark"] .report-type-btn.selected {
    background-color: var(--success-500);
    border-color: var(--success-500);
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

/* 모바일 반응형 */
@media (max-width: 1024px) {
    .FILTER {
        flex-wrap: wrap;
    }

    .download-btn {
        margin-left: 0;
    }
}

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

    .date-range-filter {
        justify-content: center;
    }

    .report-type-filter.button-group {
        flex-wrap: wrap;
        justify-content: center;
    }

    .report-type-btn {
        flex: 1;
        min-width: 120px;
        text-align: center;
    }

    .download-btn {
        width: 100%;
        justify-content: center;
    }

    .VIEWER {
        padding: 15px 0;
    }
}
</style>