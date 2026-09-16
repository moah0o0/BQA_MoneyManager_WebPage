<template>
<div class="ledger-wrap">
  <!-- ========== 요약 ========== -->
  <div class="ledger-summary none-select">
    <div class="summary-item count">
      <span class="label">건수</span>
      <span class="value num">{{ totalCount.toLocaleString() }}<small>건</small></span>
    </div>
    <div class="summary-item income">
      <span class="label">수입 합계</span>
      <span class="value num">+{{ totalIncome.toLocaleString() }}<small>원</small></span>
    </div>
    <div class="summary-item expense">
      <span class="label">지출 합계</span>
      <span class="value num">-{{ totalExpense.toLocaleString() }}<small>원</small></span>
    </div>
    <div class="summary-item balance">
      <span class="label">차액</span>
      <span class="value num">{{ balance >= 0 ? '+' : '-' }}{{ Math.abs(balance).toLocaleString() }}<small>원</small></span>
    </div>
  </div>

  <!-- ========== 거르개 · 검색 ========== -->
  <div class="ledger-controls none-select">
    <div class="chipbar">
      <!--
        남은 일을 거르개로 만든다.
        "N건 있습니다"라고 알리기만 하면 그 N건을 손으로 찾아야 한다.
      -->
      <button
        type="button"
        class="chip"
        :class="{ on: onlyInvalid, 'has-work': invalidLedgerCount > 0 }"
        :aria-pressed="onlyInvalid ? 'true' : 'false'"
        @click="onlyInvalid = !onlyInvalid"
      >
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
        덜 적은 것만
        <span class="chip-count num">{{ invalidLedgerCount }}</span>
      </button>

      <button
        v-for="type in FILTER_TYPES"
        :key="type"
        type="button"
        class="chip"
        :class="{ on: activeFilters[type].length > 0 }"
        :aria-pressed="activeFilters[type].length > 0 ? 'true' : 'false'"
        @click="openFilterModal(type)"
      >
        {{ TYPE_LABELS[type] }}
        <span class="chip-count num">{{ activeFilters[type].length > 0 ? activeFilters[type].length : '전체' }}</span>
      </button>

      <button
        v-if="hasAnyFilter"
        type="button"
        class="chip chip-reset"
        @click="resetAllFilters"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i> 거르개 지우기
      </button>
    </div>

    <div class="controls-right">
      <div class="search-bar">
        <i class="bi bi-search" aria-hidden="true"></i>
        <label class="sr-only" for="ledger-search">장부내용·거래적요 검색</label>
        <input
          id="ledger-search"
          type="search"
          v-model="searchQuery"
          placeholder="장부내용 · 거래적요 검색"
          class="search-input"
        >
      </div>

      <button type="button" class="btn btn-secondary btn-sm keys-btn" aria-haspopup="dialog" @click="helpOpen = true">
        <i class="bi bi-keyboard" aria-hidden="true"></i>
        <span class="keys-btn-text">단축키</span>
        <kbd aria-hidden="true">?</kbd>
      </button>
    </div>
  </div>

  <!-- 어떤 일이 일어났는지 소리로도 알린다 -->
  <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  <p v-if="errorMessage" class="notice notice-danger table-error" role="alert">
    <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
    <span>{{ errorMessage }}</span>
  </p>

  <!-- ========== 표 ==========
       표 전체가 탭 스톱 하나다(roving tabindex).
       칸마다 탭 스톱을 두면 백 줄짜리 장부를 지나가는 데만 Tab을 수백 번 눌러야 한다.
  -->
  <div
    class="ledger-table-wrapper scroll-thin"
    @keydown="onGridKeydown"
    @focusin="onGridFocusIn"
  >
  <table
    class="ledger"
    ref="tableRef"
    role="grid"
    :aria-rowcount="filteredLedgerList.length + 1"
    :aria-colcount="COL_COUNT"
  >
    <caption class="sr-only">
      장부 목록. 방향키로 칸을 옮기고, Enter를 누르거나 글자를 치면 바로 고칠 수 있습니다.
      Ctrl+D는 윗줄의 항·목·세목을 가져옵니다. 물음표 키를 누르면 단축키를 모두 볼 수 있습니다.
    </caption>
    <colgroup>
      <col style="width:38px"><col style="width:9%"><col style="width:8%"><col style="width:5%">
      <col style="width:11%"><col style="width:15%"><col style="width:13%">
      <col style="width:auto"><col style="width:9%"><col style="width:8%">
    </colgroup>
    <thead>
    <tr class="ledger_pin" role="row">
      <th scope="col" role="columnheader" class="c-check">
        <input
          type="checkbox"
          class="select"
          :checked="allVisibleSelected"
          :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
          :disabled="!canEdit || filteredLedgerList.length === 0"
          aria-label="보이는 내역 모두 선택"
          @change="toggleSelectAllVisible"
        />
      </th>
      <th scope="col" role="columnheader">거래일시</th>
      <th scope="col" role="columnheader">거래정보</th>
      <th scope="col" role="columnheader">관</th>
      <th scope="col" role="columnheader">항</th>
      <th scope="col" role="columnheader">목</th>
      <th scope="col" role="columnheader">세목</th>
      <th scope="col" role="columnheader">장부내용</th>
      <th scope="col" role="columnheader" class="r">장부금액</th>
      <th scope="col" role="columnheader">지출증빙</th>
    </tr>
    </thead>
    <tbody>
    <template v-if="filteredLedgerList.length && ASSETS_LIST">
      <tr :class="{'ledger_row': true, 'selected': isLedgerSelected(LEDGER.expand.transaction.id), 'invalid-row': isInvalid(LEDGER), 'is-cursor-row': focus.row === rowIndex}"
          v-for="(LEDGER, rowIndex) in filteredLedgerList"
          :key="LEDGER.id"
          role="row"
          :aria-rowindex="rowIndex + 2">

        <td class="c-check" role="gridcell" :data-cell="`${rowIndex}-0`">
          <input class="select" type="checkbox"
                 :tabindex="tabIndexOf(rowIndex, 0)"
                 @change="canEdit ? selectLedgerRow(LEDGER.expand.transaction.id) : null"
                 :checked="isLedgerSelected(LEDGER.expand.transaction.id)"
                 :disabled="!canEdit"
                 :aria-label="`${datetimeFormatter(LEDGER.expand.transaction.datetime)} ${LEDGER.money.toLocaleString()}원 선택`"/>
        </td>

        <td class="num c-date">
          {{ datetimeFormatter(LEDGER.expand.transaction.datetime) }}
        </td>

        <td role="gridcell" :data-cell="`${rowIndex}-1`">
          <TransactionLabel
              :transaction="LEDGER.expand.transaction"
              :bank-setting-list="BANK_SETTING_LIST"
              :tabindex="tabIndexOf(rowIndex, 1)"/>
        </td>

        <td>
          <GwanLabel :label="LEDGER.gwan"/>
        </td>

        <td role="gridcell" :data-cell="`${rowIndex}-2`">
          <DropdownLabel
              type="Hang"
              :is-require="true"
              :disabled="!canEdit"
              :assets-id="LEDGER.hang"
              :assets-list="ASSETS_LIST.Hang"
              :ledger-record="LEDGER"
              :is-open="openCell === `hang-${LEDGER.id}`"
              :initial-query="pendingInput"
              :tabindex="tabIndexOf(rowIndex, 2)"
              @updated="(value) => handleDropdownUpdate(LEDGER, 'hang', value)"
              @open="openEditor(rowIndex, 2)"
              @close="closeEditor"/>
        </td>

        <td role="gridcell" :data-cell="`${rowIndex}-3`">
          <DropdownLabel
              type="Mok"
              :is-require="true"
              :disabled="!canEdit"
              :assets-id="LEDGER.mok"
              :assets-list="ASSETS_LIST.Mok"
              :ledger-record="LEDGER"
              :is-open="openCell === `mok-${LEDGER.id}`"
              :initial-query="pendingInput"
              :tabindex="tabIndexOf(rowIndex, 3)"
              @updated="(value) => handleDropdownUpdate(LEDGER, 'mok', value)"
              @open="openEditor(rowIndex, 3)"
              @close="closeEditor"/>
        </td>

        <td role="gridcell" :data-cell="`${rowIndex}-4`">
          <DropdownLabel
              type="Saemok"
              :is-require="true"
              :disabled="!canEdit"
              :assets-id="LEDGER.saemok"
              :assets-list="ASSETS_LIST.Saemok"
              :ledger-record="LEDGER"
              :current-mok-id="LEDGER.mok"
              :is-open="openCell === `saemok-${LEDGER.id}`"
              :initial-query="pendingInput"
              :tabindex="tabIndexOf(rowIndex, 4)"
              @updated="(value) => handleDropdownUpdate(LEDGER, 'saemok', value)"
              @open="openEditor(rowIndex, 4)"
              @close="closeEditor"/>
        </td>

        <td role="gridcell" :data-cell="`${rowIndex}-5`">
          <ReasonLabel
              :ledger-record-id="LEDGER.id"
              :original-reason-text="LEDGER.reason"
              :placeholder="LEDGER.expand.transaction.description"
              :disabled="!canEdit"
              :is-open="openCell === `reason-${LEDGER.id}`"
              :initial-text="pendingInput || null"
              :tabindex="tabIndexOf(rowIndex, 5)"
              @open="openEditor(rowIndex, 5)"
              @close="closeEditor"
              @updated="(text) => applyLocal(LEDGER, { reason: text }, '장부내용을 저장했습니다')"
              @error="(m) => showError(m)"/>
        </td>

        <td class="num r money" :class="LEDGER.gwan === '수입' ? 'is-income' : 'is-expense'">
          {{ LEDGER.gwan === '수입' ? '+' : '-' }}{{ LEDGER.money.toLocaleString() }}
        </td>

        <td role="gridcell" :data-cell="`${rowIndex}-6`">
          <ReceiptLabel
              :ledger-record="LEDGER"
              :canEdit="canEdit"
              :tabindex="tabIndexOf(rowIndex, 6)"
              @update-complete="getLedger"/>
        </td>
      </tr>
    </template>
    <tr v-else>
      <td :colspan="10">
        <div class="empty-state">
          <i :class="['bi', LEDGER_LIST.length ? 'bi-funnel' : 'bi-inbox']" aria-hidden="true"></i>
          <p>{{ LEDGER_LIST.length ? '거르개에 걸리는 내역이 없습니다.' : '이 기간에 등록된 내역이 없습니다.' }}</p>
          <button v-if="LEDGER_LIST.length && hasAnyFilter" type="button" class="btn btn-secondary btn-sm" @click="resetAllFilters">
            거르개 지우기
          </button>
        </div>
      </td>
    </tr>
    </tbody>
  </table>
  </div>

  <p v-if="canEdit && filteredLedgerList.length" class="hint grid-hint">
    <i class="bi bi-keyboard" aria-hidden="true"></i>
    <kbd>Tab</kbd>으로 표에 들어와 방향키로 이동 · 글자를 치면 그 칸이 바로 열립니다 ·
    <kbd>Ctrl</kbd>+<kbd>D</kbd> 윗줄 가져오기 · <kbd>?</kbd> 단축키 전체
  </p>

  <!-- ========== 항/목/세목 거르개 창 ========== -->
  <AppModal
    v-if="filterModal.isOpen"
    :title="`${filterModalType} 거르개`"
    :description="`보고 싶은 ${filterModalType}만 고르세요. 아무것도 고르지 않으면 전체를 봅니다.`"
    size="sm"
    @close="closeFilterModal"
  >
    <ul class="filter-options">
      <li v-for="asset in getFilterOptionsByType(filterModal.type)" :key="asset.id" class="filter-item">
        <label class="checkbox-label" :class="{'is-none-field': asset.is_none_field}">
          <input type="checkbox" :value="asset.id" v-model="pendingFilters[filterModal.type]">
          <span class="checkbox-text">
            <span class="priority num">{{ asset.priority_string }}</span>
            {{ asset.label }}
          </span>
        </label>
      </li>
      <li v-if="getFilterOptionsByType(filterModal.type).length === 0" class="empty">
        고를 항목이 없습니다.
      </li>
    </ul>

    <template #footer>
      <span class="filter-count">{{ pendingFilters[filterModal.type].length > 0 ? `${pendingFilters[filterModal.type].length}개 선택` : '전체' }}</span>
      <button type="button" class="btn btn-ghost" @click="resetFilter(filterModal.type)">초기화</button>
      <button type="button" class="btn btn-primary" @click="applyFilter">적용</button>
    </template>
  </AppModal>

  <!-- ========== 일괄 지정 창 ========== -->
  <AppModal
    v-if="bulkModal.isOpen"
    :title="`선택한 ${SELECTED_TRANSACTION_LIST.length}건의 ${TYPE_LABELS[bulkModal.type]} 지정`"
    :description="bulkHint"
    size="sm"
    @close="bulkModal.isOpen = false"
  >
    <ul v-if="bulkOptions.length" class="filter-options">
      <li v-for="asset in bulkOptions" :key="asset.id" class="filter-item">
        <button type="button" class="bulk-option" @click="applyBulk(asset.id)">
          <span class="priority num">{{ asset.priority_string }}</span>
          {{ asset.label }}
        </button>
      </li>
    </ul>
    <p v-else class="empty">{{ bulkBlockedReason }}</p>
  </AppModal>

  <!-- ========== 단축키 도움말 ========== -->
  <AppModal
    v-if="helpOpen"
    title="장부 단축키"
    icon="bi-keyboard"
    description="장부는 마우스 없이 키보드만으로 다 적을 수 있습니다."
    size="md"
    @close="helpOpen = false"
  >
    <section v-for="group in SHORTCUTS" :key="group.title" class="keys-group">
      <h3>{{ group.title }}</h3>
      <dl>
        <div v-for="item in group.items" :key="item.what" class="keys-row">
          <dt>
            <kbd v-for="k in item.keys" :key="k">{{ k }}</kbd>
          </dt>
          <dd>{{ item.what }}</dd>
        </div>
      </dl>
    </section>

    <template #footer>
      <button type="button" class="btn btn-primary" @click="helpOpen = false">닫기</button>
    </template>
  </AppModal>

  <!-- ========== 고른 것에 대한 띠 ========== -->
  <!--
    고른 줄에 할 수 있는 일을 한자리에 모은다.
    예전에는 여러 줄을 골라도 '삭제'밖에 할 수 없어서,
    같은 분류를 스무 번 따로 지정해야 했다.
  -->
  <div class="actionbar" v-if="SELECTED_TRANSACTION_LIST.length && canEdit" role="region" aria-label="선택한 내역 작업">
    <span class="n num">{{ SELECTED_TRANSACTION_LIST.length }}</span>
    <span class="actionbar-label">건 선택</span>

    <span class="actionbar-sep" aria-hidden="true"></span>

    <button
      v-for="type in FILTER_TYPES"
      :key="type"
      type="button"
      class="btn btn-secondary btn-sm"
      @click="openBulkModal(type)"
    >
      {{ TYPE_LABELS[type] }} 지정
    </button>

    <span class="actionbar-sep" aria-hidden="true"></span>

    <!-- 증빙은 줄마다 창을 열지 않고 여기서 한 번에 바꾼다 -->
    <button type="button" class="btn btn-secondary btn-sm" :disabled="bulkBusy" @click="applyBulkReceipt(true)">
      <i class="bi bi-slash-circle" aria-hidden="true"></i> 증빙 불요
    </button>
    <button type="button" class="btn btn-secondary btn-sm" :disabled="bulkBusy" @click="applyBulkReceipt(false)">
      <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> 증빙 미처리
    </button>

    <span class="actionbar-sep" aria-hidden="true"></span>

    <button type="button" class="btn btn-ghost btn-sm" @click="SELECTED_TRANSACTION_LIST = []">선택 해제</button>
    <button type="button" class="btn btn-danger btn-sm" :disabled="bulkBusy" @click="removeSelectedLedger">삭제</button>
  </div>
