<template>
<div :class="['sidebar', { 'mobile-open': isMobileOpen }]">
    <nav class="menuBar">
        <div
            v-for="item in menuItems"
            :key="item.id"
            :class="['item', { active: currentMenu === item.id }]"
            @click="handleMenuClick(item.id)"
        >
            <i :class="['bi', item.icon]"></i>
            <span class="item-name">{{ item.name }}</span>
        </div>
    </nav>
</div>
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
        }
    },

    data() {
        return {
            menuItems: [
                { id: 1, name: '장부', icon: 'bi-wallet2' },
                { id: 2, name: '계정과목', icon: 'bi-tag' },
                { id: 3, name: '공금보고서', icon: 'bi-file-earmark-medical' },
                { id: 4, name: '예산', icon: 'bi-calendar-check' },
                { id: 5, name: '예산현황', icon: 'bi-graph-up' }
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
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    padding: var(--spacing-lg) 0;
    z-index: 100;
    transition: transform var(--duration-300) var(--ease-out),
                background-color var(--duration-200) var(--ease-out);
}

.menuBar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 var(--spacing-sm);
}

.item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--border-radius-lg);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    background-color: transparent;
    cursor: pointer;
    transition: all var(--duration-200) var(--ease-out);
    user-select: none;
    -webkit-user-select: none;
}

.item i {
    font-size: 18px;
    width: 24px;
    text-align: center;
}

.item:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

.item.active {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
    color: white;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.item.active:hover {
    background: linear-gradient(135deg, var(--primary-400), var(--primary-500));
}

/* 반응형: 태블릿 & 모바일 */
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 280px;
        height: 100vh;
        padding-top: calc(var(--header-height) + var(--spacing-lg));
        transform: translateX(-100%);
        box-shadow: none;
        z-index: 200;
    }

    .sidebar.mobile-open {
        transform: translateX(0);
        box-shadow: var(--shadow-xl);
    }

    .item {
        padding: 14px 20px;
        font-size: 15px;
    }

    .item i {
        font-size: 20px;
    }
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .sidebar,
[data-theme="dark"] .sidebar {
    background: var(--bg-secondary);
    border-right-color: var(--border-color);
}

:deep([data-theme="dark"]) .item,
[data-theme="dark"] .item {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .item:hover,
[data-theme="dark"] .item:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .item.active,
[data-theme="dark"] .item.active {
    background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
    color: white;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

:deep([data-theme="dark"]) .item.active:hover,
[data-theme="dark"] .item.active:hover {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
}

@media (max-width: 768px) {
    :deep([data-theme="dark"]) .sidebar.mobile-open,
    [data-theme="dark"] .sidebar.mobile-open {
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
}
</style>
