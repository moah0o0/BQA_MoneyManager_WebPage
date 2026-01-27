<template>
    <div class="PAGE"
         v-for="(page, pageIndex) in pagedBudgetItems"
         :key="pageIndex">

        <div class="PAGE_HEADER">
            <div class="page-meta">
                <span class="subtitle">예산현황</span>
                <span class="title">{{ selectedPeriod?.name || '' }}</span>
                <span class="description">{{ formatDate(selectedPeriod?.start_date) }} ~ {{ formatDate(selectedPeriod?.end_date) }}</span>
            </div>
            <div class="page-info">
                <span class="currency-unit">(단위: 원)</span>
                <span class="page-number">총 {{ pagedBudgetItems.length }}쪽 중 {{ pageIndex + 1 }}번째</span>
            </div>
        </div>

        <div class="PAGE_CONTENT">
            <!-- 첫 페이지에만 요약 표시 -->
            <div class="summary-section" v-if="pageIndex === 0">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>수입예산</th>
                            <th>수입실적</th>
                            <th>지출예산</th>
                            <th>지출실적</th>
                            <th>초과율</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{ formatMoney(totals.incomeBudget) }}</td>
                            <td>{{ formatMoney(totals.income) }}</td>
                            <td>{{ formatMoney(totals.expenseBudget) }}</td>
                            <td>{{ formatExpense(totals.spent) }}</td>
                            <td :class="getRateClass(totals.rate)">{{ formatRate(totals.rate) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 상세 테이블 -->
            <table class="budget-detail-table">
                <thead>
                    <tr>
                        <th style="width: 34%">항목</th>
                        <th style="width: 13%">수입예산</th>
                        <th style="width: 13%">수입실적</th>
                        <th style="width: 13%">지출예산</th>
                        <th style="width: 13%">지출실적</th>
                        <th style="width: 10%">초과율</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(row, rowIndex) in page.rows" :key="rowIndex">
                        <!-- 항 행 -->
                        <tr v-if="row.type === 'hang'" class="hang-row">
                            <td><span class="label-tag">[항]</span> {{ row.hangLabel }}</td>
                            <td class="text-right" :class="{ 'over-income': row.income > row.incomeBudget && row.incomeBudget > 0 }">{{ formatMoney(row.incomeBudget) }}</td>
                            <td class="text-right" :class="{ 'over-income': row.income > row.incomeBudget && row.incomeBudget > 0 }">{{ formatMoney(row.income) }}</td>
                            <td class="text-right" :class="{ 'over-expense': row.spent > row.expenseBudget && row.expenseBudget > 0 }">{{ formatMoney(row.expenseBudget) }}</td>
                            <td class="text-right" :class="{ 'over-expense': row.spent > row.expenseBudget && row.expenseBudget > 0 }">{{ formatExpense(row.spent) }}</td>
                            <td class="text-right" :class="getRateClass(row.rate)">{{ formatRate(row.rate) }}</td>
                        </tr>
                        <!-- 목 행 -->
                        <tr v-else-if="row.type === 'mok'" class="mok-row">
                            <td class="indent-1"><span class="label-tag">[목]</span> {{ row.mokLabel }}</td>
                            <td class="text-right" :class="{ 'over-income': row.income > row.incomeBudget && row.incomeBudget > 0 }">{{ formatMoney(row.incomeBudget) }}</td>
                            <td class="text-right" :class="{ 'over-income': row.income > row.incomeBudget && row.incomeBudget > 0 }">{{ formatMoney(row.income) }}</td>
                            <td class="text-right" :class="{ 'over-expense': row.spent > row.expenseBudget && row.expenseBudget > 0 }">{{ formatMoney(row.expenseBudget) }}</td>
                            <td class="text-right" :class="{ 'over-expense': row.spent > row.expenseBudget && row.expenseBudget > 0 }">{{ formatExpense(row.spent) }}</td>
                            <td class="text-right" :class="getRateClass(row.rate)">{{ formatRate(row.rate) }}</td>
                        </tr>
                        <!-- 세목 행 -->
                        <tr v-else-if="row.type === 'item'" class="budget-row">
                            <td class="indent-2"><span class="label-tag">[세목]</span>{{ row.saemokLabel }}</td>
                            <td class="text-right" :class="{ 'over-income': row.income > row.incomeBudget && row.incomeBudget > 0 }">{{ formatMoney(row.incomeBudget) }}</td>
                            <td class="text-right" :class="{ 'over-income': row.income > row.incomeBudget && row.incomeBudget > 0 }">{{ formatMoney(row.income) }}</td>
                            <td class="text-right" :class="{ 'over-expense': row.spent > row.expenseBudget && row.expenseBudget > 0 }">{{ formatMoney(row.expenseBudget) }}</td>
                            <td class="text-right" :class="{ 'over-expense': row.spent > row.expenseBudget && row.expenseBudget > 0 }">{{ formatExpense(row.spent) }}</td>
                            <td class="text-right" :class="getRateClass(row.rate)">{{ formatRate(row.rate) }}</td>
                        </tr>
                    </template>
                </tbody>
                <tfoot v-if="page.includeTotal">
                    <tr class="total-row">
                        <th>총계</th>
                        <th class="text-right">{{ formatMoney(totals.incomeBudget) }}</th>
                        <th class="text-right">{{ formatMoney(totals.income) }}</th>
                        <th class="text-right">{{ formatMoney(totals.expenseBudget) }}</th>
                        <th class="text-right">{{ formatExpense(totals.spent) }}</th>
                        <th class="text-right" :class="getRateClass(totals.rate)">{{ formatRate(totals.rate) }}</th>
                    </tr>
                </tfoot>
            </table>

            <div v-if="page.includeTotal && overBudgetItems.length > 0" class="warning-section">
                <div class="warning-title">* 예산 초과 항목</div>
                <ul class="warning-list">
                    <li v-for="item in overBudgetItems" :key="item.id">
                        {{ item.hangLabel }} > {{ item.mokLabel }} > {{ item.saemokLabel }}
                        : {{ formatMoney(Math.abs(item.remaining)) }}원 초과 ({{ formatRate(item.rate) }})
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import './style.css'

export default {
    props: {
        selectedPeriod: Object,
        budgetList: Array,
        ledgerList: Array,
        hangList: Array,
        mokList: Array,
        saemokList: Array
    },

    computed: {
        budgetItems() {
            if (!this.budgetList || !this.ledgerList) return [];

            return this.budgetList.map(budget => {
                const income = this.ledgerList
                    .filter(l => l.hang === budget.hang && l.mok === budget.mok && l.saemok === budget.saemok && l.gwan === '수입')
                    .reduce((sum, l) => sum + (l.money || 0), 0);

                const spent = this.ledgerList
                    .filter(l => l.hang === budget.hang && l.mok === budget.mok && l.saemok === budget.saemok && l.gwan === '지출')
                    .reduce((sum, l) => sum + (l.money || 0), 0);

                const incomeBudget = budget.income_budget || 0;
                const expenseBudget = budget.expense_budget || 0;
                const calc = this.calcRemainingAndRate(incomeBudget, income, expenseBudget, spent);

                return {
                    id: budget.id,
                    hang: budget.hang,
                    mok: budget.mok,
                    saemok: budget.saemok,
                    hangLabel: this.getLabel('hang', budget.hang),
                    mokLabel: this.getLabel('mok', budget.mok),
                    saemokLabel: this.getLabel('saemok', budget.saemok),
                    incomeBudget,
                    expenseBudget,
                    income,
                    spent,
                    remaining: calc.remaining,
                    rate: calc.rate
                };
            }).sort((a, b) => {
                const hp = this.getPriority('hang', a.hang) - this.getPriority('hang', b.hang);
                if (hp !== 0) return hp;
                const mp = this.getPriority('mok', a.mok) - this.getPriority('mok', b.mok);
                if (mp !== 0) return mp;
                return this.getPriority('saemok', a.saemok) - this.getPriority('saemok', b.saemok);
            });
        },

        // 목별 소계 맵
        mokSubtotals() {
            const map = {};
            for (const item of this.budgetItems) {
                const key = `${item.hang}_${item.mok}`;
                if (!map[key]) {
                    map[key] = { hang: item.hang, mok: item.mok, hangLabel: item.hangLabel, mokLabel: item.mokLabel, incomeBudget: 0, expenseBudget: 0, income: 0, spent: 0 };
                }
                map[key].incomeBudget += item.incomeBudget;
                map[key].expenseBudget += item.expenseBudget;
                map[key].income += item.income;
                map[key].spent += item.spent;
            }
            for (const key in map) {
                const m = map[key];
                const calc = this.calcRemainingAndRate(m.incomeBudget, m.income, m.expenseBudget, m.spent);
                m.remaining = calc.remaining;
                m.rate = calc.rate;
            }
            return map;
        },

        // 항별 소계 맵
        hangSubtotals() {
            const map = {};
            for (const item of this.budgetItems) {
                if (!map[item.hang]) {
                    map[item.hang] = { hangLabel: item.hangLabel, incomeBudget: 0, expenseBudget: 0, income: 0, spent: 0 };
                }
                map[item.hang].incomeBudget += item.incomeBudget;
                map[item.hang].expenseBudget += item.expenseBudget;
                map[item.hang].income += item.income;
                map[item.hang].spent += item.spent;
            }
            for (const hang in map) {
                const h = map[hang];
                const calc = this.calcRemainingAndRate(h.incomeBudget, h.income, h.expenseBudget, h.spent);
                h.remaining = calc.remaining;
                h.rate = calc.rate;
            }
            return map;
        },

        totals() {
            const incomeBudget = this.budgetItems.reduce((sum, i) => sum + i.incomeBudget, 0);
            const expenseBudget = this.budgetItems.reduce((sum, i) => sum + i.expenseBudget, 0);
            const income = this.budgetItems.reduce((sum, i) => sum + i.income, 0);
            const spent = this.budgetItems.reduce((sum, i) => sum + i.spent, 0);
            const calc = this.calcRemainingAndRate(incomeBudget, income, expenseBudget, spent);
            return {
                incomeBudget,
                expenseBudget,
                income,
                spent,
                remaining: calc.remaining,
                rate: calc.rate
            };
        },

        overBudgetItems() {
            return this.budgetItems.filter(item => item.expenseBudget > 0 && item.remaining < 0);
        },

        // 모든 행 (항 > 목 > 세목 계층 구조) 생성
        allRows() {
            const rows = [];
            let currentHang = null;
            let currentMok = null;

            for (let i = 0; i < this.budgetItems.length; i++) {
                const item = this.budgetItems[i];

                // 새로운 항이 시작되면 항 행 추가
                if (currentHang !== item.hang) {
                    currentHang = item.hang;
                    currentMok = null;
                    const st = this.hangSubtotals[item.hang];
                    rows.push({ type: 'hang', ...st });
                }

                // 새로운 목이 시작되면 목 행 추가
                if (currentMok !== item.mok) {
                    currentMok = item.mok;
                    const key = `${item.hang}_${item.mok}`;
                    const st = this.mokSubtotals[key];
                    rows.push({ type: 'mok', ...st });
                }

                // 세목 행 추가
                rows.push({ type: 'item', ...item });
            }
            return rows;
        },

        pagedBudgetItems() {
            const FIRST_PAGE_ROWS = 16;
            const OTHER_PAGE_ROWS = 22;
            const rows = this.allRows;

            if (rows.length === 0) return [{ rows: [], includeTotal: true }];

            const pages = [];
            let i = 0;

            while (i < rows.length) {
                const maxRows = pages.length === 0 ? FIRST_PAGE_ROWS : OTHER_PAGE_ROWS;
                const pageRows = rows.slice(i, i + maxRows);
                const isLastPage = i + maxRows >= rows.length;

                pages.push({
                    rows: pageRows,
                    includeTotal: isLastPage
                });

                i += maxRows;
            }

            return pages;
        }
    },

    methods: {
        getLabel(type, id) {
            const list = type === 'hang' ? this.hangList : type === 'mok' ? this.mokList : this.saemokList;
            return list?.find(a => a.id === id)?.label || '-';
        },

        getPriority(type, id) {
            const list = type === 'hang' ? this.hangList : type === 'mok' ? this.mokList : this.saemokList;
            return list?.find(a => a.id === id)?.priority ?? 9999;
        },

        formatDate(num) {
            if (!num) return '';
            const s = String(num);
            return `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}`;
        },

        formatMoney(amount) {
            return (amount || 0).toLocaleString();
        },

        formatExpense(amount) {
            return (!amount || amount === 0) ? '0' : '-' + amount.toLocaleString();
        },

        // 초과율 포맷팅 (+/-% 표시)
        formatRate(rate) {
            if (rate === 0) return '0%';
            return rate > 0 ? `+${rate}%` : `${rate}%`;
        },

        // 초과율에 따른 클래스 반환
        getRateClass(rate) {
            if (rate > 0) return 'over-income';
            if (rate < 0) return 'over-expense';
            return '';
        },

        // 잔액과 초과율 계산
        // 0% = 예산대로, +% = 수입초과, -% = 지출초과
        calcRemainingAndRate(incomeBudget, income, expenseBudget, spent) {
            // 잔액: 지출예산이 있으면 지출 잔액, 없으면 수입 잔액
            const remaining = expenseBudget > 0
                ? expenseBudget - spent
                : incomeBudget - income;

            // 초과율 계산
            let rate = 0;

            // 수입 초과분 (양수)
            const incomeExcess = incomeBudget > 0 ? income - incomeBudget : 0;
            // 지출 초과분 (음수로 표현)
            const expenseExcess = expenseBudget > 0 ? spent - expenseBudget : 0;

            // 총 예산 대비 초과율
            const totalBudget = incomeBudget + expenseBudget;
            if (totalBudget > 0) {
                // 수입초과는 +, 지출초과는 -
                rate = Math.round((incomeExcess - expenseExcess) / totalBudget * 100);
            }

            return { remaining, rate };
        }
    }
}
</script>

<style scoped>
.summary-section { margin-bottom: var(--spacing-lg); }

.summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: var(--spacing-sm);
}
.summary-table th, .summary-table td {
    padding: var(--table-cell-padding);
    border: 1px solid var(--medium-color);
    text-align: center;
    font-size: var(--font-size-base);
}
.summary-table th { background-color: var(--light-color); font-weight: var(--font-weight-semibold); }
.summary-table td { font-weight: var(--font-weight-bold); font-size: var(--font-size-base); }

.warning-section {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-sm);
    border-top: 1px solid var(--medium-color);
    font-size: var(--font-size-sm);
}
.warning-title { font-weight: var(--font-weight-bold); margin-bottom: var(--spacing-sm); }
.warning-list { margin: 0; padding-left: var(--spacing-lg); }
.warning-list li { margin-bottom: var(--spacing-xs); }

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .summary-table th,
[data-theme="dark"] .summary-table th {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) .summary-table td,
[data-theme="dark"] .summary-table td {
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .warning-section,
[data-theme="dark"] .warning-section {
    border-top-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .warning-title,
[data-theme="dark"] .warning-title {
    color: var(--danger-400);
}

:deep([data-theme="dark"]) .warning-list,
[data-theme="dark"] .warning-list {
    color: var(--text-secondary);
}
</style>