</div>
</template>

<script>
import TransactionLabel from './TransactionLabel.vue';
import GwanLabel from './GwanLabel.vue';
import DropdownLabel from './DropdownLabel.vue'
import ReceiptLabel from './ReceiptLabel.vue';
import ReasonLabel from './ReasonLabel.vue';
import AppModal from '../layout/AppModal.vue';

import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

const FILTER_TYPES = ['Hang', 'Mok', 'Saemok']
const TYPE_LABELS = { Hang: '항', Mok: '목', Saemok: '세목' }
const PAD = { Hang: 2, Mok: 3, Saemok: 4 }

/**
 * 방향키가 오갈 칸.
 * 0 고르기 · 1 거래정보 · 2 항 · 3 목 · 4 세목 · 5 장부내용 · 6 지출증빙
 * 눌리는 것이 들어 있는 칸은 하나도 빠짐없이 여기에 있어야 한다 —
 * 하나라도 빠지면 그 칸에 가려고 마우스를 잡아야 한다.
 */
const NAV_COLS = 7
const LAST_COL = NAV_COLS - 1

/** 글자를 치면 바로 고쳐지는 칸 (분류 셋 + 장부내용) */
const TYPE_TO_EDIT = [2, 3, 4, 5]

/** 칸 번호 → 그 칸의 편집기를 여는 열쇠 앞머리 */
const CELL_KEY = { 2: 'hang', 3: 'mok', 4: 'saemok', 5: 'reason' }

