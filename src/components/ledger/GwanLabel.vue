<template>
    <template v-if="label">
        <span class="label">
            <div class="plus none-select" v-if="label == '수입'">+</div> 
            <div class="minus none-select" v-if="label == '지출'">-</div>
            {{ label }}
        </span>
    </template>

</template>

<style scoped>

.plus {
    font-weight: 600;
    color: var(--danger-color);

}

.minus {
    font-weight: 600;
    color: var(--primary-color);
}

.none-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .label,
[data-theme="dark"] .label {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .plus,
[data-theme="dark"] .plus {
    color: var(--income-color);
}

:deep([data-theme="dark"]) .minus,
[data-theme="dark"] .minus {
    color: var(--expense-color);
}

</style>

<script>

export default {
    props: ['label'],
}
</script>
