<template>
    <Teleport to="body">
        <!--
            겹창 하나를 한 곳에서 만든다.
            화면마다 따로 만들면 어떤 창은 Esc가 먹고 어떤 창은 안 먹는다 —
            그런 화면은 쓰는 사람이 매번 다시 시험해 봐야 한다.
        -->
        <div
            class="app-modal-scrim"
            @mousedown.self="onScrimDown"
            @click.self="onScrimClick"
        >
            <div
                ref="dialogRef"
                class="app-modal"
                :class="[sizeClass, panelClass]"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="titleId"
                :aria-describedby="description ? descId : undefined"
                tabindex="-1"
                @keydown.esc.stop="onEsc"
                @keydown.tab="trapTab"
            >
                <div class="app-modal__head">
                    <div class="app-modal__titles">
                        <h2 :id="titleId" class="app-modal__title">
                            <i v-if="icon" :class="['bi', icon]" aria-hidden="true"></i>
                            <span>{{ title }}</span>
                        </h2>
                        <p v-if="description" :id="descId" class="app-modal__desc">{{ description }}</p>
                    </div>

                    <button
                        type="button"
                        class="app-modal__close"
                        aria-label="창 닫기"
                        @click="$emit('close')"
                    >
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>

                <div
                    ref="bodyRef"
                    class="app-modal__body scroll-thin"
                    :tabindex="bodyNeedsFocus ? 0 : undefined"
                    :role="bodyNeedsFocus ? 'group' : undefined"
                    :aria-label="bodyNeedsFocus ? title : undefined"
                >
                    <slot />
                </div>

                <div v-if="$slots.footer" class="app-modal__foot">
                    <slot name="footer" />
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
/** 포커스를 받을 수 있는 것들. 창 안에서만 Tab이 돌게 하려고 쓴다 */
const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',')

let seq = 0

export default {
    name: 'AppModal',

    props: {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        icon: { type: String, default: '' },
        /** sm(420) | md(560) | lg(760) | xl(960) */
        size: { type: String, default: 'md' },
        panelClass: { type: String, default: '' },
        /** 바깥을 눌러 닫을 수 있는지. 입력 중인 창은 false로 둔다 */
        closeOnScrim: { type: Boolean, default: true },
        /** 열릴 때 포커스를 줄 요소의 선택자. 없으면 창 자체에 준다 */
        initialFocus: { type: String, default: '' },
    },

    emits: ['close'],

    data() {
        seq += 1
        return {
            uid: seq,
            // 누른 자리와 뗀 자리가 다르면 닫지 않는다 —
            // 창 안에서 글을 끌어 선택하다 밖에서 손을 떼면 창이 닫혀 버린다
            scrimPressed: false,
            returnFocusTo: null,
            /*
              글만 길게 들어 있어 눌릴 것이 하나도 없는 창은
              마우스 휠로만 굴릴 수 있게 된다 — 그럴 때만 본문에 손이 닿게 한다.
            */
            bodyNeedsFocus: false,
        }
    },

    computed: {
        titleId() { return `app-modal-title-${this.uid}` },
        descId() { return `app-modal-desc-${this.uid}` },
        sizeClass() { return `is-${this.size}` },
    },

    mounted() {
        this.returnFocusTo = document.activeElement
        document.body.style.overflow = 'hidden'

        this.$nextTick(() => {
            const body = this.$refs.bodyRef
            if (body) {
                const scrolls = body.scrollHeight > body.clientHeight + 1
                this.bodyNeedsFocus = scrolls && body.querySelector(FOCUSABLE) === null
            }

            const target = this.initialFocus
                ? this.$refs.dialogRef?.querySelector(this.initialFocus)
                : null
            ;(target || this.$refs.dialogRef)?.focus()
        })
    },

    beforeUnmount() {
        document.body.style.overflow = ''
        // 창을 닫으면 열기 전 자리로 돌아가야 키보드로 이어서 쓸 수 있다
        if (this.returnFocusTo?.isConnected) this.returnFocusTo.focus()
    },

    methods: {
        onEsc() {
            this.$emit('close')
        },

        onScrimDown() {
            this.scrimPressed = true
        },

        onScrimClick() {
            const pressed = this.scrimPressed
            this.scrimPressed = false
            if (pressed && this.closeOnScrim) this.$emit('close')
        },

        /** Tab이 창 밖으로 새어 나가지 않게 한다 */
        trapTab(e) {
            const root = this.$refs.dialogRef
            if (!root) return

            const items = [...root.querySelectorAll(FOCUSABLE)]
                .filter(el => el.offsetParent !== null || el === document.activeElement)
            if (items.length === 0) return

            const first = items[0]
            const last = items[items.length - 1]
            const active = document.activeElement

            if (e.shiftKey && (active === first || active === root)) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && active === last) {
                e.preventDefault()
                first.focus()
            }
        },
    },
}
</script>

<style scoped>
.app-modal-scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-4);
    background: var(--bg-overlay);
    backdrop-filter: blur(3px);
    animation: fadeIn var(--duration-200) var(--ease-out);
}

.app-modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100vh - var(--spacing-8));
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-2xl);
    box-shadow: var(--shadow-2xl);
    animation: scaleIn var(--duration-200) var(--ease-out);
    overflow: hidden;
}

.app-modal.is-sm { max-width: 420px; }
.app-modal.is-md { max-width: 560px; }
.app-modal.is-lg { max-width: 760px; }
.app-modal.is-xl { max-width: 960px; }

.app-modal:focus {
    outline: none;
}

.app-modal__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-4);
    padding: var(--spacing-5) var(--spacing-5) var(--spacing-4);
    border-bottom: 1px solid var(--border-color);
}

.app-modal__titles {
    min-width: 0;
}

.app-modal__title {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.app-modal__title i {
    color: var(--primary-600);
}

[data-theme="dark"] .app-modal__title i {
    color: var(--primary-400);
}

.app-modal__desc {
    margin: var(--spacing-1) 0 0;
    font-size: var(--text-sm);
    color: var(--text-muted);
}

.app-modal__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--border-radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-base);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.app-modal__close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.app-modal__body {
    flex: 1;
    min-height: 0;
    padding: var(--spacing-5);
    overflow-y: auto;
    overscroll-behavior: contain;
}

.app-modal__foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--spacing-2);
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

@media (max-width: 640px) {
    .app-modal-scrim {
        padding: 0;
        align-items: flex-end;
    }

    .app-modal {
        max-width: none;
        max-height: 92vh;
        border-radius: var(--border-radius-2xl) var(--border-radius-2xl) 0 0;
        animation: slideUp var(--duration-300) var(--ease-out);
    }

    .app-modal__close {
        width: 42px;
        height: 42px;
    }
}
</style>