/** 한 번에 건너뛸 줄 수 (PageUp / PageDown) */
const PAGE_ROWS = 10

const SHORTCUTS = [
  {
    title: '표 안에서 옮기기',
    items: [
      { keys: ['Tab'], what: '표에 들어가기 / 표에서 나가기 (표 전체가 탭 자리 하나입니다)' },
      { keys: ['←', '→', '↑', '↓'], what: '옆 칸 · 윗줄 · 아랫줄로' },
      { keys: ['Home'], what: '그 줄의 첫 칸' },
      { keys: ['End'], what: '그 줄의 마지막 칸' },
      { keys: ['Ctrl', 'Home'], what: '첫 줄로' },
      { keys: ['Ctrl', 'End'], what: '마지막 줄로' },
      { keys: ['PgUp'], what: '열 줄 위로' },
      { keys: ['PgDn'], what: '열 줄 아래로' },
    ],
  },
  {
    title: '적기',
    items: [
      { keys: ['숫자'], what: '치는 순간 그 칸이 열리며 그 번호로 찾습니다 (계정과목 번호)' },
      { keys: ['한글'], what: '치는 순간 그 칸이 열립니다' },
      { keys: ['Enter'], what: '칸 열기 / 적은 것을 저장' },
      { keys: ['Esc'], what: '고치던 것을 되돌리고 닫기' },
      { keys: ['Tab'], what: '(고치는 중) 저장하고 옆 칸으로' },
      { keys: ['Ctrl', 'D'], what: '윗줄의 항 · 목 · 세목을 그대로 가져오기' },
    ],
  },
  {
    title: '고르기 · 한꺼번에 하기',
    items: [
      { keys: ['Space'], what: '이 줄 고르기 / 고른 것 풀기' },
      { keys: ['Shift', '↑ ↓'], what: '위아래로 이어서 고르기' },
      { keys: ['Ctrl', 'A'], what: '보이는 줄 모두 고르기' },
      { keys: ['Esc'], what: '고른 것 모두 풀기' },
    ],
  },
  {
    title: '그 밖에',
    items: [
      { keys: ['?'], what: '이 도움말' },
      { keys: ['/'], what: '검색칸으로' },
    ],
  },
]

