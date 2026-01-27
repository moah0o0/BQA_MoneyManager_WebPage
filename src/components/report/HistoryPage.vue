<template>
    <div class="PAGE"
         v-for="(page, pageIndex) in pagedAssetsResults"
         :key="pageIndex">

        <div class="PAGE_HEADER">
            <div class="page-meta">
                <span class="subtitle">{{ organizationName }}</span>
                <span class="title">수입지출내역서</span>
                <span class="description">{{ formattedStartDate }} ~ {{ formattedEndDate }}</span>
            </div>
            <div class="page-info">
                <span class="currency-unit">(단위: 원)</span>
                <span class="page-number">총 {{ pagedAssetsResults.length }}쪽 중 {{ pageIndex + 1 }}번째</span>
            </div>
        </div>

        <div class="PAGE_CONTENT">
            <table class="history-table">
                <thead>
                    <tr>
                        <th style="width:12%">거래일시</th>
                        <th style="width:5%">관</th>
                        <th style="width:33%">계정과목</th>
                        <th style="width:30%">장부내용</th>
                        <th style="width:12%">금액</th>
                        <th style="width:8%">증빙</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(record, recordIndex) in page.items" :key="recordIndex" class="transaction-row">
                        <td class="date-cell">{{ record.datetime }}</td>
                        <td class="gwan-cell">{{ record.gwan }}</td>
                        <td class="account-cell">
                            <span class="hang-label">{{ record.hang?.label || '-' }}</span>
                            <span class="mok-label">> {{ record.mok?.label || '-' }}</span>
                            <span class="saemok-label">> {{ record.saemok?.label || '-' }}</span>
                        </td>
                        <td class="content-cell">{{ record.content }}</td>
                        <td class="amount-cell" :class="{'income-amount': record.gwan === '수입', 'expense-amount': record.gwan === '지출'}">
                            {{ record.gwan === '지출' ? '-' : '' }}{{ formatCurrency(record.money) }}
                        </td>
                        <td class="receipt-cell">{{ record.receipt }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import './style.css'

export default {
    props:[
        'startYearMonth',
        'endYearMonth',
        'organizationName',
        'hangList',
        'mokList',
        'ledgerList',
        'gwanList',
        'semokList'
    ],

    data() {
        return {
            TRANSACTION_LIST: [],
        }
    },

    watch: {
        ledgerList: {
            immediate: true,
            handler(newVal) {
                if (newVal && newVal.length > 0) {
                    this.prepareTransactionList();
                } else if (newVal && newVal.length === 0) {
                    this.TRANSACTION_LIST = [];
                }
            }
        },
    },

    computed:{
        formattedStartDate() {
            if (!this.startYearMonth) return '';
            const s = this.startYearMonth.toString();
            const year = s.substring(0, 4);
            const month = parseInt(s.substring(4, 6));
            return `${year}년 ${month}월`;
        },

        formattedEndDate() {
            if (!this.endYearMonth) return '';
            const s = this.endYearMonth.toString();
            const year = s.substring(0, 4);
            const month = parseInt(s.substring(4, 6));
            return `${year}년 ${month}월`;
        },

        // 세로 A4 기준 페이지당 행 수 (큰 글씨 기준)
        pagedAssetsResults() {
            const FIRST_PAGE_ROWS = 14;
            const OTHER_PAGE_ROWS = 20;
            const pages = [];
            let i = 0;

            while (i < this.TRANSACTION_LIST.length) {
                const maxRows = pages.length === 0 ? FIRST_PAGE_ROWS : OTHER_PAGE_ROWS;
                pages.push({
                    items: this.TRANSACTION_LIST.slice(i, i + maxRows)
                });
                i += maxRows;
            }

            if (pages.length === 0) {
                pages.push({ items: [] });
            }

            return pages;
        }
    },

    methods: {
        formatCurrency(number) {
            if (number === undefined || number === null) return '0';
            return number.toLocaleString('ko-KR');
        },

        formatDateTime(dateTimeNum) {
            if (!dateTimeNum) return '';
            const s = String(dateTimeNum).padStart(12, '0');
            const Y = s.slice(0, 4);
            const M = s.slice(4, 6);
            const D = s.slice(6, 8);
            const H = s.slice(8, 10);
            const m = s.slice(10, 12);
            return `${M}/${D} ${H}:${m}`;
        },

        prepareTransactionList() {
            if (!this.ledgerList || this.ledgerList.length === 0) {
                this.TRANSACTION_LIST = [];
                return;
            }

            const finalTransactionList = this.ledgerList
                .filter(record => record.expand)
                .map(record => {
                    function receipt_count(){
                        if(record.not_need_receipt) return '불요'
                        if(record.receipt.length > 0) return `${record.receipt.length}건`
                        if(record.receipt.length == 0) return `미등록`
                    }
                    return {
                        datetime: this.formatDateTime(record.expand.transaction.datetime),
                        content: record.reason || '',
                        gwan: record.gwan,
                        hang: record.expand.hang,
                        mok: record.expand.mok,
                        saemok: record.expand.saemok,
                        money: record.money || 0,
                        receipt: receipt_count()
                    };
                });

            finalTransactionList.sort((a, b) => a.datetime.localeCompare(b.datetime));

            this.TRANSACTION_LIST = finalTransactionList;
        },
    }
}
</script>

<style scoped>
.history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-base);
}

.history-table th,
.history-table td {
    padding: var(--table-cell-padding);
    border: 1px solid var(--medium-color);
    text-align: left;
    vertical-align: middle;
}

.history-table thead th {
    background-color: var(--light-color);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    font-size: var(--font-size-base);
}

.transaction-row {
    font-size: var(--font-size-sm);
    line-height: var(--line-height-tight);
}

.date-cell {
    text-align: center;
    white-space: nowrap;
    font-size: var(--font-size-sm);
}

.gwan-cell {
    text-align: center;
    font-weight: var(--font-weight-semibold);
}

.account-cell {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-tight);
}

.hang-label {
    font-weight: var(--font-weight-semibold);
}

.mok-label, .saemok-label {
    color: var(--medium-color);
}

.content-cell {
    font-size: var(--font-size-sm);
    word-break: break-all;
}

.amount-cell {
    text-align: right;
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.income-amount {
    color: var(--income-color);
}

.expense-amount {
    color: var(--expense-color);
}

.receipt-cell {
    text-align: center;
    font-size: var(--font-size-sm);
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .history-table th,
[data-theme="dark"] .history-table th {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) .history-table td,
[data-theme="dark"] .history-table td {
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .history-table thead th,
[data-theme="dark"] .history-table thead th {
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) .mok-label,
[data-theme="dark"] .mok-label,
:deep([data-theme="dark"]) .saemok-label,
[data-theme="dark"] .saemok-label {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .income-amount,
[data-theme="dark"] .income-amount {
    color: var(--income-color);
}

:deep([data-theme="dark"]) .expense-amount,
[data-theme="dark"] .expense-amount {
    color: var(--expense-color);
}
</style>
