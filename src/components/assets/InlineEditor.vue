<template>
    <!--
        보는 모습과 고치는 모습을 따로 둔다.
        예전에는 <component :is="editMode ? 'input' : 'span'">로 한 자리를 돌려썼는데,
        태그가 바뀌는 사이 ref가 아직 옛 요소(span)를 가리켜
        이름을 고칠 때마다 select is not a function 이 났다.
    -->
    <input
        v-if="editMode"
        ref="inputRef"
        v-bind="$attrs"
        class="editable-label edit-mode"
        :value="currentValue"
        :aria-label="ariaLabel || '이름 고치기'"
        @input="handleInput"
        @keydown.enter.prevent="saveEdit"
        @keydown.esc.prevent.stop="cancelEdit"
        @blur="saveEdit"
    />

    <!-- 눌리는 자리이므로 키보드로도 닿아야 한다 -->
    <span
        v-else
        v-bind="$attrs"
        class="editable-label"
        role="button"
        tabindex="0"
        :aria-label="`${currentValue} — 눌러서 이름 고치기`"
        @click="enableEdit"
        @keydown.enter.prevent="enableEdit"
        @keydown.f2.prevent="enableEdit"
    >{{ currentValue }}</span>
</template>

<script>
export default {
    /*
      뿌리가 둘(보는 span · 고치는 input)이라 Vue가 class를 저절로 물려주지 못한다.
      부모가 주는 hang-label 같은 것을 그리는 쪽에 직접 붙인다.
    */
    inheritAttrs: false,

    props: {
        value: {
            type: String,
            required: true
        },
        ariaLabel: {
            type: String,
            default: ''
        }
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
                const el = this.$refs.inputRef;
                if (!el) return;
                el.focus();
                // 이름은 통째로 갈아 쓰는 일이 많다 — 골라 둔 채로 연다
                el.select();
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
            this.currentValue = String(this.value);
            this.editMode = false;
        }
    }
}
</script>

<style scoped>
.editable-label {
    min-width: 50px;
    border-radius: var(--border-radius-sm);
    font: inherit;
    color: inherit;
}

span.editable-label {
    display: inline-block;
    padding: 2px 5px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

span.editable-label:hover {
    background: var(--bg-hover);
    border-color: var(--border-color);
}

.edit-mode {
    padding: 2px 5px;
    border: 1px solid var(--primary-600);
    background: var(--bg-primary);
    color: var(--text-primary);
    cursor: text;
    outline: none;
    box-sizing: border-box;
}

.edit-mode:focus {
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .edit-mode:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}
</style>
