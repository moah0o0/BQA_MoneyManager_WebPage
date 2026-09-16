<template>
<tr class="transaction-row">
    <td class="date-cell">
        <!-- 보고서 기간은 해를 넘길 수 있다. 연도를 빼면 몇 년 3월인지 알 수 없다 -->
        <span class="date">{{ row.date }}</span>
        <span class="time">{{ row.time }}</span>
    </td>
    <td class="gwan-cell">{{ row.gwan }}</td>
    <td class="account-cell">
        <span class="hang-label">{{ row.hang?.label || '-' }}</span>
        <span class="mok-label"> &gt; {{ row.mok?.label || '-' }}</span>
        <span class="saemok-label"> &gt; {{ row.saemok?.label || '-' }}</span>
    </td>
    <td class="content-cell">{{ row.content }}</td>
    <td
        class="amount-cell"
        :class="{ 'income-amount': row.gwan === '수입', 'expense-amount': row.gwan === '지출' }"
    >{{ row.gwan === '지출' ? '-' : '' }}{{ money(row.money) }}</td>
    <td class="receipt-cell">{{ row.receipt }}</td>
</tr>
</template>

<script>
import { formatCurrency } from './format.js'

export default {
    props: { row: { type: Object, required: true } },
    methods: { money: formatCurrency },
}
</script>

<style scoped>
.date-cell {
    text-align: center;
    white-space: nowrap;
}

.date-cell .date {
    display: block;
    font-size: var(--font-size-xs);
}

.date-cell .time {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--medium-color);
}

.gwan-cell {
    text-align: center;
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.account-cell {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-tight);
    word-break: keep-all;
}

.hang-label {
    font-weight: var(--font-weight-semibold);
}

.mok-label,
.saemok-label {
    color: var(--medium-color);
}

/* 한글은 낱말 가운데서 자르지 않는다. 다만 끊을 데가 없는 긴 글자는 어쩔 수 없이 끊는다 */
.content-cell {
    font-size: var(--font-size-sm);
    word-break: keep-all;
    overflow-wrap: anywhere;
}

.amount-cell {
    text-align: right;
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.receipt-cell {
    text-align: center;
    font-size: var(--font-size-xs);
}

/* -------------------- 다크모드 -------------------- */
[data-theme="dark"] .mok-label,
[data-theme="dark"] .saemok-label,
[data-theme="dark"] .date-cell .time {
    color: var(--text-secondary);
}
</style>
