<template>
    <div class="MokBlock">
        <div class="MokHeader">
            <div class="mok-info" @click.stop>
                <span class="mok-priority">{{ zeroPad(mok.priority, 3) }}</span> 
                <InlineEditor
                    v-if="canEdit"
                    :value="mok.label"
                    class="mok-label"
                    @change="$emit('change-label', 'Mok', mok, $event)"> 
                </InlineEditor>
                <span class="mok-label" v-else>{{ mok.label }}</span>
            </div>
            <div class="mok-toolbar" v-if="canEdit">
                <button
                    type="button"
                    class="icon-btn danger"
                    :aria-label="`${mok.label} 목 지우기`"
                    @click="$emit('delete-mok')"
                >
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                </button>
            </div>
        </div>
        
        <div class="specific-saemok-manage">
            
            <label class="not-need-switch" v-if="canEdit">
                <input type="checkbox" 
                    :checked="isAbleSpecificSaemok[mok.id]"
                    @change="onSwitchChange"/>
                <span class="slider"></span>
                <span class="text">세목 조건 부여</span>
            </label>

            <div class="specific-saemok-already-options" v-if="mok.is_able_specific_saemok">
                <span class="description">※ <strong>{{ mok.label}}</strong>목에서는 아래의 세목들만 계정 가능</span>
                <span class="option" v-for="option in getAbleSpecificSaemokList" :key="option.id">
                    <div class="option-label">
                        <span class="specific-saemok-priority">{{ zeroPad(option.priority, 4) }}</span>
                        {{ option.label }}
                    </div>
                    <button
                        v-if="canEdit"
                        type="button"
                        class="option-delete"
                        :aria-label="`${option.label} 세목 조건에서 빼기`"
                        @click="changeSpecificSaemokList(option)"
                    >
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </span>
            </div>

            <button
                type="button"
                class="add-specific-saemok-option"
                v-if="mok.is_able_specific_saemok && canEdit"
                aria-haspopup="dialog"
                @click="$emit('change-modal-status', mok.id)"
            >
                <i class="bi bi-plus-lg" aria-hidden="true"></i> 세목 고르기
            </button>

            <AppModal
                v-if="modalStatus[mok.id]"
                title="세목 고르기"
                icon="bi-diagram-3"
                :description="`${mok.label} 목에서 쓸 수 있는 세목만 고릅니다. 눌러서 넣고 뺍니다.`"
                size="md"
                @close="$emit('change-modal-status', mok.id)"
            >
                <ul class="modal-content-saemok-list">
                    <li v-for="option in saemoks" :key="option.id">
                        <button
                            type="button"
                            class="option"
                            :class="getSpecificSaemokIdList.includes(option.id) ? 'saemok-select' : 'saemok-not-select'"
                            :aria-pressed="getSpecificSaemokIdList.includes(option.id) ? 'true' : 'false'"
                            @click="changeSpecificSaemokList(option)"
                        >
                            <span class="specific-saemok-priority num">{{ zeroPad(option.priority, 4) }}</span>
                            <span class="option-label">{{ option.label }}</span>
                            <i
                                :class="['bi', getSpecificSaemokIdList.includes(option.id) ? 'bi-check-lg' : 'bi-plus-lg']"
                                aria-hidden="true"
                            ></i>
                        </button>
                    </li>
                </ul>

                <template #footer>
                    <span class="picked-count">{{ getSpecificSaemokIdList.length }}개 고름</span>
                    <button type="button" class="btn btn-primary" @click="$emit('change-modal-status', mok.id)">다 골랐어요</button>
                </template>
            </AppModal>

        </div>
    </div>
</template>

<script>
import InlineEditor from './InlineEditor.vue'
import AppModal from '../layout/AppModal.vue'

