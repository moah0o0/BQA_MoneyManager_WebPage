<template>
    <AppModal
        title="세목 전체 관리"
        icon="bi-tags"
        :description="canEdit ? '세목의 이름을 고치거나 끌어서 차례를 바꿉니다.' : '지금 등록되어 있는 세목입니다.'"
        size="lg"
        @close="$emit('close')"
    >
        <button class="SaemokBlock New" type="button" @click="$emit('create-saemok')" v-if="canEdit">
            <i class="bi bi-plus-circle-fill" aria-hidden="true"></i>
            새 세목 추가
        </button>

        <div class="modal-content-saemok-list">
            <template v-if="canEdit">
            <Draggable
                :list="saemoks"
                item-key="id"
                class="draggable-saemok-list"
                handle=".saemok-info"
                @end="$emit('update-saemok-priority')">

                <div class="SaemokBlock"
                    v-for="saemok in saemoks"
                    :key="saemok.id"
                    :class="{ 'none-field': saemok.is_none_field }">

                    <div class="saemok-info">
                        <span class="saemok-priority num">{{ zeroPad(saemok.priority, 4) }}</span>
                        <InlineEditor
                            :value="saemok.label"
                            class="saemok-label"
                            @change="$emit('change-label', 'Saemok', saemok, $event)">
                        </InlineEditor>
                    </div>

                    <div class="saemok-toolbar">
                        <!-- 지울 수 없는 세목은 단추를 없애지 않고 흐리게 둔다 — 왜 못 지우는지 알 수 있게 -->
                        <button
                            type="button"
                            class="icon-btn danger"
                            :disabled="saemok.is_none_field"
                            :title="saemok.is_none_field ? '기본 세목이라 지울 수 없습니다' : '세목 지우기'"
                            :aria-label="saemok.is_none_field ? `${saemok.label}는 기본 세목이라 지울 수 없습니다` : `${saemok.label} 세목 지우기`"
                            @click="$emit('delete-saemok', saemok.id)">
                            <i class="bi bi-trash3" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </Draggable>
            </template>
            <template v-else>
                <div class="draggable-saemok-list">
                    <div class="SaemokBlock"
                        v-for="saemok in saemoks"
                        :key="saemok.id"
                        :class="{ 'none-field': saemok.is_none_field }">

                        <div class="saemok-info">
                            <span class="saemok-priority num">{{ zeroPad(saemok.priority, 4) }}</span>
                            <span class="saemok-label">{{ saemok.label }}</span>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <template #footer>
            <button type="button" class="btn btn-secondary" @click="$emit('close')">닫기</button>
        </template>
    </AppModal>
</template>

<script>
import { VueDraggableNext as Draggable } from 'vue-draggable-next'
import InlineEditor from './InlineEditor.vue'
import AppModal from '../layout/AppModal.vue'

export default {
    name: 'SaemokManageModal',
    components: { Draggable, InlineEditor, AppModal },
    emits: ['close', 'create-saemok', 'update-saemok-priority', 'delete-saemok', 'change-label'],
    props: {
        canEdit: {type :Boolean, required:true},
        saemoks: { // ASSETS_SAEMOK 배열을 받음
            type: Array,
            required: true
        }
    },
    methods: {
        zeroPad(number, desiredLength){
            return String(number).padStart(desiredLength, '0');
        },
    }
}
</script>

<style scoped>
.SaemokBlock {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
}

.SaemokBlock + .SaemokBlock {
    margin-top: var(--spacing-1);
}

.SaemokBlock.none-field {
    background: var(--bg-secondary);
    color: var(--text-secondary);
}

.SaemokBlock.New {
    width: 100%;
    justify-content: center;
    margin-bottom: var(--spacing-4);
    padding: var(--spacing-3);
    border: 1px dashed var(--border-color-strong);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    transition: border-color var(--transition-fast), color var(--transition-fast);
}

.SaemokBlock.New:hover {
    border-color: var(--primary-600);
    color: var(--primary-700);
}

[data-theme="dark"] .SaemokBlock.New:hover {
    color: var(--primary-300);
}

.saemok-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
    flex: 1;
    /* 끌어 옮기는 손잡이 */
    cursor: grab;
}

.saemok-priority {
    flex-shrink: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.saemok-label {
    font-size: var(--text-sm);
}

.modal-content-saemok-list {
    display: flex;
    flex-direction: column;
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-sm);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.icon-btn.danger:hover:not(:disabled) {
    background: var(--danger-50);
    color: var(--danger-600);
}

.icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

[data-theme="dark"] .icon-btn.danger:hover:not(:disabled) {
    background: rgb(239 68 68 / 0.16);
    color: var(--danger-300);
}
</style>