export default {
  components: {
    TransactionLabel,
    GwanLabel,
    DropdownLabel,
    ReasonLabel,
    ReceiptLabel,
    AppModal,
  },

  props: ['filterStartDate', 'filterEndDate', 'canEdit'],
  emits: ["refresh"],

  data(){
    return {
      FILTER_TYPES,
      TYPE_LABELS,
      SHORTCUTS,
      COL_COUNT: 10,

      /**
       * 표 안에서 지금 손이 가 있는 칸.
       * 이 한 칸만 탭 자리를 갖는다(roving tabindex) — 표는 통틀어 탭 자리 하나다.
       */
      focus: { row: 0, col: 2 },
      /** 글자를 쳐서 칸을 열었을 때 이미 친 글자 */
      pendingInput: '',
      /** 표에 한 번이라도 손이 닿았는지. 처음 들어올 때 '할 일'로 데려가려고 본다 */
      touched: false,
      /** Shift+방향키로 이어 고를 때의 기준 줄 */
      selectAnchor: null,

      helpOpen: false,
      bulkBusy: false,

      LEDGER_LIST: [], // 원본 데이터
      ASSETS_LIST: {
        Hang: [],
        Mok: [],
        Saemok: []
      },
      BANK_SETTING_LIST: [],

      /** 지금 열려 있는 칸은 하나뿐이다 — 객체에 모아 두면 닫힌 것까지 들고 다니게 된다 */
      openCell: null,
      SELECTED_TRANSACTION_LIST: [],

      searchQuery: '',
      onlyInvalid: false,

      statusMessage: '',
      errorMessage: '',

      activeFilters: { Hang: [], Mok: [], Saemok: [] },
      filterModal: { isOpen: false, type: null },
      pendingFilters: { Hang: [], Mok: [], Saemok: [] },
      bulkModal: { isOpen: false, type: null },
    }
  },

  async mounted(){
    await this.getAssets();
    await this.getLedger();
    window.addEventListener('keydown', this.onWindowKeydown);
    window.addEventListener('mousedown', this.onWindowMousedown);
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onWindowKeydown);
    window.removeEventListener('mousedown', this.onWindowMousedown);
    clearTimeout(this.statusTimer);
    clearTimeout(this.errorTimer);
  },

  watch: {
    filterStartDate() { this.getLedger(); },
    filterEndDate() { this.getLedger(); },

    /*
      보이는 줄이 바뀌면(거르개·검색·새로 불러오기) 손이 가 있던 자리가 없어질 수 있다.
      그대로 두면 Tab을 눌렀을 때 아무 데도 가지 않는다.
    */
    filteredLedgerList: {
      immediate: true,
      handler(list) {
        if (list.length === 0) {
          this.focus = { row: 0, col: 2 }
          return
        }

        // 아직 표에 손을 댄 적이 없으면 '할 일'로 데려간다 —
        // 표에 들어오자마자 적어야 할 첫 칸에 서 있게 된다
        if (!this.touched) {
          this.focus = this.firstTodoCell(list)
          return
        }

        if (this.focus.row >= list.length) {
          this.focus = { row: list.length - 1, col: this.focus.col }
        }
      }
    }
  },

  computed: {
    filterModalType(){
      return TYPE_LABELS[this.filterModal.type] ?? ''
    },

    totalCount() {
      return this.filteredLedgerList.length;
    },

    totalExpense() {
      return this.filteredLedgerList.reduce((sum, ledger) =>
        ledger.gwan === '지출' ? sum + ledger.money : sum, 0);
    },

    totalIncome() {
      return this.filteredLedgerList.reduce((sum, ledger) =>
        ledger.gwan === '수입' ? sum + ledger.money : sum, 0);
    },

    balance() {
      return this.totalIncome - this.totalExpense;
    },

    hasAnyFilter() {
      return this.onlyInvalid
        || this.searchQuery.trim().length > 0
        || FILTER_TYPES.some(t => this.activeFilters[t].length > 0)
    },

    filteredLedgerList() {
      let list = this.LEDGER_LIST;
      const query = this.searchQuery.toLowerCase().trim();

      // 장부내용 + 은행 적요까지 함께 찾는다. 적으려는 근거가 적요에 있는 일이 많다
      if (query.length > 0) {
        list = list.filter(ledger =>
            (ledger.reason || '').toLowerCase().includes(query)
            || (ledger.expand?.transaction?.description || '').toLowerCase().includes(query)
        );
      }

      FILTER_TYPES.forEach(type => {
        const filterIds = this.activeFilters[type];
        const fieldName = type.toLowerCase();
        if (filterIds.length > 0) {
          list = list.filter(ledger => filterIds.includes(ledger[fieldName]));
        }
      });

      if (this.onlyInvalid) list = list.filter(this.isInvalid);

      return list;
    },

    invalidLedgerCount() {
      return this.LEDGER_LIST.filter(this.isInvalid).length;
    },

    hasValidationIssue() {
      return this.invalidLedgerCount > 0;
    },

    /** 보이는 줄 가운데 고른 것 */
    visibleSelectedCount() {
      return this.filteredLedgerList
        .filter(l => this.SELECTED_TRANSACTION_LIST.includes(l.expand.transaction.id)).length
    },

    allVisibleSelected() {
      return this.filteredLedgerList.length > 0
        && this.visibleSelectedCount === this.filteredLedgerList.length
    },

    someVisibleSelected() {
      return this.visibleSelectedCount > 0
    },

    /** 고른 줄들이 이미 같은 항(목)을 쓰고 있는지 — 일괄 지정의 범위를 여기서 정한다 */
    selectedLedgers() {
      return this.LEDGER_LIST.filter(l =>
        this.SELECTED_TRANSACTION_LIST.includes(l.expand.transaction.id))
    },

    commonHang() {
      const ids = new Set(this.selectedLedgers.map(l => l.hang))
      return ids.size === 1 ? [...ids][0] : null
    },

    commonMok() {
      const ids = new Set(this.selectedLedgers.map(l => l.mok))
      return ids.size === 1 ? [...ids][0] : null
    },

    bulkOptions() {
      const type = this.bulkModal.type
      if (!type) return []

      let list = [...this.ASSETS_LIST[type]].sort((a, b) => a.priority - b.priority)

      if (type === 'Mok') {
        if (!this.commonHang) return []
        list = list.filter(m => m.expand?.parent_hang?.id === this.commonHang)
      }

      if (type === 'Saemok') {
        if (!this.commonMok) return []
        const mok = this.ASSETS_LIST.Mok.find(m => m.id === this.commonMok)
        if (mok?.is_able_specific_saemok) {
          list = list.filter(s => mok.able_specific_saemok_list?.includes(s.id))
        }
      }

      return list.map(a => ({ ...a, priority_string: this.zeroPad(a.priority, PAD[type]) }))
    },

    bulkBlockedReason() {
      const type = this.bulkModal.type
      if (type === 'Mok') return '고른 줄들의 항이 서로 다릅니다. 항을 먼저 같게 맞춰 주세요.'
      if (type === 'Saemok') return '고른 줄들의 목이 서로 다릅니다. 목을 먼저 같게 맞춰 주세요.'
      return '고를 항목이 없습니다.'
    },

    bulkHint() {
      const type = this.bulkModal.type
      if (type === 'Hang') return '항을 바꾸면 그 줄의 목·세목은 지워집니다.'
      if (type === 'Mok') return '목을 바꾸면 그 줄의 세목은 지워집니다.'
      return '고른 줄 전체에 한 번에 적용됩니다.'
    },
  },

  methods: {
    zeroPad(number, desiredLength){
      return String(number).padStart(desiredLength, '0');
    },

    isInvalid(ledger) {
      const condition1 = !ledger.hang || !ledger.mok || !ledger.saemok;
      const isReceiptMissing = ledger.receipt.length == 0;
      const condition2 = !ledger.not_need_receipt && isReceiptMissing;
      const condition3 = !ledger.reason || ledger.reason.trim().length === 0;

      return condition1 || condition2 || condition3;
    },

    // ---------- 알림 ----------
    showStatus(message) {
      this.statusMessage = message
      clearTimeout(this.statusTimer)
      this.statusTimer = setTimeout(() => (this.statusMessage = ''), 3000)
    },

    showError(message) {
      this.errorMessage = message
      clearTimeout(this.errorTimer)
      this.errorTimer = setTimeout(() => (this.errorMessage = ''), 6000)
    },

    // ---------- 탭 자리 (roving tabindex) ----------
    /**
     * 손이 가 있는 칸 하나만 탭 자리를 갖는다.
     * 칸마다 0으로 두면 백 줄짜리 장부를 지나가는 데만 Tab을 수백 번 눌러야 한다.
     */
    tabIndexOf(row, col) {
      return (this.focus.row === row && this.focus.col === col) ? 0 : -1
    },

    /** 마우스로 눌렀을 때도 손이 간 자리를 따라간다 — 안 그러면 다음 Tab이 엉뚱한 데로 간다 */
    onGridFocusIn(e) {
      const cell = e.target.closest?.('[data-cell]')
      if (!cell) return
      const [row, col] = cell.dataset.cell.split('-').map(Number)
      this.focus = { row, col }
      this.touched = true
    },

    // ---------- 칸 열고 닫기 ----------
    /** 칸을 연다. query가 있으면 이미 친 글자를 이어받아 연다 */
    openEditor(row, col, query = '') {
      const ledger = this.filteredLedgerList[row]
      const key = CELL_KEY[col]
      if (!ledger || !key) return

      this.focus = { row, col }
      this.pendingInput = query
      this.openCell = `${key}-${ledger.id}`
    },

    /**
     * 칸을 닫고 손이 갈 자리를 정한다.
     * 닫기만 하고 끝내면 포커스가 body로 날아가서, 결국 마우스를 다시 잡아야 한다.
     * @param {{move?: 'next'|'prev'|'down'|null}} payload
     */
    closeEditor(payload = {}) {
      const { row, col } = this.focus
      this.openCell = null
      this.pendingInput = ''

      const move = payload?.move ?? null

      this.$nextTick(() => {
        if (move === 'next') this.focusCell(row, col + 1, { wrap: true })
        else if (move === 'prev') this.focusCell(row, col - 1, { wrap: true })
        else if (move === 'down') this.focusCell(row + 1, col)
        else this.focusCell(row, col)
      })
    },

    /** 표 밖을 누르면 열린 칸을 닫는다 (목록 안 누름은 목록이 막아 둔다) */
    onWindowMousedown(e) {
      if (!this.openCell) return
      if (e.target.closest?.('.dropdown-container, .ReasonLabel')) return
      this.openCell = null
      this.pendingInput = ''
    },

    /** 창 어디서든 듣는 키 — 표 밖에 손이 있어도 도움말은 열려야 한다 */
    onWindowKeydown(e) {
      if (e.isComposing || e.keyCode === 229) return

      if (e.key === 'Escape') {
        if (this.openCell) { this.openCell = null; this.pendingInput = '' }
        return
      }

      // 글을 적는 중에는 ?나 /가 글자다
      if (this.isTypingTarget(e.target)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === '?') {
        e.preventDefault()
        this.helpOpen = true
      } else if (e.key === '/') {
        e.preventDefault()
        document.getElementById('ledger-search')?.focus()
      }
    },

    isTypingTarget(el) {
      const tag = el?.tagName
      if (tag === 'TEXTAREA') return true
      if (tag === 'INPUT') return !['checkbox', 'radio', 'button'].includes(el.type)
      return el?.isContentEditable === true
    },

    // ---------- 키보드로 칸 옮기기 ----------
    /**
     * 표 안에서의 키. 장부는 같은 일을 수십 줄 되풀이하는 일이라,
     * 칸마다 마우스로 겨누게 하면 그만큼이 그대로 시간이 된다.
     */
    onGridKeydown(e) {
      const cell = e.target.closest?.('[data-cell]')
      if (!cell) return

      const [row, col] = cell.dataset.cell.split('-').map(Number)

      /*
        글을 고치는 중이면 그 칸이 키를 통째로 맡는다.
        표가 먼저 가로채면 Ctrl/Cmd+A가 '글 전체 고르기'가 아니라
        '줄 전체 고르기'가 되어 버린다 — 적던 사람은 무슨 일이 난 건지 알 수 없다.
        Ctrl+D도 마찬가지다(맥에서는 글자 지우기다).
        칸이 스스로 맡는 Enter · Tab · Esc는 그 칸의 손잡이에 달려 있다.
      */
      if (this.isTypingTarget(e.target)) return

      // 윗줄의 분류를 그대로 가져온다 — 같은 성격의 거래가 잇달아 들어오는 일이 많다
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        this.copyFromAbove(row)
        return
      }

      // 보이는 줄 모두 고르기
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        this.selectAllVisible()
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (e.shiftKey) this.extendSelection(row, row + 1)
          this.focusCell(row + 1, col)
          return

        case 'ArrowUp':
          e.preventDefault()
          if (e.shiftKey) this.extendSelection(row, row - 1)
          this.focusCell(row - 1, col)
          return

        case 'ArrowLeft':
          e.preventDefault()
          this.focusCell(row, col - 1)
          return

        case 'ArrowRight':
          e.preventDefault()
          this.focusCell(row, col + 1)
          return

        case 'Home':
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) this.focusCell(0, col)
          else this.focusCell(row, 0)
          return

        case 'End':
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) this.focusCell(this.filteredLedgerList.length - 1, col)
          else this.focusCell(row, LAST_COL)
          return

        case 'PageDown':
          e.preventDefault()
          this.focusCell(Math.min(row + PAGE_ROWS, this.filteredLedgerList.length - 1), col)
          return

        case 'PageUp':
          e.preventDefault()
          this.focusCell(Math.max(row - PAGE_ROWS, 0), col)
          return

        case 'Escape':
          // 고른 것을 푼다 — 마우스 없이도 되돌릴 수 있어야 한다
          if (this.SELECTED_TRANSACTION_LIST.length) {
            e.preventDefault()
            this.SELECTED_TRANSACTION_LIST = []
            this.selectAnchor = null
            this.showStatus('고른 것을 모두 풀었습니다')
          }
          return

        case ' ':
          // 어느 칸에 있든 Space는 그 줄을 고른다 (고르기 칸에서는 체크박스가 알아서 한다)
          if (col !== 0 && this.canEdit) {
            e.preventDefault()
            this.selectLedgerRow(this.filteredLedgerList[row]?.expand?.transaction?.id)
            this.selectAnchor = row
          }
          return

        case 'Enter':
        case 'F2':
          if (CELL_KEY[col] && this.canEdit) {
            e.preventDefault()
            this.openEditor(row, col)
          }
          return
      }

      // 글자를 치면 그 칸이 바로 열린다 — 엑셀에서 칸에 대고 치는 것과 같게
      if (!this.canEdit || !TYPE_TO_EDIT.includes(col)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      /*
        한글은 IME가 먼저 가로챈다.
        단추에는 글을 적을 자리가 없어서 브라우저가 keyCode 229(또는 'Process')만 흘려보내고
        정작 글자는 알려 주지 않는다. 그래도 '고치겠다는 뜻'인 건 분명하니 칸은 연다.
      */
      const imeSwallowed = e.keyCode === 229 || e.key === 'Process'
      const printable = e.key.length === 1

      if (!imeSwallowed && !printable) return
      // 창 전체가 쓰는 키는 칸을 열지 않는다 (? 도움말 · / 검색)
      if (e.key === '?' || e.key === '/') return

      e.preventDefault()

      /*
        이어받을 글자는 뜻이 분명한 것만 고른다.
        IME가 켜져 있으면 한글 자리의 키가 로마자('q' 같은)로 올 수 있는데,
        그걸 검색칸에 넣으면 지우고 다시 쳐야 한다 — 없느니만 못하다.
        숫자(계정과목 번호)와 한글은 그대로 이어받는다.
      */
      const seed = printable && /^[0-9]$|^[가-힣ㄱ-ㅎㅏ-ㅣ]$/.test(e.key) ? e.key : ''
      this.openEditor(row, col, seed)
    },

    /**
     * 그 칸의 눌리는 것에 손을 옮긴다.
     * @param {{wrap?: boolean}} opts wrap이면 줄 끝에서 다음(이전) 줄로 넘어간다
     */
    focusCell(row, col, opts = {}) {
      let r = row
      let c = col

      if (opts.wrap) {
        if (c > LAST_COL) { c = 0; r += 1 }
        else if (c < 0) { c = LAST_COL; r -= 1 }
      }

      if (r < 0 || r >= this.filteredLedgerList.length) return false
      if (c < 0 || c > LAST_COL) return false

      const holder = this.$refs.tableRef?.querySelector(`[data-cell="${r}-${c}"]`)
      if (!holder) return false

      // 고르기 칸은 그 자체가 입력이고, 나머지는 안에 단추가 들어 있다
      const target = holder.matches('input') ? holder : holder.querySelector('button, input')
      if (!target) return false

      // 먼저 탭 자리를 옮겨야 focus()가 새 자리에 남는다
      this.focus = { row: r, col: c }
      this.touched = true
      this.$nextTick(() => target.focus({ preventScroll: false }))
      return true
    },

    /**
     * 가장 먼저 적어야 할 칸.
     * 표에 들어오자마자 '첫 줄 첫 칸'에 서면, 이미 다 적은 줄을 지나 내려가야 한다.
     */
    firstTodoCell(list) {
      for (let r = 0; r < list.length; r += 1) {
        const l = list[r]
        if (!l.hang) return { row: r, col: 2 }
        if (!l.mok) return { row: r, col: 3 }
        if (!l.saemok) return { row: r, col: 4 }
        if (!l.reason || !l.reason.trim()) return { row: r, col: 5 }
        if (!l.not_need_receipt && l.receipt.length === 0) return { row: r, col: 6 }
      }
      return { row: 0, col: 2 }
    },

    /** Shift+방향키로 사이에 있는 줄을 이어서 고른다 */
    extendSelection(fromRow, toRow) {
      if (!this.canEdit) return
      if (this.selectAnchor === null) this.selectAnchor = fromRow

      const lo = Math.min(this.selectAnchor, toRow)
      const hi = Math.max(this.selectAnchor, toRow)
      const ids = this.filteredLedgerList
        .slice(lo, hi + 1)
        .map(l => l.expand.transaction.id)

      this.SELECTED_TRANSACTION_LIST = [...new Set(ids)]
    },

    /** 바로 윗줄의 항·목·세목을 지금 줄에 옮겨 적는다 */
    async copyFromAbove(rowIndex) {
      if (!this.canEdit) return

      if (rowIndex <= 0) {
        this.showStatus('맨 윗줄에서는 가져올 줄이 없습니다')
        return
      }

      const above = this.filteredLedgerList[rowIndex - 1]
      const target = this.filteredLedgerList[rowIndex]
      if (!above || !target) return

      if (!above.hang && !above.mok && !above.saemok) {
        this.showStatus('윗줄에 적힌 항·목·세목이 없습니다')
        return
      }

      const patch = { hang: above.hang, mok: above.mok, saemok: above.saemok }
      await this.saveLedger(target, patch, '윗줄의 항·목·세목을 가져왔습니다')
    },

    // ---------- 저장 ----------
    /**
     * 화면을 먼저 바꾸고 서버에 보낸다.
     * 예전처럼 저장할 때마다 목록 전체를 다시 받아 오면
     * 한 칸 고칠 때마다 표가 통째로 다시 그려져 보던 자리를 잃는다.
     */
    applyLocal(ledger, patch, message) {
      Object.assign(ledger, patch)
      if (message) this.showStatus(message)
    },

    async saveLedger(ledger, patch, message) {
      if (!this.canEdit) return

      const before = {}
      Object.keys(patch).forEach(k => { before[k] = ledger[k] })

      this.applyLocal(ledger, patch, message)

      try {
        const updated = await pb.collection('Ledger').update(ledger.id, patch, { expand: 'receipt,transaction,mok' })
        // 서버가 돌려준 expand(특히 목의 세목 제한)를 반영해야 다음 칸의 목록이 맞는다
        if (updated?.expand) ledger.expand = { ...ledger.expand, ...updated.expand }
      } catch (error) {
        console.error("Failed to update ledger record:", error);
        Object.assign(ledger, before)   // 되돌린다
        this.showError('저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.')
      }
    },

    async handleDropdownUpdate(ledger, field, value) {
      if (!this.canEdit) return

      const patch = { [field]: value }

      // 위가 바뀌면 아래는 더 이상 맞지 않는다 — 함께 비운다
      if (field === 'hang') { patch.mok = null; patch.saemok = null }
      else if (field === 'mok') { patch.saemok = null }

      await this.saveLedger(ledger, patch, `${TYPE_LABELS[field.charAt(0).toUpperCase() + field.slice(1)] ?? ''}을(를) 저장했습니다`)
    },

    // ---------- 일괄 지정 ----------
    openBulkModal(type) {
      this.bulkModal = { isOpen: true, type }
    },

    async applyBulk(assetId) {
      const type = this.bulkModal.type
      const field = type.toLowerCase()
      const targets = [...this.selectedLedgers]

      this.bulkModal.isOpen = false

      const patch = { [field]: assetId }
      if (field === 'hang') { patch.mok = null; patch.saemok = null }
      else if (field === 'mok') { patch.saemok = null }

      const before = targets.map(l => ({ hang: l.hang, mok: l.mok, saemok: l.saemok }))
      targets.forEach(l => Object.assign(l, patch))

      try {
        await Promise.all(targets.map(l => pb.collection('Ledger').update(l.id, patch)))
        this.showStatus(`${targets.length}건의 ${TYPE_LABELS[type]}을(를) 지정했습니다`)
        // 목이 바뀌면 그에 딸린 세목 제한도 달라진다 — 여기서만 다시 받아 온다
        if (field !== 'saemok') await this.getLedger()
      } catch (error) {
        console.error('Failed to bulk update:', error)
        targets.forEach((l, i) => Object.assign(l, before[i]))
        this.showError('일괄 지정에 실패했습니다.')
      }
    },

    // ---------- 거르개 ----------
    openFilterModal(type) {
      this.filterModal.type = type;
      FILTER_TYPES.forEach(t => { this.pendingFilters[t] = [...this.activeFilters[t]] })
      this.filterModal.isOpen = true;
    },

    closeFilterModal() {
      this.filterModal.isOpen = false;
      this.filterModal.type = null;
    },

    applyFilter() {
      this.activeFilters = {
          Hang: [...this.pendingFilters.Hang],
          Mok: [...this.pendingFilters.Mok],
          Saemok: [...this.pendingFilters.Saemok]
      };
      this.closeFilterModal();
    },

    resetFilter(type) {
      this.pendingFilters[type] = [];
      this.activeFilters = { ...this.activeFilters, [type]: [] };
    },

    resetAllFilters() {
      this.activeFilters = { Hang: [], Mok: [], Saemok: [] }
      this.pendingFilters = { Hang: [], Mok: [], Saemok: [] }
      this.searchQuery = ''
      this.onlyInvalid = false
    },

    // 필터 모달에 표시할 목록을 가져옵니다. (계층적/조건부 필터링 로직)
    getFilterOptionsByType(type) {
      if (!type) return []

      let list = [...this.ASSETS_LIST[type]];
      const pendingHangIds = this.pendingFilters.Hang;
      const pendingMokIds = this.pendingFilters.Mok;

      // 1. Mok 필터링 규칙 적용 (Hang 필터에 종속)
      if (type === 'Mok' && pendingHangIds.length > 0) {
        list = list.filter(mok => pendingHangIds.includes(mok.parent_hang));
      }

      // 2. Saemok 필터링 규칙 적용 (Mok 필터에 종속)
      else if (type === 'Saemok' && pendingMokIds.length > 0) {
        let allowedSaemokIds = new Set();
        let shouldRestrict = false;

        const selectedMoks = this.ASSETS_LIST.Mok.filter(mok => pendingMokIds.includes(mok.id));

        selectedMoks.forEach(mok => {
          if (mok.is_able_specific_saemok) {
            shouldRestrict = true;
            if (mok.expand && mok.expand.able_specific_saemok_list) {
              mok.expand.able_specific_saemok_list.forEach(saemok => {
                allowedSaemokIds.add(saemok.id);
              });
            }
          }
        });

        if (shouldRestrict) {
            list = list.filter(saemok => allowedSaemokIds.has(saemok.id));
        }
      }

      const desiredLength = PAD[type];
      return list.map(asset => ({
        ...asset,
        priority_string: this.zeroPad(asset.priority, desiredLength),
        is_none_field: type === 'Saemok' ? (asset.is_none_field || false) : false
      }));
    },

    // ---------- 고르기 ----------
    isLedgerSelected(id) {
      return this.SELECTED_TRANSACTION_LIST.includes(id);
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

    toggleSelectAllVisible() {
      if (!this.canEdit) return

      if (this.allVisibleSelected) {
        this.SELECTED_TRANSACTION_LIST = []
        this.selectAnchor = null
        return
      }
      this.selectAllVisible()
    },

    selectAllVisible() {
      if (!this.canEdit) return
      this.SELECTED_TRANSACTION_LIST = [
        ...new Set(this.filteredLedgerList.map(l => l.expand.transaction.id))
      ]
      this.showStatus(`보이는 ${this.SELECTED_TRANSACTION_LIST.length}건을 모두 골랐습니다`)
    },

    /**
     * 고른 줄들의 지출증빙을 한꺼번에 바꾼다.
     * 줄마다 창을 열어 토글하면 스무 줄에 스무 번 창을 여닫아야 한다.
     * @param {boolean} notNeed true면 '증빙 불요', false면 '미처리'로 되돌린다
     */
    async applyBulkReceipt(notNeed) {
      if (!this.canEdit || this.bulkBusy) return

      const targets = [...this.selectedLedgers]
      if (targets.length === 0) return

      // 불요로 돌리면 이미 올려 둔 영수증이 지워진다 — 지워질 것이 있을 때만 묻는다
      const withFiles = targets.filter(l => l.receipt?.length > 0)
      if (notNeed && withFiles.length > 0) {
        const ok = window.confirm(
          `${withFiles.length}건에 이미 영수증이 올라와 있습니다.\n`
          + '불요로 바꾸면 그 영수증은 지워집니다. 계속할까요?'
        )
        if (!ok) return
      }

      const before = targets.map(l => ({ not_need_receipt: l.not_need_receipt, receipt: l.receipt }))
      const patch = notNeed
        ? { not_need_receipt: true, receipt: [] }
        : { not_need_receipt: false }

      this.bulkBusy = true
      targets.forEach(l => Object.assign(l, patch))

      try {
        await Promise.all(targets.map(l => pb.collection('Ledger').update(l.id, patch)))
        this.showStatus(
          notNeed
            ? `${targets.length}건을 증빙 불요로 표시했습니다`
            : `${targets.length}건을 증빙 미처리로 되돌렸습니다`
        )
      } catch (error) {
        console.error('Failed to bulk update receipts:', error)
        targets.forEach((l, i) => Object.assign(l, before[i]))
        this.showError('지출증빙을 한꺼번에 바꾸지 못했습니다.')
      } finally {
        this.bulkBusy = false
      }
    },

    // ---------- 불러오기 ----------
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
        this.showError('장부를 불러오지 못했습니다.')
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
        this.showError('계정과목을 불러오지 못했습니다.')
      }
    },

    async removeSelectedLedger(){
      if (!this.canEdit) return;
      if (this.SELECTED_TRANSACTION_LIST.length === 0) return;

      const count = this.SELECTED_TRANSACTION_LIST.length
      if (!window.confirm(`선택한 ${count}건을 지웁니다. 되돌릴 수 없습니다. 계속할까요?`)) return

      // 같은 transaction.id를 가진 모든 ledger를 찾아서 삭제
      const ledgersToDelete = [];
      this.SELECTED_TRANSACTION_LIST.forEach(transactionId => {
        const matchingLedgers = this.LEDGER_LIST.filter(l => l.expand.transaction.id === transactionId);
        ledgersToDelete.push(...matchingLedgers);
      });

      try {
        await Promise.all(ledgersToDelete.map(ledger => pb.collection("Ledger").delete(ledger.id)));
        this.SELECTED_TRANSACTION_LIST = [];
        await this.getLedger();
        this.showStatus(`${count}건을 지웠습니다`)
        this.$emit("refresh");
      } catch (error) {
        console.error("Failed to delete selected ledgers:", error);
        this.showError('선택한 내역을 지우지 못했습니다.')
      }
    },
  },
}
</script>