export default {
    name: 'MokBlock',
    components: { InlineEditor, AppModal },
    
    // 부모(HangBlock/AssetHierarchyManager)로부터 필요한 데이터를 props로 받습니다.
    props: {
        canEdit: {type :Boolean, required:true},
        mok: { type: Object, required: true },
        saemoks: { type: Array, default: () => [] }, // 전체 세목 리스트
        isAbleSpecificSaemok: { type: Object, default: () => ({}) }, // Mok별 스위치 상태 맵
        modalStatus: { type: Object, default: () => ({}) }, // Mok별 모달 상태 맵
        specificSaemokList: { type: Object, default: () => ({}) }, // Mok별 허용된 세목 레코드 리스트 맵
    },
    
    computed: {
        // 현재 Mok에 허용된 세목들의 ID만 추출
        getSpecificSaemokIdList() {
            const list = this.specificSaemokList[this.mok.id] || [];
            return list.map(item => item.id);
        },
        // 현재 Mok에 허용된 세목 레코드들을 우선순위에 따라 정렬하여 반환
        getAbleSpecificSaemokList() {
            const list = this.specificSaemokList[this.mok.id] || [];
            return list.sort((a, b) => a.priority - b.priority);
        }
    },
    
    methods: {
        // ---- 유틸리티 함수 ----
        zeroPad(number, desiredLength){
            return String(number).padStart(desiredLength, '0');
        },
        
        // ---- 이벤트 위임 (자식 이벤트를 받아서 부모에게 전달) ----
        
        // 세목 조건 부여 스위치 변경 시
        onSwitchChange() {
            // 부모 컴포넌트에게 Mok 객체를 전달하여 상태 변경 요청
            this.$emit('change-mok-able-saemok', this.mok);
        },
        
        // 허용 세목 목록 추가/제거 시
        changeSpecificSaemokList(saemok) {
            // 부모 컴포넌트에게 Mok ID와 변경할 Saemok 객체를 전달하여 리스트 변경 요청
            this.$emit('change-specific-list', this.mok.id, saemok);
        },
    }
}
</script>

<style scoped>
.MokBlock {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    min-width: 260px;
    max-width: 320px;
    padding: var(--spacing-4);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    transition: border-color var(--transition-fast);
}

.MokBlock:hover {
    border-color: var(--border-color-strong);
}

.MokHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    cursor: grab;
}

.MokHeader:active {
    cursor: grabbing;
}

.mok-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
}

.mok-label {
    font-size: var(--text-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.mok-priority {
    flex-shrink: 0;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
}

.mok-toolbar {
    flex-shrink: 0;
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

.icon-btn.danger:hover {
    background: var(--danger-50);
    color: var(--danger-600);
}

[data-theme="dark"] .icon-btn.danger:hover {
    background: rgb(239 68 68 / 0.16);
    color: var(--danger-300);
}

/* -------------------- 세목 조건 -------------------- */
.specific-saemok-manage {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
}

.not-need-switch {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
}

.not-need-switch input {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

/* 예전의 직접 그린 스위치는 접히는 곳이 많아 기본 체크박스로 되돌렸다 */
.not-need-switch .slider {
    display: none;
}

.specific-saemok-already-options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
}

.description {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: var(--line-height-normal);
}

.option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--border-radius-sm);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    font-size: var(--text-sm);
}

.option-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
}

.option-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-xs);
}

.option-delete:hover {
    background: var(--danger-50);
    color: var(--danger-600);
}

[data-theme="dark"] .option-delete:hover {
    background: rgb(239 68 68 / 0.16);
    color: var(--danger-300);
}

.add-specific-saemok-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    width: 100%;
    min-height: 32px;
    padding: 0 var(--spacing-3);
    border: 1px dashed var(--border-color-strong);
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    transition: border-color var(--transition-fast), color var(--transition-fast);
}

.add-specific-saemok-option:hover {
    border-color: var(--primary-600);
    color: var(--primary-700);
}

[data-theme="dark"] .add-specific-saemok-option:hover {
    color: var(--primary-300);
}

.specific-saemok-priority {
    flex-shrink: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
}

/* -------------------- 세목 고르는 창 -------------------- */
.modal-content-saemok-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-2);
    margin: 0;
    padding: 0;
    list-style: none;
}

.modal-content-saemok-list .option {
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--transition-fast), border-color var(--transition-fast),
        color var(--transition-fast);
}

/* 고른 것과 안 고른 것을 테두리와 표시로 함께 가른다 — 색만으로는 못 가른다 */
.modal-content-saemok-list .option.saemok-select {
    background: var(--bg-active);
    border-color: var(--primary-300);
    color: var(--primary-700);
    font-weight: var(--font-weight-semibold);
}

.modal-content-saemok-list .option.saemok-not-select:hover {
    background: var(--bg-hover);
}

[data-theme="dark"] .modal-content-saemok-list .option.saemok-select {
    border-color: var(--primary-700);
    color: var(--primary-200);
}

.picked-count {
    margin-right: auto;
    color: var(--text-muted);
    font-size: var(--text-sm);
}
</style>
