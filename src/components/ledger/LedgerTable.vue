<template>  
  <div class="ledger-summary none-select">
     <div class="summary-item count"> 
        <span class="label">수입 및 지출 건수</span>
        <span class="value">{{ totalCount.toLocaleString() }} 건</span>
      </div>
      <div class="summary-item expense">
          <span class="label">지출합계</span>
          <span class="value">{{ totalExpense.toLocaleString() }} 원</span>
      </div>
      <div class="summary-item income">
          <span class="label">수입합계</span>
          <span class="value">{{ totalIncome.toLocaleString() }} 원</span>
      </div>
  </div>
  <div class="ledger-controls none-select">
    <div class="validation-alert" v-if="hasValidationIssue">
      <i class="bi bi-exclamation-triangle-fill"></i>
      유효성 문제가 있는 장부가 {{ invalidLedgerCount }}건 있습니다. (항/목/세목 미입력, 지출증빙 미등록, 장부내용 미입력)
    </div>

    <div class="search-bar">
      <input type="text" v-model="searchQuery" placeholder="장부내용 실시간 검색" class="search-input">
      <i class="bi bi-search"></i>
    </div>
  </div>

  <table class="ledger">
    <thead>
    <tr class="ledger_pin">
      <th style="width:2%"></th>
      <th style="width:9%">거래일시</th>
      <th style="width:6%">거래정보</th>
      <th style="width:5%">관</th>
      <th style="width:7%">
        항
        <button class="filter-toggle-btn none-select" @click="openFilterModal('Hang')">
          <span :class="{'filter-tag': true, 'active': activeFilters.Hang.length > 0}">
              {{ activeFilters.Hang.length > 0 ? `${activeFilters.Hang.length}건` : '전체' }}
          </span>
        </button>
      </th>
      <th style="width:18%">
        목
        <button class="filter-toggle-btn none-select" @click="openFilterModal('Mok')">
          <span :class="{'filter-tag': true, 'active': activeFilters.Mok.length > 0}">
              {{ activeFilters.Mok.length > 0 ? `${activeFilters.Mok.length}건` : '전체' }}
          </span>
        </button>
      </th>
      <th style="width:12%">
        세목
        <button class="filter-toggle-btn none-select" @click="openFilterModal('Saemok')">
          <span :class="{'filter-tag': true, 'active': activeFilters.Saemok.length > 0}">
              {{ activeFilters.Saemok.length > 0 ? `${activeFilters.Saemok.length}건` : '전체' }}
          </span>
        </button>
      </th>
      <th style="width:27%">장부내용</th>
      <th style="width:5%">장부금액</th>
      <th style="width:8%">지출증빙</th>
    </tr>
    </thead>
    <tbody>
    <template v-if="filteredLedgerList && ASSETS_LIST">
      <tr :class="{'ledger_row': true, 'selected': isLedgerSelected(LEDGER.expand.transaction.id), 'invalid-row': isInvalid(LEDGER)}"
          v-for="LEDGER in filteredLedgerList"
          :key="LEDGER.id">

        <td class="none-select">
          <input class="select" type="checkbox"
                 @change="canEdit ? selectLedgerRow(LEDGER.expand.transaction.id) : null"
                 :checked="isLedgerSelected(LEDGER.expand.transaction.id)"
                 :disabled="!canEdit"/>
        </td>

        <td>
          {{ datetimeFormatter(LEDGER.expand.transaction.datetime) }}
        </td>
        <td>
          <TransactionLabel
              :transaction="LEDGER.expand.transaction"
              :bank-setting-list="BANK_SETTING_LIST"/>
        </td>

        <td>
          <GwanLabel
              :label="LEDGER.gwan"/>
        </td>

        <td>
          <DropdownLabel
              type="Hang"
              :is-require="true"
              :assets-id="LEDGER.hang"
              :assets-list="ASSETS_LIST.Hang"
              :ledger-record="LEDGER"
              :is-open="DROPDOWN_STATUS[`hang-${LEDGER.id}`]"
              @updated="(value) => handleDropdownUpdate(LEDGER.id, 'hang', value)"
              @toggle="canEdit ? openDropdown(`hang-${LEDGER.id}`) : null"/>
        </td>

        <td>
          <DropdownLabel
              type="Mok"
              :is-require="true"
              :assets-id="LEDGER.mok"
              :assets-list="ASSETS_LIST.Mok"
              :ledger-record="LEDGER"
              :is-open="DROPDOWN_STATUS[`mok-${LEDGER.id}`]"
              @updated="(value) => handleDropdownUpdate(LEDGER.id, 'mok', value)"
              @toggle="canEdit ? openDropdown(`mok-${LEDGER.id}`) : null"/>
        </td>

        <td>
          <DropdownLabel
              type="Saemok"
              :is-require="true"
              :assets-id="LEDGER.saemok"
              :assets-list="ASSETS_LIST.Saemok"
              :ledger-record="LEDGER"
              :current-mok-id="LEDGER.mok"
              :is-open="DROPDOWN_STATUS[`saemok-${LEDGER.id}`]"
              @updated="(value) => handleDropdownUpdate(LEDGER.id, 'saemok', value)"
              @toggle="canEdit ? openDropdown(`saemok-${LEDGER.id}`) : null"/>
        </td>

        <td>
          <ReasonLabel
              :ledger-record-id="LEDGER.id"
              :original-reason-text="LEDGER.reason"
              :is-open="DROPDOWN_STATUS[`reason-${LEDGER.id}`]"
              @open="canEdit ? openDropdown(`reason-${LEDGER.id}`) : null"
              @close="closeReasonDropdown(`reason-${LEDGER.id}`)"
              @updated="getLedger"/>
        </td>

        <td>
          {{ LEDGER.money.toLocaleString() }}
        </td>

        <td>
          <ReceiptLabel
              :ledger-record="LEDGER"
              :canEdit="canEdit"
              @update-complete="getLedger"/>
        </td>
      </tr>
    </template>
    <tr v-else><td :colspan="10" style="text-align: center;">데이터가 없습니다.</td></tr>
    </tbody>
  </table>

  <div class="modal-overlay" v-if="filterModal.isOpen" @click.self="closeFilterModal">
    <div class="modal-content filter-modal">
      <header class="modal-header">
        <span class="title">{{ filterModalType }} 필터링</span>
        <button class="close-btn" @click="closeFilterModal"><i class="bi bi-x-lg"></i></button>
      </header>
      <main class="modal-data-area">
        <p class="current-filters">현재 선택된 필터: <strong>{{ pendingFilters[filterModal.type].length > 0 ? `${pendingFilters[filterModal.type].length}개 항목 선택` : '전체' }}</strong></p>
        <div class="filter-options">
          <div v-for="asset in getFilterOptionsByType(filterModal.type)" :key="asset.id" class="filter-item">
            <label class="checkbox-label" :class="{'is-none-field': asset.is_none_field}">
              <input type="checkbox" :value="asset.id" v-model="pendingFilters[filterModal.type]" class="custom-checkbox">
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">
                <span class="priority">{{ asset.priority_string }}.</span>
                {{ asset.label }}
              </span>
            </label>
          </div>
        </div>
      </main>
      <footer class="modal-footer">
        <button class="reset-button" @click="resetFilter(filterModal.type)">필터 초기화</button>
        <button class="apply-button" @click="applyFilter">적용</button>
      </footer>
    </div>
  </div>

  <div class="button-layer">
    <button class="remove_button" v-if="SELECTED_TRANSACTION_LIST.length != 0 && canEdit" @click="removeSelectedLedger">
      <small>{{ SELECTED_TRANSACTION_LIST.length }}건</small>
      <strong>선택한 내역 삭제</strong>
    </button>
  </div>
