<template>
<div class="report-doc">
    <div class="PAGE" v-for="(page, pageIndex) in pages" :key="pageIndex">
        <PageHeader
            title="수입지출결산서"
            :organization-name="organizationName"
            :range="range"
            :page-number="pageIndex + 1"
            :page-count="pages.length"
        />

        <div class="PAGE_CONTENT">
            <table>
                <thead>
                    <tr>
                        <th style="width:5%">항</th>
                        <th style="width:47%">목</th>
                        <th style="width:16%" class="amount">수입금액</th>
                        <th style="width:16%" class="amount">지출금액</th>
                        <th style="width:16%" class="amount">차이금액</th>
                    </tr>
                </thead>
                <tbody>
                    <TotalRow v-for="row in page" :key="row.key" :row="row" />
                </tbody>
            </table>
        </div>
    </div>

    <!--
        자(尺). 모든 줄을 한 번 그려 놓고 높이를 재려고 두는 자리다.
        눈에 보이지 않고, 인쇄에도 나오지 않는다.
    -->
    <div class="page-ruler" aria-hidden="true">
        <div class="PAGE" ref="stage">
            <PageHeader title="수입지출결산서" :organization-name="organizationName" :range="range" />
            <div class="PAGE_CONTENT">
                <table ref="stageTable">
                    <thead>
                        <tr>
                            <th style="width:5%">항</th>
                            <th style="width:47%">목</th>
                            <th style="width:16%" class="amount">수입금액</th>
                            <th style="width:16%" class="amount">지출금액</th>
                            <th style="width:16%" class="amount">차이금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        <TotalRow v-for="row in reportRows" :key="row.key" :row="row" />
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
import TotalRow from './TotalRow.vue'
import paging from './paging.js'
import { formatYearMonth } from './format.js'

export default {
    components: { PageHeader, TotalRow },

    mixins: [paging],

    props: [
        'startYearMonth',
        'endYearMonth',
        'organizationName',
        'hangList',
        'mokList',
        'ledgerList',
    ],

    data() {
        return {
            ASSETS_RESULT: [],
            FINANCIAL_SUMMARY: {
                incomeTotal: 0,
                expenseTotal: 0,
                differenceTotal: 0,
            },
        }
    },

    watch: {
        ledgerList: {
            immediate: true,
            handler(newVal) {
                if (newVal) this.getAssetsResult()
            },
        },
    },

    computed: {
        range() {
            return `${formatYearMonth(this.startYearMonth)} ~ ${formatYearMonth(this.endYearMonth)}`
        },

        /** 종이에 놓일 줄을 차례대로 늘어놓는다. 쪽 나누기는 paging.js가 재서 한다 */
        reportRows() {
            const rows = []

            this.ASSETS_RESULT.forEach(hang => {
                rows.push({
                    key: `hang-${hang.id}`,
                    kind: 'hang',
                    hang,
                    groupHead: true,
                    keepWithNext: true,
                })

                hang.mokList.forEach(mok => {
                    rows.push({ key: `mok-${mok.id}`, kind: 'mok', mok })
                })
            })

            if (rows.length) {
                rows.push({
                    key: 'total',
                    kind: 'total',
                    groupEnd: true,
                    income: this.FINANCIAL_SUMMARY.incomeTotal,
                    expense: this.FINANCIAL_SUMMARY.expenseTotal,
                    difference: this.FINANCIAL_SUMMARY.differenceTotal,
                })
            }

            return rows
        },
    },

    methods: {
        /** 항이 쪽을 넘어갈 때 다음 쪽 맨 위에 다시 얹을 머리 */
        pageContinuationRow(hangRow) {
            return { ...hangRow, key: `${hangRow.key}-cont`, groupHead: false, continued: true }
        },

        getAssetsResult() {
            if (!this.hangList || !this.mokList || !this.ledgerList) {
                this.ASSETS_RESULT = []
                return
            }

            this.FINANCIAL_SUMMARY = { incomeTotal: 0, expenseTotal: 0, differenceTotal: 0 }

            const hangMap = new Map(this.hangList.map(h => [h.id, {
                ...h,
                incomeTotal: 0,
                expenseTotal: 0,
                mokMap: new Map(),
            }]))

            this.mokList.forEach(m => {
                const hang = hangMap.get(m.parent_hang)
                if (hang) hang.mokMap.set(m.id, { ...m, income: 0, expense: 0 })
            })

            this.ledgerList.forEach(record => {
                const { hang, mok, money = 0, gwan } = record
                const hangData = hangMap.get(hang)
                const mokData = hangData?.mokMap.get(mok)
                if (!hangData || !mokData) return

                if (gwan === '수입') {
                    mokData.income += money
                    hangData.incomeTotal += money
                    this.FINANCIAL_SUMMARY.incomeTotal += money
                } else if (gwan === '지출') {
                    mokData.expense += money
                    hangData.expenseTotal += money
                    this.FINANCIAL_SUMMARY.expenseTotal += money
                }
            })

            this.FINANCIAL_SUMMARY.differenceTotal =
                this.FINANCIAL_SUMMARY.incomeTotal - this.FINANCIAL_SUMMARY.expenseTotal

            // 수입도 지출도 0인 항·목은 빼고 보여 준다
            this.ASSETS_RESULT = Array.from(hangMap.values())
                .map(hang => {
                    const mokList = Array.from(hang.mokMap.values())
                        .filter(mok => mok.income !== 0 || mok.expense !== 0)
                        .map(mok => ({ ...mok, difference: mok.income - mok.expense }))

                    const { mokMap, ...rest } = hang
                    return {
                        ...rest,
                        mokList,
                        differenceTotal: hang.incomeTotal - hang.expenseTotal,
                    }
                })
                .filter(hang => hang.incomeTotal !== 0 || hang.expenseTotal !== 0)
        },
    },
}
</script>
