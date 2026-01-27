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
                <i class="bi bi-trash3" @click="$emit('delete-mok')"></i>
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
                    <div v-if="canEdit" class="option-delete" @click="changeSpecificSaemokList(option)">
                        <i class="bi bi-x-square-fill"></i>
                    </div>
                </span>
            </div>

            <div class="add-specific-saemok-option" v-if="mok.is_able_specific_saemok && canEdit" @click="$emit('change-modal-status', mok.id)">
                <i class="bi bi-patch-plus-fill"></i> 추가하기
            </div>

            <Teleport to="body">
                <div class="modal-specific-saemok" v-if="modalStatus[mok.id]" @click.self="$emit('change-modal-status', mok.id)">
                    <div class="modal-add-specific-saemok">
                        <div class="modal-header">
                            <div class="modal-info">
                                <span class="modal-title">세목 조건 추가</span>
                                <span class="modal-description"><strong>{{ mok.label }}</strong>목에서 허용할 세목을 모두 선택하세요.</span>
                                <span class="modal-description-small">※ 클릭하시면 추가/제외가 가능합니다.</span>
                            </div>
                            <div class="modal-exit" @click="$emit('change-modal-status', mok.id)">
                                <i class="bi bi-x-lg"></i>
                            </div>
                        </div>
                        <div class="modal-content-saemok-list">
                            <span class="option"
                                v-for="option in saemoks"
                                :key="option.id"
                                :class="getSpecificSaemokIdList.includes(option.id) ? 'saemok-select' : 'saemok-not-select'"
                                @click="changeSpecificSaemokList(option)">
                                <div class="option-label">
                                    <span class="specific-saemok-priority">{{ zeroPad(option.priority, 4) }}</span>
                                    {{ option.label }}
                                </div>
                            </span>
                        </div>
                    </div>
                </div>
            </Teleport>

        </div>
    </div>
</template>

<script>
import InlineEditor from './InlineEditor.vue' // 경로를 확인해주세요.

export default {
    name: 'MokBlock',
    components: { InlineEditor },
    
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
/* -------------------- Mok 블록 (중분류) 스타일 -------------------- */
.MokBlock{
    display: flex;
    flex-direction: column;
    gap: 15px; 

    flex-shrink: 0; 
    width: fit-content; 

    min-width: 250px; 
    padding: 20px;

    background-color: var(--none-color);
    border-radius: 6px;
    border: 1px solid var(--border-color, #f0f0f0);
    transition: box-shadow 0.2s;
}

.MokBlock:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* -------------------- Mok Header 스타일 -------------------- */
.MokHeader{
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%; 
}

.mok-info{
    display: flex;
    gap: 10px;
    align-items: center;
    
    flex-grow: 1; 
    min-width: 0; 
    overflow: hidden; 
    
    cursor: grab; /* 드래그 가능함을 표시 */
}

.mok-label {
    font-size: 17px;
    font-weight: 700;
    
    white-space: normal;
    word-break: break-word; 
    flex-shrink: 1; 
    min-width: 0;
    overflow: hidden;
    color: var(--strong-color);
}

.mok-priority{
    font-size: 0.8em;
    font-weight: 400;
    color: var(--medium-color);
    flex-shrink: 0;
}

.mok-toolbar {
    flex-shrink: 0;
    padding-left: 10px; 
}

.mok-toolbar > i {
    font-size: 1.2em;
    color: var(--medium-color);
    cursor: pointer;
    transition: color 0.2s;
}

.mok-toolbar > i:hover {
    color: var(--strong-color);
}

/* -------------------- 세목 조건 관리 스타일 -------------------- */
.specific-saemok-manage {
    border-top: 1px dotted var(--medium-color);
    font-size: 0.9em;

    display: flex;
    flex-direction: column;
    margin-top: 5px;
    padding-top: 15px;
    gap: 20px;
}

.specific-saemok-already-options {
    display: flex;
    flex-direction: column;
    gap: 10px; /* 목록 간 간격 조정 */
}

/* 세목 목록 항목 스타일 */
.option {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: var(--light-color);
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    font-weight: 600;
    color: var(--strong-color);
}

.option-label {
    display: flex;
    align-items: center;
    gap: 10px;
}

.option-delete {
    cursor: pointer;
    color: var(--medium-color);
    transition: color 0.2s;
}

.option-delete:hover {
    color: var(--danger-color);
}

.add-specific-saemok-option { 
    cursor: pointer;
    background: var(--success-color);
    padding:5px;
    text-align: center;
    border-radius: 8px;
    color: var(--none-color);
    font-weight: 800;
    transition: all 0.2s ease;
}  

.add-specific-saemok-option:hover {
    background-color: var(--none-color);
    color: var(--success-color);
}


.specific-saemok-priority {
    font-size: 0.8em;
    font-weight: 400;
    flex-shrink: 0;
}


span.description {
    font-size: 1em;
    color: var(--medium-color);
}

/* 세목 조건 부여 스위치 스타일 */
.not-need-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}
.not-need-switch input {
  display: none;
}
.not-need-switch .slider {
  width: 40px;
  height: 20px;
  border-radius: 20px;
  background: var(--medium-color);
  position: relative;
  transition: 0.3s;
  cursor: pointer;
}
.not-need-switch .slider::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--none-color);
  transition: 0.3s;
}
.not-need-switch input:checked + .slider {
  background: var(--success-color);
}
.not-need-switch input:checked + .slider::before {
  transform: translateX(20px);
}
.not-need-switch .text {
  font-size: 15px;
  font-weight: 600;
  color: var(--strong-color);
}



