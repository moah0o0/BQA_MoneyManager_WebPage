<template>
<div class="tab-root">
    <div class="page-head">
        <div class="head-text">
            <h1 class="page-title">거래내역</h1>
            <p class="page-desc">은행에서 불러온 그대로입니다. 이 화면에서는 고칠 수 없습니다.</p>
        </div>
    </div>

    <PeriodFilter :init-date="initDate" @change="onPeriodChange" />

    <div class="tx-wrap">
        <!-- 몇 건이 들어왔고 얼마가 오갔는지부터 알려 준다 -->
        <div class="tx-summary none-select">
            <div class="summary-item count">
                <span class="label">건수</span>
                <span class="value num">{{ visibleList.length.toLocaleString() }}<small>건</small></span>
            </div>
            <div class="summary-item income">
                <span class="label">입금 합계</span>
                <span class="value num">+{{ totalIncome.toLocaleString() }}<small>원</small></span>
            </div>
            <div class="summary-item expense">
                <span class="label">출금 합계</span>
                <span class="value num">-{{ totalExpense.toLocaleString() }}<small>원</small></span>
            </div>
            <div class="summary-item balance">
                <span class="label">차액</span>
                <span class="value num">{{ balance >= 0 ? '+' : '-' }}{{ Math.abs(balance).toLocaleString() }}<small>원</small></span>
            </div>
        </div>

        <div class="tx-controls none-select">
            <div class="chipbar" role="group" aria-label="거르개">
                <button
                    type="button"
                    class="chip"
                    :class="{ on: typeFilter === 'all' }"
                    :aria-pressed="typeFilter === 'all' ? 'true' : 'false'"
                    @click="typeFilter = 'all'"
                >전체 <span class="num">{{ periodList.length }}</span></button>
                <button
                    type="button"
                    class="chip"
                    :class="{ on: typeFilter === '수입' }"
                    :aria-pressed="typeFilter === '수입' ? 'true' : 'false'"
                    @click="typeFilter = '수입'"
                >입금 <span class="num">{{ countOf('수입') }}</span></button>
                <button
                    type="button"
                    class="chip"
                    :class="{ on: typeFilter === '지출' }"
                    :aria-pressed="typeFilter === '지출' ? 'true' : 'false'"
                    @click="typeFilter = '지출'"
                >출금 <span class="num">{{ countOf('지출') }}</span></button>

                <!-- 계좌가 둘 이상일 때만 고를 거리가 된다 -->
                <template v-if="bankList.length > 1">
                    <span class="chip-divider" aria-hidden="true"></span>
                    <label class="sr-only" for="tx-bank">계좌</label>
                    <select id="tx-bank" v-model="bankFilter" class="bank-select">
                        <option value="all">계좌 전체</option>
                        <option v-for="bank in bankList" :key="bank.id" :value="bank.id">
                            {{ bank.NickName }}
                        </option>
                    </select>
                </template>
            </div>

            <div class="search-bar">
                <i class="bi bi-search" aria-hidden="true"></i>
                <label class="sr-only" for="tx-search">적요 · 거래번호 검색</label>
                <input id="tx-search" v-model="query" type="search" class="search-input" placeholder="적요 · 거래번호 검색">
            </div>
        </div>

        <p v-if="errorMessage" class="notice notice-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{{ errorMessage }}</span>
        </p>

        <div class="tx-table-wrapper scroll-thin">
            <table class="tx">
                <caption class="sr-only">은행에서 불러온 거래내역입니다. 머리글을 누르면 차례를 바꿉니다.</caption>
                <colgroup>
                    <col style="width:8%">
                    <col style="width:14%">
                    <col style="width:16%">
                    <col style="width:8%">
                    <col style="width:39%">
                    <col style="width:15%">
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col" :aria-sort="ariaSort('no')">
                            <button type="button" class="sort-btn" @click="sortBy('no')">
                                거래번호<i :class="sortIcon('no')" aria-hidden="true"></i>
                            </button>
                        </th>
                        <th scope="col" :aria-sort="ariaSort('datetime')">
                            <button type="button" class="sort-btn" @click="sortBy('datetime')">
                                거래일시<i :class="sortIcon('datetime')" aria-hidden="true"></i>
                            </button>
                        </th>
                        <th scope="col">계좌</th>
                        <th scope="col">구분</th>
                        <th scope="col">적요</th>
                        <th scope="col" class="r" :aria-sort="ariaSort('money')">
                            <button type="button" class="sort-btn r" @click="sortBy('money')">
                                금액<i :class="sortIcon('money')" aria-hidden="true"></i>
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="tx in visibleList" :key="tx.id">
                        <td class="num no">{{ tx.no }}</td>
                        <td class="num datetime">{{ formatDateTime(tx.datetime) }}</td>
                        <td class="bank">
                            <span class="bank-name">{{ bankName(tx) }}</span>
                            <small class="num bank-account">{{ bankAccount(tx) }}</small>
                        </td>
                        <td>
                            <span :class="['gwan-tag', tx.type === '수입' ? 'is-income' : 'is-expense']">
                                <span aria-hidden="true">{{ tx.type === '수입' ? '+' : '−' }}</span>{{ tx.type === '수입' ? '입금' : '출금' }}
                            </span>
                        </td>
                        <td class="description">{{ tx.description }}</td>
                        <td class="num r amount" :class="tx.type === '수입' ? 'is-income' : 'is-expense'">
                            {{ tx.type === '수입' ? '+' : '−' }}{{ tx.money.toLocaleString() }}
                        </td>
                    </tr>

                    <tr v-if="loaded && visibleList.length === 0">
                        <td colspan="6" class="empty">
                            <template v-if="periodList.length === 0">이 기간에 들어온 거래가 없습니다.</template>
                            <template v-else>거르개에 걸리는 거래가 없습니다.</template>
                        </td>
                    </tr>
                    <tr v-if="!loaded">
                        <td colspan="6" class="empty" role="status">거래내역을 불러오는 중입니다…</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