<style scoped>
.ledger-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
}

/* ============================================
   요약 — 숫자는 한 줄에 나란히, 자릿수가 맞게
   ============================================ */

.ledger-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--spacing-3);
}

.summary-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--border-color-strong);
    border-radius: var(--border-radius-lg);
}

.summary-item .label {
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
}

.summary-item .value {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    line-height: var(--line-height-tight);
}

.summary-item .value small {
    margin-left: 2px;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
}

.summary-item.income {
    border-left-color: var(--income-color);
}

.summary-item.income .value {
    color: var(--income-color);
}

.summary-item.expense {
    border-left-color: var(--expense-color);
}

.summary-item.expense .value {
    color: var(--expense-color);
}

.summary-item.balance {
    border-left-color: var(--primary-600);
}

/* ============================================
   거르개 줄
   ============================================ */

.ledger-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: wrap;
}

.chip-count {
    padding: 0 var(--spacing-2);
    border-radius: var(--border-radius-full);
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
}

.chip.on .chip-count {
    background: var(--primary-600);
    color: #fff;
}

/* 남은 일이 있을 때만 눈에 띄게 한다 */
.chip.has-work:not(.on) {
    background: var(--warning-50);
    color: var(--warning-700);
}

.chip.has-work:not(.on) .chip-count {
    background: var(--warning-600);
    color: #fff;
}

