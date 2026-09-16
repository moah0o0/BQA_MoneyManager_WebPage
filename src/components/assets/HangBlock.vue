<template>
    <div class="HangBlock">
        <div class="HangHeader">
            <div class="hang-info" @click.stop>
                <span class="hang-priority">{{ zeroPad(hang.priority, 3) }}</span>
                <InlineEditor
                    v-if="canEdit"    
                    :value="hang.label"
                    class="hang-label"
                    @change="onLabelChange('Hang', hang, $event)"> 
                </InlineEditor>
                <span class="hang-label" v-else>{{ hang.label }}</span>
            </div>
            <div class="hang-toolbar" v-if="canEdit">
                <button
                    type="button"
                    class="icon-btn danger"
                    :aria-label="`${hang.label} 항 지우기`"
                    @click="$emit('delete-hang', hang.id)"
                >
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                </button>
            </div>
        </div>

        <div class="MokBlockList">
            
            <button type="button" class="MokBlock New" v-if="canEdit" @click="$emit('create-mok')">
                <i class="bi bi-plus-circle-fill" aria-hidden="true"></i>
                <span>목 추가하기</span>
            </button>
            <template v-if="canEdit">
            <Draggable
                :list="moks"
                item-key="id"
                class="draggable-mok-list"
                handle=".MokHeader"
                @end="$emit('update-mok-priority', hang.id)"> 
                
                <MokBlock 
                    v-for="mok in moks" 
                    :key="mok.id" 
                    :mok="mok"
                    :saemoks="saemoks"
                    :isAbleSpecificSaemok="isAbleSpecificSaemok"
                    :modalStatus="modalStatus"
                    :specificSaemokList="specificSaemokList"
                    :can-edit="canEdit"
                    
                    @change-label="onLabelChange"
                    @delete-mok="$emit('delete-mok', mok.id, hang.id)"
                    @change-specific-list="changeSpecificSaemokList"
                    @change-mok-able-saemok="changeAbleSpecificSaemok"
                    @change-modal-status="changeModalStatusAddSpecificSaemok"
                />
            </Draggable>
            </template>
            <template v-else>
                <div class="draggable-mok-list">

                    
                <MokBlock 
                    v-for="mok in moks" 
                    :key="mok.id" 
                    :mok="mok"
                    :saemoks="saemoks"
                    :isAbleSpecificSaemok="isAbleSpecificSaemok"
                    :modalStatus="modalStatus"
                    :specificSaemokList="specificSaemokList"
                    :can-edit="canEdit"
                    
                />


                </div>

            </template>

            
        </div>
    </div>
</template>

<script>
import { VueDraggableNext as Draggable } from 'vue-draggable-next'
import InlineEditor from './InlineEditor.vue' // 경로를 확인해주세요.
import MokBlock from './MokBlock.vue' // 다음 단계에서 생성할 컴포넌트

export default {
    name: 'HangBlock',
    components: { Draggable, InlineEditor, MokBlock },
    
    // 부모(AssetHierarchyManager)로부터 필요한 데이터를 props로 받습니다.
    props: {
        canEdit: {type :Boolean, required:true},
        hang: { type: Object, required: true },
        moks: { type: Array, default: () => [] }, 
        saemoks: { type: Array, default: () => [] }, 
        isAbleSpecificSaemok: { type: Object, default: () => ({}) },
        modalStatus: { type: Object, default: () => ({}) },
        specificSaemokList: { type: Object, default: () => ({}) }, 
    },
    
    methods: {
        // ---- 유틸리티 함수 ----
        zeroPad(number, desiredLength){
            return String(number).padStart(desiredLength, '0');
        },
        
        // ---- 이벤트 위임 (자식 이벤트를 받아서 부모에게 전달) ----
        
        // InlineEditor의 @change 이벤트를 받아 부모에게 전달
        onLabelChange(type, object, newValue) {
            this.$emit('change-label', type, object, newValue);
        },

        scrollToLastMok() {
            // 1. MokBlock들을 실제로 담고 있는 Draggable 컨테이너를 찾습니다.
            // MokBlock New 버튼을 제외하고 v-for로 생성된 MokBlock들이 이 안에 있습니다.
            const mokBlocksContainer = this.$el.querySelector('.draggable-mok-list');
            console.log(mokBlocksContainer)
            if (mokBlocksContainer) {
                // 2. Draggable 컨테이너 내부의 마지막 MokBlock 요소를 찾습니다.
                const lastMok = mokBlocksContainer.lastElementChild; 
                
                if (lastMok) {
                    // 3. 마지막 MokBlock 요소의 끝 부분이 스크롤 컨테이너의 끝에 오도록 가로 스크롤합니다.
                    // inline: 'end'는 가로 방향 스크롤에서 요소의 끝을 정렬합니다.
                    lastMok.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'end',
                        block: 'nearest'   // ⭐ 수직 스크롤은 현재 위치를 유지하거나, 요소가 필요할 때만 최소한으로 이동 ⭐
                    });
                }
            }
        },        
        // MokBlock의 세목 리스트 변경 요청을 받아 부모에게 전달
        changeSpecificSaemokList(mokId, saemok) {
            this.$emit('change-specific-list', mokId, saemok);
        },
        
        // MokBlock의 세목 조건 부여 스위치 변경 요청을 받아 부모에게 전달
        changeAbleSpecificSaemok(mok) {
            this.$emit('change-mok-able-saemok', mok);
        },
        
        // MokBlock의 세목 추가 모달 상태 변경 요청을 받아 부모에게 전달
        changeModalStatusAddSpecificSaemok(mokId) {
            this.$emit('change-modal-status', mokId);
        },
    }
}
</script>

<style scoped>
/* -------------------- 항 블록 -------------------- */
.HangBlock {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    padding: var(--spacing-5);
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-sm);
}

.HangHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-3);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--border-color);
}

.hang-info {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
    min-width: 0;
    cursor: grab;
}

.hang-info:active {
    cursor: grabbing;
}

/*
    제목 크기를 26px/900에서 낮췄다.
    한 화면에 항이 여럿 놓이는 자리라, 제목이 너무 크면 정작 안의 목이 안 보인다.
*/
.hang-label {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
}

.hang-priority {
    flex-shrink: 0;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-md);
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

/* -------------------- 목 줄 -------------------- */
.MokBlockList {
    display: flex;
    flex-direction: row;
    gap: var(--spacing-4);
    overflow-x: auto;
    padding-bottom: var(--spacing-2);
}

.MokBlockList::-webkit-scrollbar {
    height: 10px;
}

.MokBlockList::-webkit-scrollbar-track {
    background: transparent;
}

.MokBlockList::-webkit-scrollbar-thumb {
    background-color: var(--border-color-strong);
    border: 3px solid transparent;
    background-clip: content-box;
    border-radius: var(--border-radius-full);
}

.MokBlockList::-webkit-scrollbar-thumb:hover {
    background-color: var(--text-muted);
}

.draggable-mok-list {
    display: flex;
    flex-direction: row;
    gap: var(--spacing-4);
}

/* 목 추가 */
.MokBlock.New {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    min-width: 150px;
    padding: var(--spacing-5);
    border: 1px dashed var(--border-color-strong);
    border-radius: var(--border-radius-lg);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
    transition: border-color var(--transition-fast), color var(--transition-fast),
        background-color var(--transition-fast);
}

.MokBlock.New:hover {
    border-color: var(--primary-600);
    background: var(--bg-active);
    color: var(--primary-700);
}

[data-theme="dark"] .MokBlock.New:hover {
    color: var(--primary-300);
}
</style>