</template>

<script>
import TransactionLabel from './TransactionLabel.vue';
import GwanLabel from './GwanLabel.vue';
import DropdownLabel from './DropdownLabel.vue'
import ReceiptLabel from './ReceiptLabel.vue';
import ReasonLabel from './ReasonLabel.vue';

import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
  components: {
    TransactionLabel,
    GwanLabel,
    DropdownLabel,
    ReasonLabel, 
    ReceiptLabel,
  },

  props: ['filterStartDate', 'filterEndDate', 'canEdit'], 
  emits: ["refresh"],

  data(){
    return {
      LEDGER_LIST: [], // 원본 데이터
      ASSETS_LIST: {
        Hang: [],
        Mok: [],
        Saemok: []
      },
      BANK_SETTING_LIST: [],
      DROPDOWN_STATUS: {},
      SELECTED_TRANSACTION_LIST: [],

      // 2. 장부내용 검색 기능 추가
      searchQuery: '',

      // 3. 항/목/세목 필터링 기능 추가
      activeFilters: { // 현재 적용된 필터 (ID 목록)
        Hang: [],
        Mok: [],
        Saemok: [],
      },
      filterModal: { // 필터 모달 상태
        isOpen: false,
        type: null, // 'Hang', 'Mok', 'Saemok'
      },
      pendingFilters: { // 모달에서 임시로 선택된 필터
        Hang: [],
        Mok: [],
        Saemok: [],
      },
    }
  },

  async mounted(){
    await this.getAssets();
    await this.getLedger();
    window.addEventListener('keydown', this.closeDropdown);
  },


  beforeUnmount() {
    window.removeEventListener('keydown', this.closeDropdown);
  },

  watch: {
    filterStartDate() {
      this.getLedger();
    },
    filterEndDate() {
      this.getLedger();
    }
  },
  computed: {
    filterModalType(){
      switch(this.filterModal.type){
        case 'Hang': return '항'
        case 'Mok': return '목'
        case 'Saemok': return '세목'
      }
    },  
    totalCount() {
        return this.filteredLedgerList.length;
    },
    
    totalExpense() {
        return this.filteredLedgerList.reduce((sum, ledger) => {
            // '지출'인 경우에만 합산
            if (ledger.gwan === '지출') {
                return sum + ledger.money;
            }
            return sum;
        }, 0);
    },
    
    totalIncome() {
        return this.filteredLedgerList.reduce((sum, ledger) => {
            // '수입'인 경우에만 합산
            if (ledger.gwan === '수입') {
                return sum + ledger.money;
            }
            return sum;
        }, 0);
    },


    // 2. 장부내용 검색 & 3. 항/목/세목 필터링 로직을 통합하여 적용합니다.
    filteredLedgerList() {
      let list = this.LEDGER_LIST;
      const query = this.searchQuery.toLowerCase().trim();

      // 1) 장부내용 검색 필터링
      if (query.length > 0) {
        list = list.filter(ledger =>
            (ledger.reason || '').toLowerCase().includes(query)
        );
      }

      // 2) 항/목/세목 필터링
      ['Hang', 'Mok', 'Saemok'].forEach(type => {
        const filterIds = this.activeFilters[type];
        const fieldName = type.toLowerCase(); // 'Hang' -> 'hang'
        if (filterIds.length > 0) {
          list = list.filter(ledger => filterIds.includes(ledger[fieldName]));
        }
      });

      return list;
    },
    invalidLedgerCount() {
      return this.LEDGER_LIST.filter(this.isInvalid).length;
    },
    // 유효성 문제가 하나라도 있는지 여부
    hasValidationIssue() {
      return this.invalidLedgerCount > 0;
    }
  },

  methods: {
    // ---- 유틸리티 함수 ----
    zeroPad(number, desiredLength){
        return String(number).padStart(desiredLength, '0');
    },
    // ---- 끝 ----

    isInvalid(ledger) {
      const condition1 = !ledger.hang || !ledger.mok || !ledger.saemok;
      const isReceiptMissing = ledger.receipt.length == 0;
      const condition2 = !ledger.not_need_receipt && isReceiptMissing;
      const condition3 = !ledger.reason || ledger.reason.trim().length === 0;

      return condition1 || condition2 || condition3;
    },
    openFilterModal(type) {
      this.filterModal.type = type;
      // 모달을 열 때, 현재 적용된 필터를 임시 필터로 복사합니다.
      this.pendingFilters.Hang = [...this.activeFilters.Hang];
      this.pendingFilters.Mok = [...this.activeFilters.Mok];
      this.pendingFilters.Saemok = [...this.activeFilters.Saemok];
      
      this.filterModal.isOpen = true;
    },

    closeFilterModal() {
      this.filterModal.isOpen = false;
      this.filterModal.type = null;
    },

    applyFilter() {
      const type = this.filterModal.type;
      
      // 필터를 적용할 때, 활성 필터(activeFilters)를 임시 필터(pendingFilters)의 복사본으로 재할당하여
      // Vue의 반응성 시스템을 통해 filteredLedgerList computed 속성이 재계산되도록 합니다.
      this.activeFilters = {
          ...this.activeFilters,
          Hang: [...this.pendingFilters.Hang], // Hang 필터는 항상 반영
          Mok: [...this.pendingFilters.Mok],   // Mok 필터 반영
          Saemok: [...this.pendingFilters.Saemok] // Saemok 필터 반영
      };
      
      this.closeFilterModal();
    },

    resetFilter(type) {
      // 임시 필터(pendingFilters)를 초기화
      this.pendingFilters[type] = [];
      
      // 활성 필터(activeFilters)도 초기화하여 화면에 즉시 반영되도록 합니다.
      this.activeFilters = {
          ...this.activeFilters,
          [type]: []
      };
    },

    // 필터 모달에 표시할 목록을 가져옵니다. (계층적/조건부 필터링 로직)
    getFilterOptionsByType(type) {
      let list = [...this.ASSETS_LIST[type]];
      const pendingHangIds = this.pendingFilters.Hang;
      const pendingMokIds = this.pendingFilters.Mok;

      // 1. Mok 필터링 규칙 적용 (Hang 필터에 종속)
      if (type === 'Mok' && pendingHangIds.length > 0) {
        // parent_hang이 Hang 필터에서 선택된 경우에만 포함
        list = list.filter(mok => pendingHangIds.includes(mok.parent_hang));
      }

      // 2. Saemok 필터링 규칙 적용 (Mok 필터에 종속)
      else if (type === 'Saemok' && pendingMokIds.length > 0) {
        let allowedSaemokIds = new Set();
        let shouldRestrict = false; // 하나라도 is_able_specific_saemok가 true인 Mok이 있는지 확인

        // Mok 필터에서 선택된 모든 Mok 항목을 순회
        const selectedMoks = this.ASSETS_LIST.Mok.filter(mok => pendingMokIds.includes(mok.id));

        selectedMoks.forEach(mok => {
          if (mok.is_able_specific_saemok) {
            shouldRestrict = true;
            // is_able_specific_saemok가 true인 경우, able_specific_saemok_list에 있는 Saemok만 허용
            if (mok.expand && mok.expand.able_specific_saemok_list) {
              mok.expand.able_specific_saemok_list.forEach(saemok => {
                allowedSaemokIds.add(saemok.id);
              });
            }
          } 
        });

        // 하나라도 is_able_specific_saemok가 true인 Mok이 선택되었다면, 목록을 제한합니다.
        if (shouldRestrict) {
            list = list.filter(saemok => allowedSaemokIds.has(saemok.id));
        }
        // shouldRestrict가 false이면 (선택된 모든 Mok이 is_able_specific_saemok == false이거나, Mok 선택이 없을 경우) 
        // 전체 Saemok 목록이 표시됩니다.
      }
      
      // 3. 우선순위 정렬 및 형식화
      // Assets 목록을 가져올 때 PocketBase에서 이미 priority로 정렬했으므로, 복사본을 그대로 사용합니다.

      const desiredLength = { Hang: 2, Mok: 3, Saemok: 4 }[type];
      list = list.map(asset => ({
        ...asset,
        priority_string: this.zeroPad(asset.priority, desiredLength), // zeroPad 함수 재활용
        // Saemok에만 is_none_field가 있으므로 처리
        is_none_field: type === 'Saemok' ? (asset.is_none_field || false) : false
      }));

      return list;
    },

    isLedgerSelected(id) {
      return this.SELECTED_TRANSACTION_LIST.includes(id);
    },
    async handleDropdownUpdate(ledgerId, field, value) {
      // 권한 체크: 수정 권한이 없으면 여기서 즉시 종료
      if (!this.canEdit) {
        console.warn("권한 없음: 수정 작업이 거부되었습니다.");
        return; 
      }
      
      const updateBody = {
        [field]: value,
      };

      if (field === 'hang') {
        updateBody.mok = null;
        updateBody.saemok = null;
      }

      else if (field === 'mok') {
        updateBody.saemok = null;
      }

      try {
        await pb.collection('Ledger').update(ledgerId, updateBody);
        
        await this.getLedger(); 

      } catch (error) {
        console.error("Failed to update ledger record:", error);
        alert("데이터 업데이트에 실패했습니다.");
      }
    },
    datetimeFormatter(str){
      return String(str).substring(0, 12).replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/,"$1-$2-$3 $4:$5")
    },
    async getLedger(){
      try {
        const ledger_list = await pb.collection("Ledger").getFullList({
          sort:'transaction.datetime,transaction.no',
          filter: `${this.filterStartDate} <= transaction.datetime && transaction.datetime <= ${this.filterEndDate}`,
          expand: "receipt,transaction,mok",
          requestKey: null
        })
        this.LEDGER_LIST = ledger_list;
      } catch (error) {
        console.error("Failed to fetch ledger data:", error);
        this.LEDGER_LIST = [];
      }
    },
    async getAssets(){
      try {
        const [hangs, moks, saemoks, bankSettings] = await Promise.all([
          pb.collection('AssetsHang').getFullList({ sort: 'priority' }),
          pb.collection('AssetsMok').getFullList({
              expand: 'parent_hang,able_specific_saemok_list',
              sort: 'priority'
          }),
          pb.collection('AssetsSaemok').getFullList({ sort: 'priority' }),
          pb.collection('BankSetting').getFullList({ requestKey: null })
        ]);
        this.ASSETS_LIST.Hang = hangs;
        this.ASSETS_LIST.Mok = moks;
        this.ASSETS_LIST.Saemok = saemoks;
        this.BANK_SETTING_LIST = bankSettings;
      } catch (error) {
        console.error("Failed to fetch assets data:", error);
      }
    },
    selectLedgerRow(id){
      if (!this.canEdit) return;
      
      const index = this.SELECTED_TRANSACTION_LIST.indexOf(id);
      if(index > -1){
        this.SELECTED_TRANSACTION_LIST.splice(index, 1);
      } else{
        this.SELECTED_TRANSACTION_LIST.push(id)
      }
    },
    async removeSelectedLedger(){
      if (!this.canEdit) {
        console.warn("권한 없음: 삭제 작업이 거부되었습니다.");
        return; 
      }

      if (this.SELECTED_TRANSACTION_LIST.length === 0) return;
      
      const promises = this.SELECTED_TRANSACTION_LIST.map(id => 
        pb.collection("Ledger").delete(this.LEDGER_LIST.find(l => l.expand.transaction.id === id).id)
      );

      try {
        await Promise.all(promises);
        this.SELECTED_TRANSACTION_LIST = [];
        await this.getLedger();
        this.$emit("refresh");
      } catch (error) {
        console.error("Failed to delete selected ledgers:", error);
        alert("선택한 내역 삭제에 실패했습니다.");
      }
    },

    openDropdown(key) {
      Object.keys(this.DROPDOWN_STATUS).forEach(k => {
        this.DROPDOWN_STATUS[k] = false
      })

      this.DROPDOWN_STATUS[key] = true
    },

    closeDropdown(e) {
      if (e.key === 'Escape') {
          Object.keys(this.DROPDOWN_STATUS).forEach(k => {
            this.DROPDOWN_STATUS[k] = false
          })
          this.filterModal.isOpen = false
      }
    },

    closeReasonDropdown(key) {
        this.DROPDOWN_STATUS[key] = false;
    }

  },
}
</script>

