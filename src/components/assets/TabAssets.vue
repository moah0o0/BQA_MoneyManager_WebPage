<template>
    <div class="tab-root none-select">
        <div class="page-head">
            <div>
                <h1 class="page-title">계정과목</h1>
                <p class="page-desc">장부에서 고를 항 · 목 · 세목을 짭니다. 끌어서 차례를 바꿀 수 있습니다.</p>
            </div>
            <div class="acts">
                <button type="button" class="btn btn-secondary" aria-haspopup="dialog" @click="MOLDAL_STATUS_SAEMOK_MANAGE = true">
                    <i class="bi bi-tags" aria-hidden="true"></i> 세목 전체 관리
                </button>
            </div>
        </div>

        <template v-if="loginStatus && ASSETS_LIST_IS_LOADED">
            
            <!-- 1. 편집 가능 모드 (canEdit: true) -->
            <template v-if="canEdit">
                <!-- Draggable: 항목 순서 변경 가능 -->
                <Draggable 
                    :list="ASSETS_HANG"
                    item-key="id"
                    class="HangBlockList"
                    handle=".hang-info" 
                    @end="updateHang()">
                    
                    <HangBlock 
                        v-for="hang in ASSETS_HANG" 
                        :key="hang.id" 
                        :ref="'hangBlock_' + hang.id"
                        :hang="hang"
                        :moks="ASSETS_MOK[hang.id]"
                        :saemoks="ASSETS_SAEMOK"
                        :isAbleSpecificSaemok="IS_ABLE_SPECIFIC_SAEMOK"
                        :modalStatus="MOLDAL_STATUS_addSpecificSaemok"
                        :specificSaemokList="IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST"
                        :canEdit="true" 
                        
                        @create-mok="createNewMok(hang.id)"
                        @delete-hang="deleteHang"
                        @update-mok-priority="updateMok"
                        @change-label="onLabelChange"
                        @delete-mok="deleteMok"

                        @change-specific-list="changeSpecificSaemokList"
                        @change-mok-able-saemok="changeAbleSpecificSaemok"
                        @change-modal-status="changeModalStatusAddSpecificSaemok"
                    />
                </Draggable>
                
                <!-- 항목 추가 버튼 (편집 모드에서만 표시) -->
                <button type="button" class="HangBlock New" @click="createNewHang()">
                    <i class="bi bi-plus-circle-fill" aria-hidden="true"></i>
                    항 추가하기
                </button>
                
                <!-- 세목 전체 관리 버튼 (편집 모드에서만 표시) -->

            </template>
            
            <!-- 2. 조회 전용 모드 (canEdit: false) - 순수 뷰어 -->
            <template v-else>
                 <div class="HangBlockList read-only">
                    <HangBlock 
                        v-for="hang in ASSETS_HANG" 
                        :key="hang.id" 
                        :ref="'hangBlock_' + hang.id"
                        :hang="hang"
                        :moks="ASSETS_MOK[hang.id]"
                        :saemoks="ASSETS_SAEMOK"
                        :isAbleSpecificSaemok="IS_ABLE_SPECIFIC_SAEMOK"
                        :modalStatus="MOLDAL_STATUS_addSpecificSaemok"
                        :specificSaemokList="IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST"
                        :canEdit="false" 

                    />
                </div>
            </template>

        </template>

        <p v-else-if="loginStatus" class="empty" role="status">계정과목을 불러오는 중입니다…</p>


        <!-- SaemokModal: canEdit이 true이고 모달 상태가 true일 때만 열림 -->
        <SaemokModal 
            v-if="MOLDAL_STATUS_SAEMOK_MANAGE" 
            :saemoks="ASSETS_SAEMOK"
            :can-edit="canEdit"
            @close="MOLDAL_STATUS_SAEMOK_MANAGE = false"
            @create-saemok="createNewSaemok"
            @update-saemok-priority="updateSaemokPriority"
            @delete-saemok="deleteSaemok"
            @change-label="onLabelChange"
        />
        
    </div>
