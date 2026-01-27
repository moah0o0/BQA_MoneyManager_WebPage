<template>
<div class="ReasonLabel" v-if="label != null">
    <span class="label" @click="$emit('open')">
        {{ label }}
    </span>

    <div class="dropdown" v-if="isOpen">
        <input
            :value="editText"
            @input="editText = $event.target.value"
            @keyup.enter="submitEdit"
            class="edit"
            type="text"
            placeholder="새로 넣을 내용을 입력하세요."
        />
        <button class="submit" @click="submitEdit">수정</button>
    </div>
</div>

</template>

<style scoped>


.label {
  cursor: pointer;
  display: flex;
  flex-direction: row;
  gap: 10px;
  font-size: 0.95em;
  transition: color 0.3s ease;
}
.label > i {
  height: 14px;
}
.label:hover {
  color: var(--medium-color);
}

.ReasonLabel {
  width: 100%;
  position: relative;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1;
  width: 100%;
  background: var(--none-color);
  border-radius: 8px;
  box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.3);
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.edit {
  flex: 1;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-subtle, #ddd);
  border-radius: 6px;
}

button.submit {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: var(--strong-color);
  color: #fff;
  cursor: pointer;
  transition: background 0.3s ease;
}
button.submit:hover {
  background: var(--medium-color);
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .label,
[data-theme="dark"] .label {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .label:hover,
[data-theme="dark"] .label:hover {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .dropdown,
[data-theme="dark"] .dropdown {
    background: var(--bg-secondary);
    box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.5);
}

:deep([data-theme="dark"]) .edit,
[data-theme="dark"] .edit {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .edit::placeholder,
[data-theme="dark"] .edit::placeholder {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) button.submit,
[data-theme="dark"] button.submit {
    background: var(--primary-600);
    color: white;
}

:deep([data-theme="dark"]) button.submit:hover,
[data-theme="dark"] button.submit:hover {
    background: var(--primary-500);
}

</style>

<script>

import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);


export default {
    props: ['ledgerRecordId', 'originalReasonText', 'isOpen'],
    emits: ['update-complete'], 
    data(){
        return {
            label: null,
            editText: null
        }
    },


    mounted(){
        this.labelInit()
    },

    watch: {
      isOpen(){
        if(this.isOpen == true) {
            this.editText = this.label !== '-' ? this.label : ''
        }
      }
    },
    
    methods: {

        labelInit(){
            this.label = this.originalReasonText || '-'
        },


        async submitEdit(){
            var update_body = {};
            update_body.reason = this.editText;
            try {
                await pb.collection('Ledger').update(this.ledgerRecordId, update_body);
                this.label = update_body.reason;
                this.$emit('update-complete')
                this.$emit('close'); // 부모 컴포넌트에 드롭다운을 닫으라고 알림
              } catch (error) {
                console.error("Failed to update reason:", error);
            }
        }


        
    }


}
</script>