<style scoped>
/* --- 기존 스타일은 유지하고, 필터 모달 관련 스타일만 집중적으로 수정 --- */

/* ---- AssetLabel 디자인 반영 스타일 ---- */
.filter-item .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.filter-item .checkbox-label.is-none-field .checkbox-text {
    color: var(--medium-color);
}
.filter-item .checkbox-label.is-none-field .priority {
    color: var(--medium-color);
}

.filter-item .checkbox-text {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--strong-color);
}

.filter-item .priority {
    font-size: 0.8em;
    font-weight: var(--font-weight-medium);
    color: var(--medium-color);
}

/* --- 필터 모달 및 컨트롤 스타일 --- */
.ledger-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) 0;
}

.validation-alert {
    background-color: var(--danger-color);
    color: var(--none-color);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius-sm);
    font-weight: var(--font-weight-semibold);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.9em;
}

.search-bar {
    position: relative;
    width: 300px;
}

.search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-sm) 35px;
    border: 1px solid var(--medium-color);
    border-radius: var(--border-radius-sm);
    font-size: 0.9em;
    transition: border-color var(--transition-normal);
}

.search-input:focus {
    border-color: var(--strong-color);
    outline: none;
}

.search-bar .bi-search {
    position: absolute;
    left: var(--spacing-sm);
    top: 50%;
    transform: translateY(-50%);
    color: var(--medium-color);
    font-size: 0.9em;
}

