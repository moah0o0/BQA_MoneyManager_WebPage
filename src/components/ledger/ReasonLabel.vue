<template>
<div class="ReasonLabel">
    <!--
        칸 안에서 바로 고친다.
        예전처럼 작은 창을 띄우고 '수정'을 또 눌러야 하면 한 줄 고치는 데 세 번을 눌러야 한다.
        Enter로 저장하고 Esc로 되돌린다 — 손이 키보드를 떠나지 않는다.
    -->
    <input
        v-if="isOpen"
        ref="inputRef"
        v-model="editText"
        type="text"
        class="reason-input"
        :aria-label="'장부내용 수정'"
        placeholder="장부내용을 적어 주세요"
        :disabled="saving"
        @keydown.enter.prevent="submitEdit"
        @keydown.esc.prevent.stop="cancel"
        @blur="submitEdit"
    />

    <button
        v-else
        type="button"
        class="reason-btn"
        :class="{ 'is-empty': isEmpty }"
        :disabled="disabled"
        :aria-label="isEmpty ? '장부내용 미입력 — 눌러서 입력' : `장부내용: ${label}. 눌러서 수정`"
        @click="open"
        @keydown="onKeydown"
    >
        <span v-if="isEmpty" class="require">미입력</span>
        <span v-else class="text">{{ label }}</span>
    </button>
</div>
</template>

<script>
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
    props: {
        ledgerRecordId: { required: true },
        originalReasonText: { type: String, default: '' },
        isOpen: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
    },

    emits: ['open', 'close', 'updated', 'error'],

    data(){
        return {
            editText: '',
            saving: false,
        }
    },

    computed: {
        label() {
            return this.originalReasonText || ''
        },

        isEmpty() {
            return !this.originalReasonText || this.originalReasonText.trim().length === 0
        },
    },

    watch: {
        isOpen(open){
            if (!open) return
            this.editText = this.originalReasonText || ''
            this.$nextTick(() => {
                const el = this.$refs.inputRef
                el?.focus()
                // 끝에 커서를 둔다 — 전체 선택이면 이어 적으려다 지워 버린다
                el?.setSelectionRange(el.value.length, el.value.length)
            })
        }
    },

    methods: {
        open() {
            if (this.disabled) return
            this.$emit('open')
        },

        onKeydown(e) {
            if (this.disabled) return
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') {
                e.preventDefault()
                this.$emit('open')
            }
        },

        cancel() {
            this.editText = this.originalReasonText || ''
            this.$emit('close')
        },

        async submitEdit(){
            if (this.saving) return

            const next = (this.editText ?? '').trim()

            // 바뀐 것이 없으면 서버를 부르지 않는다
            if (next === (this.originalReasonText || '').trim()) {
                this.$emit('close')
                return
            }

            this.saving = true
            try {
                await pb.collection('Ledger').update(this.ledgerRecordId, { reason: next });
                this.$emit('updated', next)
                this.$emit('close')
            } catch (error) {
                console.error("Failed to update reason:", error);
                this.$emit('error', '장부내용을 저장하지 못했습니다.')
                this.$emit('close')
            } finally {
                this.saving = false
            }
        }
    }
}
</script>

<style scoped>
.ReasonLabel {
    width: 100%;
}

.reason-btn {
    display: block;
    width: 100%;
    min-height: 30px;
    padding: var(--spacing-1) var(--spacing-2);
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: inherit;
    text-align: left;
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.reason-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-color);
}

.reason-btn:disabled {
    cursor: default;
}

.reason-btn .text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.require {
    display: inline-block;
    padding: 1px var(--spacing-2);
    border-radius: var(--border-radius-full);
    background: var(--warning-50);
    color: var(--warning-700);
    font-size: 0.85em;
    font-weight: var(--font-weight-semibold);
}

[data-theme="dark"] .require {
    background: rgb(245 158 11 / 0.16);
    color: var(--warning-200);
}

.reason-input {
    width: 100%;
    min-height: 30px;
    padding: var(--spacing-1) var(--spacing-2);
    border: 1px solid var(--primary-600);
    border-radius: var(--border-radius-sm);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
}

.reason-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .reason-input:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}
</style>