[data-theme="dark"] .chip.has-work:not(.on) {
    background: rgb(245 158 11 / 0.16);
    color: var(--warning-200);
}

.chip-reset {
    color: var(--text-muted);
}

.search-bar {
    position: relative;
    width: 280px;
    max-width: 100%;
}

.search-input {
    width: 100%;
    min-height: 34px;
    padding: 0 var(--spacing-3) 0 32px;
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .search-input:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.search-bar .bi-search {
    position: absolute;
    left: var(--spacing-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: var(--text-xs);
    pointer-events: none;
}

.table-error {
    margin: 0;
}

/* ============================================
   표
   ============================================ */

.ledger-table-wrapper {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
    overflow: auto;
    /* 머리줄이 붙어 있을 자리를 남긴다 */
    max-height: calc(100vh - 320px);
    min-height: 180px;
}

table.ledger {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: var(--text-sm);
}

/* 줄을 내려도 어느 칸인지 알 수 있게 머리줄을 붙여 둔다 */
tr.ledger_pin th {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 42px;
    padding: 0 var(--spacing-3);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color-strong);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    text-align: left;
    white-space: nowrap;
}

tr.ledger_pin th.r {
    text-align: right;
}

table.ledger td {
    height: 44px;
    padding: var(--spacing-1) var(--spacing-3);
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

table.ledger tbody tr:last-child td {
    border-bottom: none;
}

table.ledger td.r {
    text-align: right;
}

.c-check {
    padding-left: var(--spacing-3) !important;
    padding-right: 0 !important;
}

.c-date {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    white-space: nowrap;
}

.money {
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.money.is-income {
    color: var(--income-color);
}

.money.is-expense {
    color: var(--expense-color);
}

tr.ledger_row:hover {
    background-color: var(--bg-secondary);
}

tr.ledger_row.selected {
    background-color: var(--bg-active);
}

/*
    아직 덜 적은 줄.
    빨간 바탕으로 칠하면 '잘못 적었다'로 읽히고 글자도 읽기 어려워진다 —
    왼쪽에 표시만 세워 두고 글자는 그대로 둔다.
*/
tr.ledger_row.invalid-row td:first-child {
    box-shadow: inset 3px 0 0 var(--warning-500);
}

tr.ledger_row.invalid-row {
    background-color: var(--warning-50);
}

tr.ledger_row.invalid-row:hover,
tr.ledger_row.invalid-row.selected {
    background-color: var(--warning-100);
}

[data-theme="dark"] tr.ledger_row.invalid-row {
    background-color: rgb(245 158 11 / 0.08);
}

[data-theme="dark"] tr.ledger_row.invalid-row:hover,
[data-theme="dark"] tr.ledger_row.invalid-row.selected {
    background-color: rgb(245 158 11 / 0.16);
}

input.select[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    vertical-align: middle;
}

input.select[type='checkbox']:disabled {
    cursor: default;
    opacity: 0.4;
}

/* 지금 손이 가 있는 줄. 어느 줄에서 키를 누르는지 보여야 한다 */
tr.ledger_row.is-cursor-row td {
    background-image: linear-gradient(var(--bg-active), var(--bg-active));
}

.controls-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
}

.keys-btn kbd {
    padding: 0 5px;
    border: 1px solid var(--border-color-strong);
    border-radius: 4px;
    background: var(--bg-secondary);
    font-family: inherit;
    font-size: 0.95em;
    color: var(--text-secondary);
}

/* ---------- 단축키 도움말 ---------- */
.keys-group + .keys-group {
    margin-top: var(--spacing-5);
}

.keys-group h3 {
    margin: 0 0 var(--spacing-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-bold);
    color: var(--text-secondary);
}

.keys-group dl {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.keys-row {
    display: grid;
    grid-template-columns: 148px minmax(0, 1fr);
    gap: var(--spacing-3);
    align-items: baseline;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--border-radius-sm);
}

.keys-row:nth-child(odd) {
    background: var(--bg-secondary);
}

.keys-row dt {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
}

.keys-row dd {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-primary);
}

.keys-row kbd {
    display: inline-block;
    min-width: 20px;
    padding: 1px 5px;
    border: 1px solid var(--border-color-strong);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    text-align: center;
}

.grid-hint {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-wrap: wrap;
}

.grid-hint kbd {
    display: inline-block;
    padding: 0 4px;
    border: 1px solid var(--border-color-strong);
    border-radius: 4px;
    background: var(--bg-primary);
    font-family: inherit;
    font-size: 0.95em;
}

/* ============================================
   거르개 창 안
   ============================================ */

.filter-options {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-size: var(--text-sm);
}

.checkbox-label:hover {
    background: var(--bg-hover);
}

.checkbox-label input {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.checkbox-label.is-none-field .checkbox-text {
    color: var(--text-muted);
}

.checkbox-text {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
}

.priority {
    flex-shrink: 0;
    font-size: 0.85em;
    color: var(--text-muted);
}

.filter-count {
    margin-right: auto;
    color: var(--text-muted);
    font-size: var(--text-sm);
}

.bulk-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: var(--text-sm);
    text-align: left;
}

.bulk-option:hover {
    background: var(--bg-active);
    color: var(--primary-700);
}

[data-theme="dark"] .bulk-option:hover {
    color: var(--primary-200);
}

/* ============================================
   고른 것에 대한 띠
   ============================================ */

.actionbar {
    position: fixed;
    left: calc(var(--sidebar-width) / 2 + 50%);
    bottom: var(--spacing-6);
    z-index: var(--z-sticky);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-full);
    box-shadow: var(--shadow-lg);
    animation: slideUp var(--duration-200) var(--ease-out);
}