tr.ledger_row.invalid-row {
    background-color: #ffdddd;
    border-left: 5px solid var(--danger-color);
}

tr.ledger_row.invalid-row.selected {
    background-color: #ffcccc;
}

.filter-toggle-btn {
    background: none;
    border: none;
    padding: 0;
    margin-left: var(--spacing-xs);
    cursor: pointer;
}

.filter-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: var(--border-radius-xl);
    font-size: 0.7em;
    font-weight: var(--font-weight-bold);
    color: var(--medium-color);
    background-color: var(--light-color);
    transition: all var(--transition-normal);
}

.filter-tag.active {
    color: var(--none-color);
    background-color: var(--strong-color);
}

/* --- 필터 모달 디자인 개선 --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.filter-modal {
    width: 450px;
    background: var(--none-color);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.filter-modal .modal-header {
    padding: var(--spacing-lg) var(--spacing-xl);
    border-bottom: 1px solid var(--light-color);
    background-color: var(--light-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.1em;
    font-weight: var(--font-weight-bold);
}

.filter-modal .modal-header .close-btn {
    background: none;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    color: var(--strong-color);
    transition: color var(--transition-normal);
}

.filter-modal .modal-header .close-btn:hover {
    color: var(--danger-color);
}

.filter-modal .modal-data-area {
    padding: var(--spacing-lg) var(--spacing-xl);
    display: flex;
    flex-direction: column;
}

.filter-modal .current-filters {
    font-size: 0.9em;
    margin-bottom: var(--spacing-sm);
    color: var(--strong-color);
}

.filter-options {
    overflow-y: auto;
    max-height: 350px;
    padding-right: var(--spacing-lg);
}

.filter-item {
    margin-bottom: var(--spacing-sm);
    font-size: 0.9em;
}

/* 커스텀 체크박스 스타일 */
.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.custom-checkbox {
    display: none;
}

