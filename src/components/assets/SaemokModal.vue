<template>
    <div class="modal-backdrop" @click="$emit('close')">
        <div class="modal-saemok-manage" @click.stop>
            <div class="modal-header">
                <div class="modal-info">
                    <span class="modal-title">세목 전체 관리</span>
                    <span class="modal-description" v-if="canEdit">모든 계정 세목의 순서를 변경하거나 레이블을 수정할 수 있습니다.</span>
                    <span class="modal-description" v-else>현재 아래와 같은 세목이 등록되어 있습니다</span>
                </div>
                <div class="modal-exit" @click="$emit('close')">
                    <i class="bi bi-x-lg"></i>
                </div>
            </div>

            <div class="SaemokBlock New" @click="$emit('create-saemok')" v-if="canEdit">
                <i class="bi bi-plus-circle-fill"></i>
                새 세목 추가
            </div>

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
                            <span class="saemok-priority">{{ zeroPad(saemok.priority, 4) }}</span>
                            <InlineEditor
                                v-if="canEdit"
                                :value="saemok.label"
                                class="saemok-label"
                                @change="$emit('change-label', 'Saemok', saemok, $event)">
                            </InlineEditor>
                            <span class="saemok-label" v-else>{{ saemok.label }}</span>
                        </div>

                        <div class="saemok-toolbar" v-if="canEdit">
                            <i class="bi bi-trash3" 
                                :class="{ 'disabled-trash': saemok.is_none_field }"
                                @click="!saemok.is_none_field && $emit('delete-saemok', saemok.id)">
                            </i>
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
                            <span class="saemok-priority">{{ zeroPad(saemok.priority, 4) }}</span>
                            <span class="saemok-label">{{ saemok.label }}</span>
                        </div>
                    </div>
                    </div>                   
                </template>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-close" @click="$emit('close')">닫기</button>
            </div>
        </div>
    </div>
</template>

<script>
import { VueDraggableNext as Draggable } from 'vue-draggable-next'
import InlineEditor from './InlineEditor.vue' // 경로를 확인해주세요.

export default {
    name: 'SaemokManageModal',
    components: { Draggable, InlineEditor },
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
/* -------------------- 모달 기본 스타일 -------------------- */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.modal-saemok-manage {
    width: 90%;
    max-width: 800px;
    max-height: 70%;
    background-color: var(--none-color);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    padding: 30px;
    overflow: hidden; /* 내부 스크롤을 위해 컨테이너는 오버플로우 숨김 */
}

/* -------------------- 모달 헤더 -------------------- */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 2px solid var(--border-color);
    margin-bottom: 20px;
}

.modal-info {
    display: flex;
    flex-direction: column;
}

.modal-title {
    font-size: 2em;
    font-weight: 800;
    color: var(--strong-color);
}

.modal-description {
    font-size: 0.9em;
    color: var(--strong-color);
    font-weight: 500;
    margin-top: 5px;
}

.modal-exit {
    font-size: 1.5em;
    color: var(--strong-color);
    cursor: pointer;
    transition: color 0.2s;
}

.modal-exit:hover {
    color: var(--dark-color);
}

/* -------------------- 세목 블록 스타일 (기존 Hang/Mok 참조) -------------------- */

.modal-content-saemok-list {
    flex-grow: 1;
    overflow-y: auto; /* 세목 목록에 스크롤 적용 */
    padding-right: 15px; /* 스크롤바 공간 확보 */
    margin-bottom: 20px;
}

/* MokBlockList와 유사한 스크롤바 디자인 적용 */
.modal-content-saemok-list::-webkit-scrollbar {
    width: 8px; 
}
.modal-content-saemok-list::-webkit-scrollbar-track {
    background: transparent;
}
.modal-content-saemok-list::-webkit-scrollbar-thumb {
    background-color: var(--medium-color);
    border-radius: 4px;
    border: 2px solid var(--light-color); 
    background-clip: padding-box;
}
.modal-content-saemok-list::-webkit-scrollbar-thumb:hover {
    background-color: var(--strong-color);
}

.draggable-saemok-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.SaemokBlock {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background-color: var(--light-color);
    border-radius: 6px;
    transition: background-color 0.2s, box-shadow 0.2s;
}

.SaemokBlock:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* "제한 없음" 기본값 필드 강조 스타일 */
.SaemokBlock.none-field {
    background-color: var(--info-color-light); /* 정보성 색상 변수 사용 (예: 연한 파랑) */
    border-color: var(--info-color); 
    font-weight: bold;
}