/* -------------------- 기타 및 드래그 관련 -------------------- */
.MokHeader:active {
    cursor: grabbing;
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .MokBlock,
[data-theme="dark"] .MokBlock {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) .MokBlock:hover,
[data-theme="dark"] .MokBlock:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep([data-theme="dark"]) .mok-label,
[data-theme="dark"] .mok-label {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .mok-priority,
[data-theme="dark"] .mok-priority {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .mok-toolbar > i,
[data-theme="dark"] .mok-toolbar > i {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .mok-toolbar > i:hover,
[data-theme="dark"] .mok-toolbar > i:hover {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .specific-saemok-manage,
[data-theme="dark"] .specific-saemok-manage {
    border-top-color: var(--border-color);
}

:deep([data-theme="dark"]) .option,
[data-theme="dark"] .option {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:deep([data-theme="dark"]) .option-delete,
[data-theme="dark"] .option-delete {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .option-delete:hover,
[data-theme="dark"] .option-delete:hover {
    color: var(--danger-500);
}

:deep([data-theme="dark"]) span.description,
[data-theme="dark"] span.description {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .not-need-switch .slider,
[data-theme="dark"] .not-need-switch .slider {
    background: var(--gray-600);
}

:deep([data-theme="dark"]) .not-need-switch .slider::before,
[data-theme="dark"] .not-need-switch .slider::before {
    background: var(--gray-300);
}

:deep([data-theme="dark"]) .not-need-switch input:checked + .slider,
[data-theme="dark"] .not-need-switch input:checked + .slider {
    background: var(--success-500);
}

:deep([data-theme="dark"]) .not-need-switch .text,
[data-theme="dark"] .not-need-switch .text {
    color: var(--text-primary);
}


:deep([data-theme="dark"]) .add-specific-saemok-option,
[data-theme="dark"] .add-specific-saemok-option {
    background: var(--success-500);
    color: white;
}

:deep([data-theme="dark"]) .add-specific-saemok-option:hover,
[data-theme="dark"] .add-specific-saemok-option:hover {
    background-color: var(--bg-secondary);
    color: var(--success-500);
}
</style>

<!-- 모달 스타일 (Teleport로 body에 이동하므로 scoped 불가) -->
<style>
.modal-specific-saemok {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 999;
}

.modal-specific-saemok .modal-add-specific-saemok {
    width: 500px;
    max-width: 90vw;
    background-color: var(--none-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 50px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
}

.modal-specific-saemok .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 20px;
}

.modal-specific-saemok .modal-info {
    flex: 5;
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.modal-specific-saemok .modal-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--strong-color);
}

.modal-specific-saemok .modal-description {
    font-size: 15px;
    font-weight: 400;
    color: var(--strong-color);
}

.modal-specific-saemok .modal-description-small {
    font-size: 13px;
    font-weight: 500;
    color: var(--medium-color);
}

.modal-specific-saemok .modal-exit {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    height: 100%;
    cursor: pointer;
    color: var(--medium-color);
    transition: color 0.2s;
}

.modal-specific-saemok .modal-exit:hover {
    color: var(--danger-color);
}

.modal-specific-saemok .modal-content-saemok-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-height: 400px;
    overflow-y: auto;
}

.modal-specific-saemok .option {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: var(--light-color);
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    font-weight: 600;
    color: var(--strong-color);
}

.modal-specific-saemok .option-label {
    display: flex;
    align-items: center;
    gap: 10px;
}

.modal-specific-saemok .specific-saemok-priority {
    font-size: 0.8em;
    font-weight: 400;
    flex-shrink: 0;
}

.modal-specific-saemok .saemok-not-select {
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
}

.modal-specific-saemok .saemok-not-select:hover {
    background-color: var(--success-color);
    color: var(--none-color);
}

.modal-specific-saemok .saemok-select {
    cursor: pointer;
    background-color: var(--success-color);
    color: var(--none-color);
    transition: background-color 0.2s, color 0.2s;
}

.modal-specific-saemok .saemok-select:hover {
    background-color: var(--light-color);
    color: var(--strong-color);
}

/* 다크모드 */
[data-theme="dark"] .modal-specific-saemok {
    background-color: rgba(0, 0, 0, 0.6);
}

[data-theme="dark"] .modal-specific-saemok .modal-add-specific-saemok {
    background-color: var(--bg-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .modal-specific-saemok .modal-title {
    color: var(--text-primary);
}

[data-theme="dark"] .modal-specific-saemok .modal-description {
    color: var(--text-primary);
}

[data-theme="dark"] .modal-specific-saemok .modal-description-small {
    color: var(--text-secondary);
}

[data-theme="dark"] .modal-specific-saemok .modal-exit {
    color: var(--text-secondary);
}

[data-theme="dark"] .modal-specific-saemok .modal-exit:hover {
    color: var(--danger-500);
}

[data-theme="dark"] .modal-specific-saemok .option {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .modal-specific-saemok .saemok-not-select:hover {
    background-color: var(--success-500);
    color: white;
}

[data-theme="dark"] .modal-specific-saemok .saemok-select {
    background-color: var(--success-500);
    color: white;
}

[data-theme="dark"] .modal-specific-saemok .saemok-select:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}
</style>