.checkbox-custom {
    width: 18px;
    height: 18px;
    border: 2px solid var(--medium-color);
    border-radius: var(--border-radius-sm);
    margin-right: var(--spacing-sm);
    position: relative;
    transition: all var(--transition-normal);
    flex-shrink: 0;
}

.custom-checkbox:checked + .checkbox-custom {
    background-color: var(--strong-color);
    border-color: var(--strong-color);
}

.custom-checkbox:checked + .checkbox-custom::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 6px;
    width: 4px;
    height: 8px;
    border: solid var(--none-color);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.checkbox-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.filter-modal .modal-footer {
    padding: var(--spacing-lg) var(--spacing-xl);
    border-top: 1px solid var(--light-color);
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
}

.apply-button, .reset-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
    transition: background-color var(--transition-normal), color var(--transition-normal);
}

.apply-button {
    background-color: var(--strong-color);
    color: var(--none-color);
    border: none;
}

.apply-button:hover {
    background-color: #2b77af;
}

.reset-button {
    background-color: var(--none-color);
    color: var(--strong-color);
    border: 1px solid var(--strong-color);
}

.reset-button:hover {
    background-color: var(--light-color);
}

/* --- 기존 테이블 및 버튼 스타일 --- */
table.ledger {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.75em;
}

tr.ledger_pin {
    height: 50px;
    font-size: 1.1em;
    background-color: var(--light-color);
    border-bottom: 1px solid var(--medium-color);
    border-top: 1px solid var(--medium-color);
}

