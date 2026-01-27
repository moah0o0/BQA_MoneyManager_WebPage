<template>
    <component :is="editMode ? 'input' : 'span'"
               :class="{ 'editable-label': true, 'edit-mode': editMode }"
               :value="currentValue"                                        
               @click="enableEdit"
               @blur="saveEdit"
               @keyup.enter="saveEdit"
              @keyup.esc="cancelEdit"
               @input="handleInput"
               ref="input">
        
        <template v-if="!editMode">{{ currentValue }}</template>
    </component>
</template>

<script>
export default {
    props: {
        value: {
            type: String,
            required: true
        },
        // ... (다른 props 유지)
    },
    emits: ['change'],

    data() {
        return {
            editMode: false,
            currentValue: String(this.value) 
        }
    },

    watch: {
        // 부모의 'value' prop이 변경될 때만 'currentValue' 업데이트
        value(newVal) {
            this.currentValue = String(newVal); 
        }
    },

    methods: {
        enableEdit() {
            if (this.editMode) return;
            this.editMode = true;
            this.$nextTick(() => {
                // ... (focus 및 select 로직 유지) ...
                this.$refs.input.focus();
                this.$refs.input.select();
            });
        },
        handleInput(event) {
            this.currentValue = event.target.value;
        },

        saveEdit() {
            if (!this.editMode) return;
            this.editMode = false;

            const trimmedValue = this.currentValue.trim();
            
            if (trimmedValue && trimmedValue !== this.value) {
                this.$emit('change', trimmedValue);
            } else {
                this.currentValue = this.value; 
            }
        },
        cancelEdit() {
            if (!this.editMode) return;
            
            this.currentValue = this.value;
            this.editMode = false;
            this.$refs.input.blur(); 
        },

    }
}
</script>

<style scoped>
.editable-label {
    cursor: pointer;
    white-space: nowrap; /* 텍스트가 줄바꿈되지 않도록 설정 */
    min-width: 50px; /* 편집 모드일 때 너무 좁아지는 것을 방지 */
}

.edit-mode {
    cursor: text;
    padding: 2px 4px;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    outline: none;
    /* 인라인 편집 모드에서 span이 input으로 바뀌므로, 폰트 스타일을 부모로부터 상속받거나 명시해야 합니다. */
    font-size: inherit; 
    font-weight: inherit;
    font-family: inherit;
    box-sizing: border-box;
}

/* 텍스트가 input으로 대체되므로, 기본 스타일을 상속받도록 처리 */
input.edit-mode {
    background: var(--none-color);
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .editable-label,
[data-theme="dark"] .editable-label {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .edit-mode,
[data-theme="dark"] .edit-mode {
    border-color: var(--primary-500);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) input.edit-mode,
[data-theme="dark"] input.edit-mode {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}
</style>