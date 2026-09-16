<template>
<!-- 쪽마다 같은 머리글이 붙는다. 한 군데서만 고치면 되도록 떼어 두었다 -->
<div class="PAGE_HEADER">
    <div class="page-meta">
        <span class="subtitle">{{ organizationName }}</span>
        <span class="title">{{ title }}</span>
        <span class="description">{{ range }}</span>
    </div>
    <div class="page-info">
        <span class="currency-unit">(단위: 원)</span>
        <span class="page-number">총 {{ pageCount }}쪽 중 {{ pageNumber }}번째</span>
    </div>
</div>
</template>

<script>
export default {
    props: {
        organizationName: { type: String, default: '' },
        title: { type: String, required: true },
        range: { type: String, default: '' },
        pageNumber: { type: Number, default: 1 },
        pageCount: { type: Number, default: 1 },
    },
}
</script>
