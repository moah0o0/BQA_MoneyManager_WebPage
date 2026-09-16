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
        aria-label="장부내용 수정"
        :placeholder="placeholder || '장부내용을 적어 주세요'"
        :disabled="saving"
        :tabindex="tabindex"
        @keydown.enter.prevent="submitEdit('down')"
        @keydown.tab="onTab"
        @keydown.esc.prevent.stop="cancel"
        @blur="submitEdit(null)"
    />

    <button
        v-else
        type="button"
        class="reason-btn"
        :class="{ 'is-empty': isEmpty }"
        :disabled="disabled"
        :tabindex="tabindex"
        :aria-label="isEmpty
            ? (placeholder
                ? `장부내용 미입력. 눌러서 입력하면 거래 적요 ${placeholder} 가 미리 적힙니다`
                : '장부내용 미입력 — 눌러서 입력')
            : `장부내용: ${label}. 눌러서 수정`"
        @click="open"
        @keydown="onKeydown"
    >
        <span v-if="isEmpty && placeholder" class="ghost">{{ placeholder }}</span>
        <span v-else-if="isEmpty" class="require">미입력</span>
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
        /** 표가 탭 스톱 하나만 갖도록 바깥에서 정해 준다 */
        tabindex: { type: Number, default: 0 },
        /** 글자를 쳐서 열었을 때 이미 친 글자 */
        initialText: { type: String, default: null },
        /**
         * 아직 안 적었을 때 대신 보여 줄 글 — 은행에서 온 적요를 넣는다.
         * 적을 근거가 바로 그 적요라, 칸을 열지 않고도 보이는 편이 낫다.
         */
        placeholder: { type: String, default: '' },
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

            /*
              빈 칸을 열면 은행 적요를 미리 적어 둔다.
              장부내용은 열에 아홉이 적요를 그대로 쓰거나 조금 고쳐 쓰는 자리라,
              빈 칸에서 매번 새로 치게 할 까닭이 없다 — Enter 한 번이면 그대로 들어간다.
            */
            const suggested = this.isEmpty && this.placeholder ? this.placeholder : ''
            const fromTyping = this.initialText !== null

            this.editText = fromTyping
                ? this.initialText
                : (this.originalReasonText || suggested)

            this.$nextTick(() => {
                const el = this.$refs.inputRef
                if (!el) return
                el.focus()

                /*
                  미리 적어 둔 적요는 '내가 쓴 글'이 아니라 '쓸까요?'라는 제안이다.
                  통째로 골라 둬야 그대로 쓰려면 Enter, 아니면 바로 쳐서 갈아 쓸 수 있다.
                  내가 적어 둔 글은 이어 쓰도록 끝에 커서를 둔다.
                */
                if (!fromTyping && this.isEmpty && suggested) el.select()
                else el.setSelectionRange(el.value.length, el.value.length)
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
            // Space는 표가 '이 줄 고르기'에 쓴다
            if (e.key === 'Enter' || e.key === 'F2') {
                e.preventDefault()
                this.$emit('open')
            }
        },

        cancel() {
            this.editText = this.originalReasonText || ''
            this.$emit('close', { move: null })
        },

        /** Tab은 적은 것을 저장하고 옆 칸으로 넘어간다 */
        onTab(e) {
            e.preventDefault()
            this.submitEdit(e.shiftKey ? 'prev' : 'next')
        },

        /**
         * @param {'down'|'next'|'prev'|null} move 저장한 뒤 갈 곳.
         *        Enter는 아래로 — 같은 칸을 줄줄이 적어 내려가는 일이 많다.
         */
        async submitEdit(move){
            if (this.saving) return

            const next = (this.editText ?? '').trim()

            // 바뀐 것이 없으면 서버를 부르지 않는다
            if (next === (this.originalReasonText || '').trim()) {
                this.$emit('close', { move })
                return
            }

            this.saving = true
            try {
                await pb.collection('Ledger').update(this.ledgerRecordId, { reason: next });
                this.$emit('updated', next)
                this.$emit('close', { move })
            } catch (error) {
                console.error("Failed to update reason:", error);
                this.$emit('error', '장부내용을 저장하지 못했습니다.')
                this.$emit('close', { move: null })
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

/* 적요를 대신 놓은 자리. 값이 아니라 '아직 안 적음'으로 읽혀야 한다 */
.ghost {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
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