.actionbar .n {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: var(--border-radius-full);
    background: var(--primary-600);
    color: #fff;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-bold);
}

.actionbar-label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: nowrap;
}

.actionbar-sep {
    width: 1px;
    height: 20px;
    background: var(--border-color);
}

/* ============================================
   반응형
   ============================================ */

@media (max-width: 1024px) {
    .ledger-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .actionbar {
        left: 50%;
    }
}

@media (max-width: 768px) {
    .ledger-controls {
        align-items: stretch;
    }

    .search-bar {
        width: 100%;
    }

    .ledger-table-wrapper {
        max-height: none;
    }

    table.ledger {
        min-width: 960px;
    }

    .summary-item {
        padding: var(--spacing-2) var(--spacing-3);
    }

    .summary-item .value {
        font-size: var(--text-lg);
    }

    .grid-hint {
        display: none;
    }

    /* 손가락으로 쓰는 화면에서는 단축키가 쓸모없다 */
    .keys-btn {
        display: none;
    }

    .keys-row {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--spacing-1);
    }

    .actionbar {
        left: var(--spacing-3);
        right: var(--spacing-3);
        bottom: var(--spacing-3);
        transform: none;
        justify-content: center;
        flex-wrap: wrap;
        border-radius: var(--border-radius-xl);
    }
}

@media (max-width: 480px) {
    .ledger-summary {
        grid-template-columns: 1fr;
    }

    .summary-item {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}
</style>
