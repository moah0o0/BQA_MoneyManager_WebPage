<template>
<tr v-if="row.kind === 'hang'" class="hang-row">
    <td colspan="2">
        <AssetsLabel asset-type="Hang" :asset="row.hang" />
        <!-- 항이 쪽을 넘어갔을 때, 무슨 항을 보고 있는지 다시 알려 준다 -->
        <span v-if="row.continued" class="continued">(이어서)</span>
    </td>
    <!-- 이어지는 머리에 합계를 또 적으면 두 번 더한 것처럼 보인다 -->
    <td class="amount">{{ row.continued ? '' : money(row.hang.incomeTotal) }}</td>
    <td class="amount">{{ row.continued ? '' : money(row.hang.expenseTotal) }}</td>
    <td class="amount">{{ row.continued ? '' : money(row.hang.differenceTotal) }}</td>
</tr>

<tr v-else-if="row.kind === 'mok'" class="mok-row">
    <td></td>
    <td><AssetsLabel asset-type="Mok" :asset="row.mok" /></td>
    <td class="amount">{{ money(row.mok.income) }}</td>
    <td class="amount">{{ money(row.mok.expense) }}</td>
    <td class="amount">{{ money(row.mok.difference) }}</td>
</tr>

<tr v-else class="total-row">
    <td colspan="2">총계</td>
    <td class="amount">{{ money(row.income) }}</td>
    <td class="amount">{{ money(row.expense) }}</td>
    <td class="amount">{{ money(row.difference) }}</td>
</tr>
</template>

<script>
import AssetsLabel from './AssetsLabel.vue'
import { formatCurrency } from './format.js'

export default {
    components: { AssetsLabel },
    props: { row: { type: Object, required: true } },
    methods: { money: formatCurrency },
}
</script>

<style scoped>
.continued {
    margin-left: 0.4em;
    font-weight: var(--font-weight-normal);
    color: var(--medium-color);
}
</style>
