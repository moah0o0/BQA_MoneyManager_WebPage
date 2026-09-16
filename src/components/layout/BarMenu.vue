<template>
<!--
    길잡이는 하는 일의 차례대로 묶는다 — 적고 → 짜고 → 뽑는다.
    다섯 항목이 평평하게 늘어서 있으면 매번 처음부터 읽어야 한다.
-->
<nav
    :id="id"
    :class="['sidebar', { 'mobile-open': isMobileOpen }]"
    aria-label="주요 메뉴"
>
    <ul class="menuBar">
        <template v-for="group in menuGroups" :key="group.label">
            <li class="group-label" aria-hidden="true">{{ group.label }}</li>
            <li v-for="item in group.items" :key="item.id">
                <button
                    type="button"
                    :class="['item', { active: currentMenu === item.id }]"
                    :aria-current="currentMenu === item.id ? 'page' : undefined"
                    @click="handleMenuClick(item.id)"
                >
                    <i :class="['bi', item.icon]" aria-hidden="true"></i>
                    <span class="item-name">{{ item.name }}</span>
                </button>
            </li>
        </template>
    </ul>
</nav>
</template>

<script>
export default {
    props: {
        currentMenu: {
            type: Number,
            default: 1
        },
        isMobileOpen: {
            type: Boolean,
            default: false
        },
        id: {
            type: String,
            default: 'main-nav'
        }
    },

    emits: ['changeMenu', 'close-mobile-menu'],

    data() {
        return {
            menuGroups: [
                {
                    label: '기록',
                    items: [
                        { id: 1, name: '장부', icon: 'bi-wallet2' },
                    ]
                },
                {
                    label: '설정',
                    items: [
                        { id: 2, name: '계정과목', icon: 'bi-tag' },
                        { id: 4, name: '예산', icon: 'bi-calendar-check' },
                    ]
                },
                {
                    label: '확인 · 출력',
                    items: [
                        { id: 5, name: '예산현황', icon: 'bi-graph-up' },
                        { id: 3, name: '공금보고서', icon: 'bi-file-earmark-medical' },
                    ]
                },
            ]
        }
    },

    methods: {
        handleMenuClick(menuId) {
            this.$emit('changeMenu', menuId)
            this.$emit('close-mobile-menu')
        }
    }
}
</script>

<style scoped>
.sidebar {
    position: fixed;
    left: 0;
    top: var(--header-height);
    width: var(--sidebar-width);
    height: calc(100vh - var(--header-height));
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    padding: var(--spacing-4) 0 var(--spacing-6);
    z-index: 100;
    transition: transform var(--duration-300) var(--ease-out);
}

.menuBar {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0 var(--spacing-3);
    list-style: none;
}

.group-label {
    margin: var(--spacing-4) 0 var(--spacing-1);
    padding: 0 var(--spacing-3);
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
}

.group-label:first-child {
    margin-top: 0;
}

.item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    border: none;
    border-radius: var(--border-radius-md);
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
    background-color: transparent;
    text-align: left;
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.item i {
    font-size: 1rem;
    width: 20px;
    text-align: center;
    color: var(--text-muted);
    transition: color var(--transition-fast);
}

.item:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
}

.item:hover i {
    color: var(--text-secondary);
}

/*
    고른 것은 옅은 바탕 + 왼쪽 선으로 알린다.
    보라 덩어리로 칠하면 길잡이가 화면에서 가장 센 것이 되는데,
    실제로 봐야 하는 것은 오른쪽 내용이다.
*/
.item.active {
    background-color: var(--bg-active);
    color: var(--primary-700);
    font-weight: var(--font-weight-bold);
}

.item.active i {
    color: var(--primary-600);
}

.item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 18px;
    border-radius: 0 3px 3px 0;
    background: var(--primary-600);
}

.item.active:hover {
    background-color: var(--primary-100);
}

/* 반응형: 태블릿 & 모바일 */
@media (max-width: 1024px) {
    .sidebar {
        top: 0;
        width: min(280px, 82vw);
        height: 100vh;
        padding-top: calc(var(--header-height) + var(--spacing-4));
        transform: translateX(-100%);
        z-index: 200;
    }

    .sidebar.mobile-open {
        transform: translateX(0);
        box-shadow: var(--shadow-xl);
    }

    .item {
        padding: var(--spacing-3) var(--spacing-3);
        font-size: var(--text-md);
    }

    .item i {
        font-size: 1.125rem;
    }
}

/* -------------------- 다크모드 -------------------- */
[data-theme="dark"] .item.active {
    color: var(--primary-300);
}

[data-theme="dark"] .item.active i {
    color: var(--primary-400);
}

[data-theme="dark"] .item.active::before {
    background: var(--primary-400);
}

[data-theme="dark"] .item.active:hover {
    background-color: var(--primary-900);
}
</style>