tr.ledger_row {
    height: 50px;
    font-weight: var(--font-weight-medium);
    border-bottom: 1px solid var(--medium-color);
}

tr.ledger_row.selected {
    background-color: var(--light-color);
}

table.ledger th,
table.ledger td {
    padding-left: var(--spacing-lg);
    padding-right: var(--spacing-lg);
    text-align: left;
    font-weight: var(--font-weight-medium);
    position: relative;
}

input.select[type='checkbox'] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--medium-color);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    position: relative;
    background-color: var(--none-color);
    vertical-align: middle;
    transition: all var(--transition-fast);
}

input.select[type='checkbox']:disabled {
    cursor: default;
    opacity: 0.5;
}

input.select[type='checkbox']:hover:not(:disabled) {
    border-color: var(--strong-color);
}

input.select[type='checkbox']:checked:not(:disabled) {
    background-color: var(--strong-color);
    border-color: var(--strong-color);
}

input.select[type='checkbox']:checked::after {
    content: "\F26E";
    font-family: "bootstrap-icons";
    color: var(--none-color);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

span.require {
    color: var(--danger-color);
    margin-left: var(--spacing-sm);
    font-size: 0.7em;
}

.button-layer {
    position: fixed;
    bottom: 50px;
    left: 50%;
    z-index: 1000;
    display: flex;
    justify-content: center;
}

.none-select {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

button.remove_button {
    display: flex;
    gap: var(--spacing-sm);
    width: fit-content;
    padding: var(--spacing-sm) var(--spacing-xl);
    border-radius: var(--border-radius-lg);
    border: none;
    cursor: pointer;
    background-color: var(--danger-color);
    color: var(--none-color);
}

button.remove_button > small {
    font-size: 13px;
    font-weight: var(--font-weight-semibold);
    background-color: white;
    color: var(--danger-color);
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-lg);
}

button.remove_button > strong {
    display: flex;
    align-items: center;
    font-weight: var(--font-weight-medium);
    font-size: 16px;
}

.ledger-summary {
    display: flex;
    justify-content: flex-start;
    gap: var(--spacing-xl);
    padding: var(--spacing-sm) 0;
    margin-bottom: var(--spacing-sm);
}

.summary-item {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius-sm);
    min-width: 200px;
}