</template>


<script>
// 기존 import 유지
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

import { VueDraggableNext as Draggable } from 'vue-draggable-next'
import HangBlock from './HangBlock.vue'
import SaemokModal from './SaemokModal.vue' 

export default {
    props:['loginStatus', 'canEdit','initDate'],

    components: { Draggable, HangBlock, SaemokModal }, 

    computed:{
        ASSETS_LIST_IS_LOADED(){
            return this.ASSETS_HANG.length > 0 && Object.keys(this.ASSETS_MOK).length > 0 && this.ASSETS_SAEMOK.length > 0
        },

        isAnyModalOpen() {
            // MOLDAL_STATUS_SAEMOK_MANAGE 상태 추가
            return Object.values(this.MOLDAL_STATUS_addSpecificSaemok).some(status => status === true) || this.MOLDAL_STATUS_SAEMOK_MANAGE;
        }
        
    },
    
    data() {
        return {
            ASSETS_HANG: [],
            ASSETS_MOK: {}, 
            ASSETS_SAEMOK: [], 
            IS_ABLE_SPECIFIC_SAEMOK: {}, 
            IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST: {}, 
            MOLDAL_STATUS_addSpecificSaemok: {},
            MOLDAL_STATUS_SAEMOK_MANAGE: false, 
        }
    },

    watch: {
        isAnyModalOpen(isOpen) {
            // 모달이 열리면 스크롤 방지
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }
    },

    async created(){
        await this.getAssets()
    },

    mounted(){
        window.addEventListener('keydown', this.escapeKeyEventHandler);
    },

    beforeDestroy() {
        window.removeEventListener('keydown', this.escapeKeyEventHandler);
    },

    methods: {
        
        // ---- 유틸리티 함수 ----
        zeroPad(number, desiredLength){
            return String(number).padStart(desiredLength, '0');
        },
        everyModalClose(){
            this.MOLDAL_STATUS_addSpecificSaemok = {};
            this.MOLDAL_STATUS_SAEMOK_MANAGE = false; 
        },
        escapeKeyEventHandler(event){
            if(event.key === "Escape"){
                this.everyModalClose();
            }
        },
        
        
        // ---- 데이터 로딩 ----
        async getAssets(){
            if(this.loginStatus == false) return

            this.ASSETS_HANG = []
            this.ASSETS_MOK = {}
            this.ASSETS_SAEMOK = []

            const [hangs, moks, saemoks] = await Promise.all([
                pb.collection('AssetsHang').getFullList(),
                pb.collection('AssetsMok').getFullList({ expand: 'parent_hang' }),
                pb.collection('AssetsSaemok').getFullList()
            ]);

            this.ASSETS_HANG = hangs.sort((a, b) => a.priority - b.priority)

            this.ASSETS_HANG.forEach(parent_hang => {
                if (!this.ASSETS_MOK[parent_hang.id]) {
                    this.ASSETS_MOK[parent_hang.id] = [];
                }
                
                const mok = moks.filter(mok => mok.expand.parent_hang.id === parent_hang.id);
                mok.forEach(mok_item => {
                    this.ASSETS_MOK[parent_hang.id].push(mok_item)
                    this.IS_ABLE_SPECIFIC_SAEMOK[mok_item.id] = mok_item.is_able_specific_saemok
                })

                this.ASSETS_MOK[parent_hang.id].sort((a, b) => a.priority - b.priority);
            });

            this.ASSETS_SAEMOK = saemoks.sort((a, b) => a.priority - b.priority)

            const fetchAllMokSaemokPromises = [];
            Object.values(this.ASSETS_MOK).forEach(mokList => {
                mokList.forEach(mok => {
                    if (mok.is_able_specific_saemok) {
                        fetchAllMokSaemokPromises.push(this.fetchSpecificSaemok(mok));
                    } else {
                        this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id] = []
                    }
                });
            });
            await Promise.all(fetchAllMokSaemokPromises); 
        },
        
        async fetchSpecificSaemok(mok) {
            const fetchPromises = mok.able_specific_saemok_list.map(specific_saemok_id => {
                return pb.collection('AssetsSaemok').getOne(specific_saemok_id, { requestKey: null });
            });

            try {
                const results = await Promise.all(fetchPromises);
                this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id] = results.sort((a, b) => a.priority - b.priority);

            } catch (error) {
                console.error(`Mok ID ${mok.id}의 일부 Saemok 데이터를 가져오는 데 실패했습니다:`, error);
                this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id] = []; 
            }
        },


        // ---- 순서 변경 (Draggable End 이벤트) ----
        async updateHang() {
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            for (const [index, hang] of this.ASSETS_HANG.entries()) {
                hang.priority = index + 1;
                await pb.collection('AssetsHang').update(hang.id, { priority: hang.priority });
            }
        },
        
        async updateMok(parent_hang_id) {
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            const mokList = this.ASSETS_MOK[parent_hang_id]
            for (const [index, mok] of mokList.entries()) {
                mok.priority = index + 1;
                await pb.collection('AssetsMok').update(mok.id, { priority: mok.priority });
            }
        },

        // ---- 레이블 변경 (InlineEditor 이벤트) ----
        async onLabelChange(type, object, newValue) {
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            if (object && object.label !== newValue) {
                object.label = newValue; 
            }
            await pb.collection(`Assets${type}`).update(object.id, { label: newValue });
        },

        // ---- 생성 (Create) ----
        async createNewHang(){
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            const new_hang = ({
                label: '새로운 항',
                priority: this.ASSETS_HANG.length + 1
            })

            const new_hang_record = await pb.collection('AssetsHang').create(new_hang)
            this.ASSETS_MOK[new_hang_record.id] = [] 

            this.ASSETS_HANG.push(new_hang_record)
        },


        async createNewMok(hangId) {
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            
            const currentMokList = this.ASSETS_MOK[hangId]
            
            const new_priority = currentMokList.length + 1;

            const new_mok_data = ({
                label: '새로운 목',
                priority: new_priority, 
                parent_hang: hangId, 
                is_able_specific_saemok: false 
            });

            const new_mok_record = await pb.collection('AssetsMok').create(new_mok_data);
            
            currentMokList.push(new_mok_record); 
            this.ASSETS_MOK[hangId] = currentMokList
            
            currentMokList.sort((a, b) => a.priority - b.priority);

            this.$nextTick(() => {
                const hangBlockRef = this.$refs['hangBlock_' + hangId];
                const instance = Array.isArray(hangBlockRef) ? hangBlockRef[0] : hangBlockRef;
                if (instance && typeof instance.scrollToLastMok === 'function') {
                    instance.scrollToLastMok();
                }
            });

        },
        
        
        /** 새로운 세목 생성 메서드 **/
        async createNewSaemok(){
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            
            const new_priority = this.ASSETS_SAEMOK.length + 1;

            const new_saemok_data = ({
                label: '새로운 세목',
                priority: new_priority, 
                is_none_field: false
            });

            const new_saemok_record = await pb.collection('AssetsSaemok').create(new_saemok_data);
            
            this.ASSETS_SAEMOK.push(new_saemok_record); 
            this.ASSETS_SAEMOK.sort((a, b) => a.priority - b.priority);

            this.$nextTick(() => {
                this.scrollToLastSaemok();
            });
        },

    
        // ---- 삭제 (Delete) ----

        async deleteHang(hang_id){
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            
            // confirm() 대신 비차단 경고 사용
            console.warn("Hang 삭제 요청: 실제 환경에서는 사용자 확인 모달이 필요합니다. 현재는 확인 없이 즉시 삭제됩니다.");

            const associated_moks = this.ASSETS_MOK[hang_id] || [];
            for (const mok of associated_moks) {
                await pb.collection('AssetsMok').delete(mok.id);
            }

            await pb.collection('AssetsHang').delete(hang_id);

            this.ASSETS_HANG = this.ASSETS_HANG.filter(hang => hang.id !== hang_id);
            delete this.ASSETS_MOK[hang_id];
            delete this.IS_ABLE_SPECIFIC_SAEMOK[hang_id];
            delete this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[hang_id];

            this.updateHang();
        },

        async deleteMok(mok_id, parent_hang_id){
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크

            // confirm() 대신 비차단 경고 사용
            console.warn("Mok 삭제 요청: 실제 환경에서는 사용자 확인 모달이 필요합니다. 현재는 확인 없이 즉시 삭제됩니다.");

            await pb.collection('AssetsMok').delete(mok_id);
            this.ASSETS_MOK[parent_hang_id] = this.ASSETS_MOK[parent_hang_id].filter(mok => mok.id !== mok_id);

            delete this.IS_ABLE_SPECIFIC_SAEMOK[mok_id];
            delete this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok_id];
            delete this.MOLDAL_STATUS_addSpecificSaemok[mok_id];
            
            this.updateMok(parent_hang_id);
        },

        /** 세목 삭제 메서드 **/
        async deleteSaemok(saemok_id){
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            
            const saemok_to_delete = this.ASSETS_SAEMOK.find(s => s.id === saemok_id);
            if (saemok_to_delete && saemok_to_delete.is_none_field) {
                // alert() 대신 console.error 사용
                console.error("기본값 세목(제한 없음)은 삭제할 수 없습니다.");
                return;
            }
            
            // confirm() 대신 비차단 경고 사용
            console.warn("Saemok 삭제 요청: 실제 환경에서는 사용자 확인 모달이 필요합니다. 현재는 확인 없이 즉시 삭제됩니다.");

            await pb.collection('AssetsSaemok').delete(saemok_id);
            
            this.ASSETS_SAEMOK = this.ASSETS_SAEMOK.filter(saemok => saemok.id !== saemok_id);
            this.updateSaemokPriority();
            
            for (const mokList of Object.values(this.ASSETS_MOK)) {
                for (const mok of mokList) {
                    if (mok.able_specific_saemok_list && mok.able_specific_saemok_list.includes(saemok_id)) {
                        const new_able_list_ids = mok.able_specific_saemok_list.filter(id => id !== saemok_id);
                        
                        // 로컬 상태 업데이트
                        mok.able_specific_saemok_list = new_able_list_ids;
                        if (this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id]) {
                            this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id] = this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id].filter(saemok => saemok.id !== saemok_id);
                        }

                        // DB 업데이트
                        await pb.collection('AssetsMok').update(mok.id, { able_specific_saemok_list: new_able_list_ids });
                    }
                }
            }
        },

        /** 세목 순서 변경 메서드 **/
        async updateSaemokPriority() {
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            
            for (const [index, saemok] of this.ASSETS_SAEMOK.entries()) {
                const newPriority = saemok.is_none_field ? 1 : index + 1;
                
                if (saemok.priority !== newPriority) {
                    saemok.priority = newPriority;
                    await pb.collection('AssetsSaemok').update(saemok.id, { priority: saemok.priority });
                }
            }
            this.ASSETS_SAEMOK.sort((a, b) => a.priority - b.priority);
        },

        // ---- 세목 조건 관리 로직 (복잡하므로 중앙에 유지) ----
        async changeAbleSpecificSaemok(mok) {
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            const newValue = !this.IS_ABLE_SPECIFIC_SAEMOK[mok.id]; 
            
            if(newValue == false){
                // confirm() 대신 비차단 경고 사용
                console.warn("특정 세목 허용 해제 요청: 기존 설정이 모두 초기화되므로 사용자 확인이 필요합니다.");
            }
            
            this.IS_ABLE_SPECIFIC_SAEMOK[mok.id] = newValue; 
            mok.is_able_specific_saemok = newValue; 

            await pb.collection('AssetsMok').update(mok.id, { is_able_specific_saemok: newValue  });
            
            if (newValue) {
                await this.fetchSpecificSaemok(mok);
            } else {
                this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id] = [];
            }

            await pb.collection('AssetsMok').update(mok.id, { 
                able_specific_saemok_list: this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok.id].map(saemok => saemok.id) 
            });
        },
        
        async changeSpecificSaemokList(mok_id, saemok){
            if (!this.canEdit) return; // [GUARD] 편집 권한 체크
            const able_list = this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok_id] || []
            const able_id_list = able_list.map(item => item.id)

            // 복잡한 비즈니스 로직 (기본값 옵션 충돌 방지)
            if(able_list.length == 1 && able_list[0].is_none_field == true && saemok.is_none_field == false) {
                // alert() 대신 console.error 사용
                console.error("기본값(제한없음) 옵션이 선택된 상태에서는 다른 옵션을 선택할 수 없습니다. 기본값 옵션을 해제한 후 다시 시도해주세요.")
                return
            }
            if(able_list.length > 0 && able_list[0].is_none_field == false && saemok.is_none_field == true) {
                // alert() 대신 console.error 사용
                console.error("기본값(제한없음) 옵션은 단독으로만 선택할 수 있습니다. 다른 옵션이 선택된 상태에서는 이 옵션을 선택할 수 없습니다.")
                return
            }

            // 추가 또는 제거
            if(able_id_list.includes(saemok.id)) {
                // 제거
                const index = able_list.findIndex(item => item.id === saemok.id);
                if (index > -1) {
                    able_list.splice(index, 1);
                }
            } else {
                // 추가
                able_list.push(saemok);
            }

            this.IS_ABLE_SPECIFIC_SAEMOK_RECORD_LIST[mok_id] = [...able_list] 
            
            // PocketBase 업데이트: ID 목록만 보냅니다.
            await pb.collection('AssetsMok').update(mok_id, { able_specific_saemok_list: able_list.map(saemok => saemok.id) });
        },

        changeModalStatusAddSpecificSaemok(mok_id){
            const currentStatus = this.MOLDAL_STATUS_addSpecificSaemok[mok_id];
            if (!currentStatus) {
                this.everyModalClose(); 
            }
            this.MOLDAL_STATUS_addSpecificSaemok = { 
                ...this.MOLDAL_STATUS_addSpecificSaemok,
                [mok_id]: !currentStatus
            };
        },    

        scrollToLastMok() {
            const container = document.querySelector('.MokBlockList'); 
            
            if (!container) {
                console.error("Mok 목록 스크롤 컨테이너('.MokBlockList')를 찾을 수 없습니다.");
                return;
            }
            
            const MokBlocks = container.querySelectorAll('.MokBlock');
            
            if (MokBlocks.length > 0) {
                const lastHang = MokBlocks[MokBlocks.length - 1];
                lastHang.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        },

        scrollToLastSaemok() {
            const container = document.querySelector('.modal-content-saemok-list');
            const saemokBlocks = container ? container.querySelectorAll('.SaemokBlock') : [];

            if (saemokBlocks.length > 0) {
                const lastSaemok = saemokBlocks[saemokBlocks.length - 1];
                lastSaemok.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        }
    }
}
</script>


<style scoped>
.tab-root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
}

.HangBlockList {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
}

/* 항 추가 — 비어 있는 자리를 점선으로 그려 '여기에 더 넣는다'를 보인다 */
.HangBlock.New {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-5);
    border: 1px dashed var(--border-color-strong);
    border-radius: var(--border-radius-xl);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    transition: border-color var(--transition-fast), color var(--transition-fast),
        background-color var(--transition-fast);
}

.HangBlock.New:hover {
    border-color: var(--primary-600);
    background: var(--bg-active);
    color: var(--primary-700);
}

[data-theme="dark"] .HangBlock.New:hover {
    color: var(--primary-300);
}

.none-select {
  user-select: none;
  -moz-user-select: none;
  -webkit-user-drag: none;
}
</style>
