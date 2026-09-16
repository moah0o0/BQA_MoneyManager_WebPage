<template>
<div class="report-doc">
    <div class="PAGE" v-for="(page, pageIndex) in pages" :key="pageIndex">
        <PageHeader
            title="수입지출내역서"
            :organization-name="organizationName"
            :range="range"
            :page-number="pageIndex + 1"
            :page-count="pages.length"
        />

        <div class="PAGE_CONTENT">
            <table class="history-table">
                <thead>
                    <tr>
                        <th style="width:14%">거래일시</th>
                        <th style="width:7%">관</th>
                        <th style="width:28%">계정과목</th>
                        <th style="width:28%">장부내용</th>
                        <th style="width:14%">금액</th>
                        <th style="width:9%">증빙</th>
                    </tr>
                </thead>
                <tbody>
                    <HistoryRow v-for="row in page" :key="row.key" :row="row" />
                </tbody>
            </table>
        </div>
    </div>

    <!-- 자(尺) — 높이를 재려고 모든 줄을 한 번 그려 보는 자리. 보이지도, 인쇄되지도 않는다 -->
    <div class="page-ruler" aria-hidden="true">
        <div class="PAGE" ref="stage">
            <PageHeader title="수입지출내역서" :organization-name="organizationName" :range="range" />
            <div class="PAGE_CONTENT">
                <table class="history-table" ref="stageTable">
                    <thead>
                        <tr>
                            <th style="width:14%">거래일시</th>
                            <th style="width:7%">관</th>
                            <th style="width:28%">계정과목</th>
                            <th style="width:28%">장부내용</th>
                            <th style="width:14%">금액</th>
                            <th style="width:9%">증빙</th>
                        </tr>
                    </thead>
                    <tbody>
                        <HistoryRow v-for="row in reportRows" :key="row.key" :row="row" />
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import './style.css'
import PageHeader from './PageHeader.vue'
import HistoryRow from './HistoryRow.vue'
import paging from './paging.js'
import { formatYearMonth, splitDateTime } from './format.js'

export default {
    components: { PageHeader, HistoryRow },

    mixins: [paging],

    props: [
        'startYearMonth',
        'endYearMonth',
        'organizationName',
        'hangList',
        'mokList',
        'ledgerList',
        'gwanList',
        'semokList',
    ],

    computed: {
        range() {
            return `${formatYearMonth(this.startYearMonth)} ~ ${formatYearMonth(this.endYearMonth)}`
        },

        reportRows() {
            if (!this.ledgerList) return []

            return this.ledgerList
                .filter(record => record.expand?.transaction)
                // 차례는 원래 숫자(YYYYMMDDHHmm)로 매긴다.
                // 보이는 글자로 줄을 세우면 해가 바뀔 때 2026년 3월이 2025년 4월 앞에 끼어든다
                .slice()
                .sort((a, b) => a.expand.transaction.datetime - b.expand.transaction.datetime)
                .map(record => {
                    const { date, time } = splitDateTime(record.expand.transaction.datetime)
                    return {
                        key: record.id,
                        date,
                        time,
                        content: record.reason || '',
                        gwan: record.gwan,
                        hang: record.expand.hang,
                        mok: record.expand.mok,
                        saemok: record.expand.saemok,
                        money: record.money || 0,
                        receipt: this.receiptLabel(record),
                    }
                })
        },
    },

    methods: {
        receiptLabel(record) {
            if (record.not_need_receipt) return '불요'
            const count = record.receipt?.length || 0
            return count > 0 ? `${count}건` : '미등록'
        },
    },
}
</script>

<style>
.history-table thead th {
    background-color: var(--light-color);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    font-size: var(--font-size-sm);
}

[data-theme="dark"] .history-table thead th {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}
</style>
