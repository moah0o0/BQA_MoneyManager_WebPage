<template>
    <span v-if="label" class="gwan" :class="label === '수입' ? 'is-income' : 'is-expense'">
        <!-- 색만으로 수입/지출을 가르지 않는다. 기호를 함께 둔다 -->
        <span class="sign none-select" aria-hidden="true">{{ label === '수입' ? '+' : '−' }}</span>
        {{ label }}
    </span>
</template>

<style scoped>
.gwan {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
}

.sign {
    font-weight: var(--font-weight-bold);
}

/*
    수입은 파랑, 지출은 빨강.
    예전에는 수입에 --danger-color(빨강), 지출에 --primary-color(보라)가 붙어 있어
    금액 칸의 색과 서로 어긋났다.
*/
.gwan.is-income {
    color: var(--income-color);
}

.gwan.is-expense {
    color: var(--expense-color);
}

.none-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
</style>

<script>

export default {
    props: ['label'],
}
</script>
