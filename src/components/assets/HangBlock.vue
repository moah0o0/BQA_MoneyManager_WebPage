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
                <i class="bi bi-trash3" @click="$emit('delete-hang', hang.id)"></i>
            </div>
        </div>

        <div class="MokBlockList">
            
            <div class="MokBlock New" v-if="canEdit"  @click="$emit('create-mok')">
                <i class="bi bi-plus-circle-fill"></i>
                추가하기
            </div>
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
/* -------------------- Hang 블록 (대분류) 스타일 -------------------- */
.HangBlock {
    display: flex;
    flex-direction: column;
    gap: 30px;
    padding: 30px;
    
    background-color: var(--light-color); 
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); 
}


/* -------------------- Hang 헤더 스타일 -------------------- */
.HangHeader{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--border-color, #eee); 
    padding-bottom: 15px;
}

.hang-info{
    display: flex;
    gap: 15px;
    align-items: center;
    cursor: grab; /* 드래그 가능함을 표시 */
}

.hang-label {
    font-size: 26px; 
    font-weight: 900;
}

.hang-priority{
    font-size: 1em;
    font-weight: 600;
    color: var(--medium-color);
}

.hang-toolbar > i {
    font-size: 1.5em;
    color: var(--medium-color);
    cursor: pointer;
    transition: color 0.2s;
}

.hang-toolbar > i:hover {
    color: var(--strong-color);
}


/* -------------------- Mok 블록 리스트 및 스크롤 스타일 -------------------- */
.MokBlockList {
    display: flex;
    flex-direction: row;
    gap: 20px; 
    overflow-x: auto; /* 가로 스크롤 가능하게 */
    padding-bottom: 10px; 
}

/* 스크롤바 디자인 */
.MokBlockList::-webkit-scrollbar {
    height: 8px; 
}

.MokBlockList::-webkit-scrollbar-track {
    background: transparent; 
}

.MokBlockList::-webkit-scrollbar-thumb {
    background-color: var(--medium-color);
    border-radius: 4px;
    border: 2px solid var(--light-color); 
    background-clip: padding-box;
}

.MokBlockList::-webkit-scrollbar-thumb:hover {
    background-color: var(--strong-color);
}

.draggable-mok-list {
    display: flex;
    flex-direction: row;
    gap: 20px;
}

/* Mok 추가 버튼 */
.MokBlock.New {
    min-width: 150px;
    padding: 20px;
    border: 1px dashed var(--border-color, #ccc);
    
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap:10px;
    
    font-weight: 600;
    color: var(--medium-color);
    cursor: pointer;
    transition: all 0.2s ease;
}

.MokBlock.New:hover{
    color: var(--strong-color);
    border-color: var(--medium-color);
}

/* -------------------- 기타 및 드래그 관련 -------------------- */
.hang-info:active {
    cursor: grabbing;
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .HangBlock,
[data-theme="dark"] .HangBlock {
    background-color: var(--bg-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

:deep([data-theme="dark"]) .HangHeader,
[data-theme="dark"] .HangHeader {
    border-bottom-color: var(--border-color);
}

:deep([data-theme="dark"]) .hang-label,
[data-theme="dark"] .hang-label {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .hang-priority,
[data-theme="dark"] .hang-priority {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .hang-toolbar > i,
[data-theme="dark"] .hang-toolbar > i {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .hang-toolbar > i:hover,
[data-theme="dark"] .hang-toolbar > i:hover {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .MokBlockList::-webkit-scrollbar-thumb,
[data-theme="dark"] .MokBlockList::-webkit-scrollbar-thumb {
    background-color: var(--gray-600);
    border-color: var(--bg-secondary);
}

:deep([data-theme="dark"]) .MokBlockList::-webkit-scrollbar-thumb:hover,
[data-theme="dark"] .MokBlockList::-webkit-scrollbar-thumb:hover {
    background-color: var(--gray-500);
}

:deep([data-theme="dark"]) .MokBlock.New,
[data-theme="dark"] .MokBlock.New {
    border-color: var(--border-color);
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .MokBlock.New:hover,
[data-theme="dark"] .MokBlock.New:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
}
</style>