.summary-item .label {
    font-size: 0.85em;
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-xs);
}

.summary-item .value {
    font-size: 1.4em;
    font-weight: var(--font-weight-extrabold);
    margin-left: var(--spacing-sm);
}

.summary-item.count {
    border-left: 5px solid var(--strong-color);
}

/* 지출 (Expense) 스타일 */
.summary-item.expense {
    border-left: 5px solid var(--danger-color);
}
.summary-item.expense .value,
.summary-item.expense .label {
    color: var(--danger-color);
}

/* 수입 (Income) 스타일 */
.summary-item.income {
    border-left: 5px solid var(--success-color);
}
.summary-item.income .value,
.summary-item.income .label {
    color: var(--success-color);
}

/* ============================================
   📱 모바일 반응형 스타일
   ============================================ */

/* 태블릿 (1024px 이하) */
@media (max-width: 1024px) {
    .ledger-summary {
        flex-wrap: wrap;
        gap: var(--spacing-md);
    }

    .summary-item {
        min-width: 150px;
        flex: 1;
    }

    .search-bar {
        width: 250px;
    }
}

/* 모바일 (768px 이하) */
@media (max-width: 768px) {
    .ledger-controls {
        flex-direction: column;
        align-items: stretch;
        gap: var(--spacing-md);
    }

    .validation-alert {
        font-size: 0.85em;
        padding: var(--spacing-sm);
    }

    .search-bar {
        width: 100%;
    }

    .ledger-summary {
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .summary-item {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        min-width: auto;
        padding: var(--spacing-md);
    }

    .summary-item .label {
        margin-bottom: 0;
    }

    .summary-item .value {
        font-size: 1.2em;
        margin-left: 0;
    }

    /* 테이블 가로 스크롤 */
    table.ledger {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        white-space: nowrap;
    }

    table.ledger thead,
    table.ledger tbody {
        display: table;
        width: 100%;
        min-width: 900px;
    }

    tr.ledger_pin {
        height: 45px;
        font-size: 1em;
    }

    tr.ledger_row {
        height: 45px;
    }

    table.ledger th,
    table.ledger td {
        padding-left: var(--spacing-sm);
        padding-right: var(--spacing-sm);
    }

    /* 필터 모달 */
    .filter-modal {
        width: 95%;
        max-width: 400px;
        max-height: 90vh;
    }

    .filter-modal .modal-header,
    .filter-modal .modal-data-area,
    .filter-modal .modal-footer {
        padding: var(--spacing-md);
    }

    .filter-options {
        max-height: 250px;
    }

    /* 삭제 버튼 */
    .button-layer {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
    }

    button.remove_button {
        padding: var(--spacing-sm) var(--spacing-lg);
    }

    button.remove_button > strong {
        font-size: 14px;
    }
}

/* 작은 모바일 (480px 이하) */
@media (max-width: 480px) {
    .summary-item .value {
        font-size: 1em;
    }

    .summary-item .label {
        font-size: 0.8em;
    }

    table.ledger {
        font-size: 0.7em;
    }

    tr.ledger_pin {
        height: 40px;
        font-size: 0.95em;
    }

    tr.ledger_row {
        height: 40px;
    }
}

/* ============================================
   🌙 다크모드 스타일
   ============================================ */

[data-theme="dark"] tr.ledger_row.invalid-row {
    background-color: rgba(239, 68, 68, 0.2);
    border-left-color: var(--danger-500);
}

[data-theme="dark"] tr.ledger_row.invalid-row.selected {
    background-color: rgba(239, 68, 68, 0.3);
}

[data-theme="dark"] .filter-modal {
    background: var(--bg-primary);
    color: var(--text-primary);
}

[data-theme="dark"] .filter-modal .modal-header {
    background-color: var(--bg-secondary);
    border-bottom-color: var(--border-color);
}

[data-theme="dark"] .filter-modal .modal-footer {
    border-top-color: var(--border-color);
}

[data-theme="dark"] .search-input {
    background-color: var(--bg-primary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

[data-theme="dark"] .search-input:focus {
    border-color: var(--primary-500);
}

[data-theme="dark"] tr.ledger_pin {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

[data-theme="dark"] tr.ledger_row {
    border-bottom-color: var(--border-color);
}

[data-theme="dark"] tr.ledger_row.selected {
    background-color: var(--bg-tertiary);
}

[data-theme="dark"] .checkbox-custom {
    border-color: var(--border-color);
    background-color: var(--bg-primary);
}

[data-theme="dark"] .apply-button {
    background-color: var(--primary-600);
}

[data-theme="dark"] .apply-button:hover {
    background-color: var(--primary-500);
}

[data-theme="dark"] .reset-button {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--border-color);
}

[data-theme="dark"] .reset-button:hover {
    background-color: var(--bg-tertiary);
}
</style>