.saemok-info {
    display: flex;
    gap: 15px;
    align-items: center;
    cursor: grab; /* 드래그 가능함을 표시 */
    flex-grow: 1;
}

.saemok-label {
    font-size: 1.1em;
    font-weight: 600;
}

.saemok-priority{
    font-size: 0.9em;
    font-weight: 600;
    color: var(--medium-color);
    min-width: 40px; /* 순서에 따른 너비 고정 */
}

/* 드래그 상태일 때 커서 변경 */
.saemok-info:active {
    cursor: grabbing;
}

.saemok-toolbar > i {
    font-size: 1.2em;
    color: var(--medium-color);
    cursor: pointer;
    transition: color 0.2s;
    margin-left: 10px;
}

.saemok-toolbar > i:hover {
    color: var(--warning-color); /* 삭제는 경고 색상 변수 사용 */
}

.saemok-toolbar > i.disabled-trash {
    color: var(--border-color); /* 비활성화 색상 변수 사용 */
    cursor: not-allowed;
}

/* 세목 추가 버튼 (HangBlock.New, MokBlock.New 참조) */
.SaemokBlock.New {
    margin-bottom: 20px;
    border: 2px dashed var(--light-color);
    background-color: var(--white-color);
    
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 15px;
    
    color: var(--medium-color);
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.SaemokBlock.New:hover{
    color: var(--strong-color);
    border-color: var(--medium-color);
}

/* -------------------- 모달 푸터 -------------------- */
.modal-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
}

.btn-close {
    width: 100%;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: var(--strong-color);
    color: var(--none-color);
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-close:hover {
    background-color: var(--light-color);
    color: var(--strong-color);

}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .modal-backdrop,
[data-theme="dark"] .modal-backdrop {
    background-color: rgba(0, 0, 0, 0.7);
}

:deep([data-theme="dark"]) .modal-saemok-manage,
[data-theme="dark"] .modal-saemok-manage {
    background-color: var(--bg-secondary);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

:deep([data-theme="dark"]) .modal-header,
[data-theme="dark"] .modal-header {
    border-bottom-color: var(--border-color);
}

:deep([data-theme="dark"]) .modal-title,
[data-theme="dark"] .modal-title {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-description,
[data-theme="dark"] .modal-description {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .modal-exit,
[data-theme="dark"] .modal-exit {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .modal-exit:hover,
[data-theme="dark"] .modal-exit:hover {
    color: var(--danger-500);
}

:deep([data-theme="dark"]) .modal-content-saemok-list::-webkit-scrollbar-thumb,
[data-theme="dark"] .modal-content-saemok-list::-webkit-scrollbar-thumb {
    background-color: var(--gray-600);
    border-color: var(--bg-secondary);
}

:deep([data-theme="dark"]) .modal-content-saemok-list::-webkit-scrollbar-thumb:hover,
[data-theme="dark"] .modal-content-saemok-list::-webkit-scrollbar-thumb:hover {
    background-color: var(--gray-500);
}

:deep([data-theme="dark"]) .SaemokBlock,
[data-theme="dark"] .SaemokBlock {
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) .SaemokBlock:hover,
[data-theme="dark"] .SaemokBlock:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:deep([data-theme="dark"]) .SaemokBlock.none-field,
[data-theme="dark"] .SaemokBlock.none-field {
    background-color: var(--primary-900);
    border-color: var(--primary-700);
}

:deep([data-theme="dark"]) .saemok-label,
[data-theme="dark"] .saemok-label {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .saemok-priority,
[data-theme="dark"] .saemok-priority {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .saemok-toolbar > i,
[data-theme="dark"] .saemok-toolbar > i {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .saemok-toolbar > i:hover,
[data-theme="dark"] .saemok-toolbar > i:hover {
    color: var(--warning-500);
}

:deep([data-theme="dark"]) .saemok-toolbar > i.disabled-trash,
[data-theme="dark"] .saemok-toolbar > i.disabled-trash {
    color: var(--gray-600);
}

:deep([data-theme="dark"]) .SaemokBlock.New,
[data-theme="dark"] .SaemokBlock.New {
    border-color: var(--border-color);
    background-color: var(--bg-primary);
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .SaemokBlock.New:hover,
[data-theme="dark"] .SaemokBlock.New:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
}

:deep([data-theme="dark"]) .modal-footer,
[data-theme="dark"] .modal-footer {
    border-top-color: var(--border-color);
}

:deep([data-theme="dark"]) .btn-close,
[data-theme="dark"] .btn-close {
    background-color: var(--primary-600);
    color: white;
}

:deep([data-theme="dark"]) .btn-close:hover,
[data-theme="dark"] .btn-close:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}
</style>