</template>

<script>
import PocketBase from 'pocketbase'
import PeriodFilter from '../layout/PeriodFilter.vue'

const pb = new PocketBase(__POCKETBASE_API_BASE_URL__)

export default {
    props: ['loginStatus', 'initDate'],

    components: { PeriodFilter },

    data() {
        return {
            TRANSACTIONS: [],
            BANKS: [],
            loaded: false,
            errorMessage: '',

            filterStartDate: null,
            filterEndDate: null,

            typeFilter: 'all',
            bankFilter: 'all',
            query: '',

            sortKey: 'datetime',
            sortAsc: true,
        }
    },

    computed: {
        /** 고른 기간에 들어온 거래 전부 — 거르개 개수는 이것을 센다 */
        periodList() {
            return this.TRANSACTIONS
        },

        bankList() {
            return this.BANKS
        },

        visibleList() {
            const q = this.query.trim().toLowerCase()

            const list = this.TRANSACTIONS.filter(tx => {
                if (this.typeFilter !== 'all' && tx.type !== this.typeFilter) return false
                if (this.bankFilter !== 'all' && tx.bank !== this.bankFilter) return false
                if (!q) return true
                return `${tx.description ?? ''}`.toLowerCase().includes(q)
                    || `${tx.no ?? ''}`.toLowerCase().includes(q)
            })

            const dir = this.sortAsc ? 1 : -1
            return list.slice().sort((a, b) => {
                const x = a[this.sortKey]
                const y = b[this.sortKey]
                if (x === y) return (a.datetime - b.datetime) * dir
                return (x > y ? 1 : -1) * dir
            })
        },

        totalIncome() {
            return this.visibleList.filter(t => t.type === '수입').reduce((sum, t) => sum + (t.money || 0), 0)
        },

        totalExpense() {
            return this.visibleList.filter(t => t.type === '지출').reduce((sum, t) => sum + (t.money || 0), 0)
        },

        balance() {
            return this.totalIncome - this.totalExpense
        },
    },

    watch: {
        loginStatus: {
            immediate: true,
            handler(on) { if (on && this.filterStartDate) this.load() }
        },
    },

    methods: {
        onPeriodChange({ startDate, endDate }) {
            this.filterStartDate = startDate
            this.filterEndDate = endDate
            if (this.loginStatus) this.load()
        },

        countOf(type) {
            return this.periodList.filter(t => t.type === type).length
        },

        bankOf(tx) {
            return tx.expand?.bank ?? this.BANKS.find(b => b.id === tx.bank) ?? null
        },

        bankName(tx) {
            const bank = this.bankOf(tx)
            return bank?.NickName ?? '—'
        },

        bankAccount(tx) {
            const bank = this.bankOf(tx)
            if (!bank) return ''
            return [bank.BankType, bank.AccountNumber].filter(Boolean).join(' ')
        },

        formatDateTime(value) {
            if (!value) return ''
            const s = String(value).padStart(12, '0')
            return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`
        },

        /* ---------- 차례 ---------- */
        sortBy(key) {
            if (this.sortKey === key) {
                this.sortAsc = !this.sortAsc
                return
            }
            this.sortKey = key
            // 날짜는 이른 것부터, 숫자는 큰 것부터 보는 것이 눈에 익다
            this.sortAsc = key === 'datetime'
        },

        ariaSort(key) {
            if (this.sortKey !== key) return 'none'
            return this.sortAsc ? 'ascending' : 'descending'
        },

        sortIcon(key) {
            if (this.sortKey !== key) return 'bi bi-arrow-down-up sort-icon is-off'
            return `bi ${this.sortAsc ? 'bi-arrow-up' : 'bi-arrow-down'} sort-icon`
        },

        async load() {
            if (!this.filterStartDate || !this.filterEndDate) return

            this.loaded = false
            this.errorMessage = ''

            try {
                const [transactions, banks] = await Promise.all([
                    pb.collection('Transaction').getFullList({
                        sort: 'datetime',
                        filter: `${this.filterStartDate} <= datetime && datetime <= ${this.filterEndDate}`,
                        expand: 'bank',
                        requestKey: null,
                    }),
                    pb.collection('BankSetting').getFullList({ requestKey: null }),
                ])

                this.TRANSACTIONS = transactions
                this.BANKS = banks
                this.loaded = true
            } catch (error) {
                console.error('Failed to load transactions:', error)
                this.TRANSACTIONS = []
                this.loaded = true
                this.errorMessage = '거래내역을 불러오지 못했습니다.'
            }
        },
    },
}
</script>

<style scoped>
.tab-root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    /* 표가 화면 끝까지 내려오게 — 위 부속이 쓰고 남은 자리를 전부 준다 */
    height: calc(100vh - var(--header-height) - var(--spacing-6) * 2);
    min-height: 480px;
}

.none-select {
    user-select: none;
    -webkit-user-select: none;
}

.page-head {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    flex-wrap: wrap;
    flex-shrink: 0;
    margin-bottom: 0;
}

.head-text {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    flex-wrap: wrap;
}

.page-head .page-title {
    font-size: var(--text-xl);
}

.page-head .page-desc {
    margin: 0;
}

.tx-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    flex: 1;
    min-height: 0;
}

/* ---------- 요약 ---------- */
.tx-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-3);
    flex-shrink: 0;
}

.summary-item {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--border-color-strong);
    border-radius: var(--border-radius-lg);
}

.summary-item .label {
    flex-shrink: 0;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
}

.summary-item .value {
    margin-left: auto;
    font-size: var(--text-lg);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    line-height: var(--line-height-tight);
}

.summary-item .value small {
    margin-left: 2px;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
}

.summary-item.income {
    border-left-color: var(--income-color);
}

.summary-item.income .value {
    color: var(--income-color);
}

.summary-item.expense {
    border-left-color: var(--expense-color);
}

.summary-item.expense .value {
    color: var(--expense-color);
}

.summary-item.balance {
    border-left-color: var(--primary-600);
}

/* ---------- 거르개 줄 ---------- */
.tx-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: wrap;
    flex-shrink: 0;
}

.chipbar {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
}

.chip-divider {
    width: 1px;
    height: 18px;
    background: var(--border-color);
}

.bank-select {
    min-height: 30px;
    padding: 0 var(--spacing-2);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.bank-select:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .bank-select:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.search-bar {
    position: relative;
    width: 280px;
    max-width: 100%;
}

.search-input {
    width: 100%;
    min-height: 30px;
    padding: 0 var(--spacing-3) 0 30px;
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .search-input:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.search-bar .bi-search {
    position: absolute;
    left: var(--spacing-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: var(--text-xs);
    pointer-events: none;
}

/* 입금/출금은 기호를 함께 둔다 — 색만으로는 못 가리는 사람이 있다 */
.gwan-tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.gwan-tag.is-income { color: var(--income-color); }
.gwan-tag.is-expense { color: var(--expense-color); }

/* ---------- 표 ---------- */
.tx-table-wrapper {
    /*
        .sr-only는 position:absolute다. 기댈 조상이 없으면 문서 전체를 기준으로 놓여
        표 안쪽 깊숙한 줄의 숨은 글이 페이지 바닥을 늘린다.
    */
    position: relative;
    flex: 1;
    min-height: 160px;
    overflow: auto;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
}

table.tx {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
}

table.tx thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0 var(--spacing-3);
    height: 36px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    text-align: left;
    white-space: nowrap;
}

table.tx thead th.r {
    text-align: right;
}

.sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
}

.sort-btn.r {
    flex-direction: row;
}

.sort-btn:hover {
    color: var(--text-primary);
}

.sort-icon {
    font-size: 9px;
}

.sort-icon.is-off {
    opacity: 0.35;
}

table.tx tbody td {
    padding: var(--spacing-2) var(--spacing-3);
    border-bottom: 1px solid var(--divider-color);
    font-size: var(--text-sm);
    color: var(--text-primary);
    vertical-align: middle;
}

table.tx tbody tr:last-child td {
    border-bottom: none;
}

table.tx tbody tr:hover td {
    background: var(--bg-hover);
}

td.r,
th.r {
    text-align: right;
}

td.no,
td.datetime {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    white-space: nowrap;
}

td.bank {
    line-height: var(--line-height-tight);
}

.bank-name {
    display: block;
    font-size: var(--text-sm);
}

.bank-account {
    display: block;
    color: var(--text-muted);
    font-size: var(--text-xs);
}

td.description {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

td.amount {
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

td.amount.is-income {
    color: var(--income-color);
}

td.amount.is-expense {
    color: var(--expense-color);
}

td.empty {
    padding: var(--spacing-10) var(--spacing-3);
    color: var(--text-muted);
    text-align: center;
}

@media (max-width: 900px) {
    .tab-root {
        height: auto;
    }

    .tx-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tx-table-wrapper {
        max-height: 70vh;
    }

    table.tx {
        min-width: 820px;
    }

    .search-bar {
        width: 100%;
    }
}
</style>
