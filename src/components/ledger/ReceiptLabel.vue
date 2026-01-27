<template>
  <span
    class="receipt-label"
    v-if="localLedger"
    @click="canEdit ? modalOpen = true : (RECEIPT_LIST.length > 0 ? modalOpen = true : null)"
    :class="statusLabelStyle"
    :style="!canEdit ? 'cursor: default;' : ''"
  >
    <i class="bi bi-receipt"></i>
    {{ statusLabel }}
  </span>

  <Teleport to="body">
    <div class="receipt-modal-overlay" v-if="modalOpen" @click.self="closeModal">
      <!-- 모달 컨텐츠: 세로 Flexbox 컨테이너로 변경 -->
    <div class="receipt-modal-content">

      <!-- 1. 모달 헤더 (고정) -->
      <header class="modal-header">
        <div class="meta">
          <span class="title">지출증빙 관리</span>
          <span class="description">장부 건별로 지출증빙을 관리합니다.</span>
        </div>
        <button class="close-btn" @click="closeModal">
          <i class="bi bi-x-lg"></i>
        </button>
      </header>
      
      <!-- 2. 모달 컨트롤 및 데이터 영역 (남은 공간 모두 차지) -->
      <main class="modal-data-area">
        
        <!-- 2-1. 컨트롤 영역 (고정) -->
        <section class="receipt-controls">
          <label class="not-need-switch" v-if="canEdit && notNeedReceipt !== null">
            <input type="checkbox" v-model="notNeedReceipt" @change="toggleNotNeedReceipt" />
            <span class="slider"></span>
            <span class="text">불요 처리</span>
          </label>
          
          <div v-if="!canEdit" class="read-only-message">
            <p><i class="bi bi-lock-fill"></i> 조회 전용 모드입니다. 수정/추가/삭제할 수 없습니다.</p>
          </div>
        </section>


        <!-- 2-2. 영수증 뷰어 영역 (가장 중요: 남은 공간 모두 차지 + 스크롤 가능) -->
        <section class="view-receipt-container" v-if="showReceipts">
          <!-- 영수증이 없는 경우: canEdit이 false면 업로드 버튼이 보이지 않습니다. -->
          <div v-if="isAddPage && canEdit" class="new-receipt">
            <label class="upload-btn">
              <i class="bi bi-upload"></i> 영수증 파일 추가<br>(.png, .jpg, .jpeg만 가능)
              <input type="file" accept=".png,.jpg,.jpeg" @change="uploadReceipt" hidden />
            </label>
          </div>
          <!-- 영수증이 있는 경우 (클릭 시 새 탭에서 열기) -->
          <div v-else-if="RECEIPT_LIST.length > 0" class="already-receipt" @click="openReceipt">
            <img class="receipt" :src="RECEIPT_LIST[CURRENT_PAGINATOR-1]" alt="등록된 영수증" />
            <span class="zoom-indicator">클릭하여 새 창에서 확대</span>
          </div>
          <!-- 영수증이 없고, canEdit도 false인 경우 -->
          <div v-else class="new-receipt no-receipt-placeholder">
              <i class="bi bi-cloud-slash" style="font-size: 32px;"></i> 
              등록된 영수증이 없습니다.
          </div>
        </section>
      </main>

      <!-- 3. 모달 푸터 (고정) -->
      <footer class="modal-footer" v-if="showReceipts && (RECEIPT_LIST.length > 0 || canEdit)">
        <div class="paginator" v-if="displayMaxPaginator > 0">
          <button class="nav-btn" :disabled="CURRENT_PAGINATOR===1" @click="CURRENT_PAGINATOR--">
            <i class="bi bi-arrow-left"></i> 이전
          </button>
          <div class="current">{{ CURRENT_PAGINATOR }} / {{ displayMaxPaginator }}</div>
          <button class="nav-btn" :disabled="CURRENT_PAGINATOR >= displayMaxPaginator" @click="CURRENT_PAGINATOR++">
            다음 <i class="bi bi-arrow-right"></i>
          </button>
        </div>
        <button class="delete-button" v-if="canEdit && CURRENT_PAGINATOR <= RECEIPT_LIST.length" @click="deleteReceipt">
          <i class="bi bi-trash3"></i> 영수증 삭제
        </button>
      </footer>
    </div>
    </div>
  </Teleport>
</template>


<script>
import PocketBase from 'pocketbase';
// NOTE: __POCKETBASE_API_BASE_URL__ 변수는 런타임 환경에서 제공됩니다.
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
  emits: ['update-complete'], 
  props: ['ledgerRecord', 'canEdit'],

  data() {
    return {
      modalOpen: false,
      RECEIPT_LIST: [],
      MAX_PAGINATOR: 1, // 실제 데이터 + 1 (추가 페이지) 기준
      CURRENT_PAGINATOR: 1,
      localLedger: null,
      notNeedReceipt: null
    }
  },

  computed: {
    // UI에 표시되는 최대 페이지 번호 (canEdit이 false면 Add page 제외)
    displayMaxPaginator() {
      // canEdit이 true면 추가 페이지를 포함하여 표시합니다.
      if (this.canEdit) {
        // 영수증이 0개일 때 (1/1)로 추가 페이지를 표시해야 하므로, 최소 1
        return Math.max(1, this.RECEIPT_LIST.length + 1); 
      } else {
        // canEdit이 false면 영수증 개수만 표시합니다.
        return this.RECEIPT_LIST.length; 
      }
    },
    statusLabelStyle() {
      if (!this.localLedger) return false
      if (this.localLedger.not_need_receipt == true) return "not-need-data"
      if (this.localLedger.receipt.length == 0) return "not-exist-data"
      if (this.localLedger.receipt.length > 0) return "exist-data"
    },
    statusLabel() {
      if (!this.localLedger) return "미처리"
      if (this.localLedger.not_need_receipt) return "불요"
      const count = this.localLedger.receipt.length
      return count > 0 ? `완료(${count})` : "미처리"
    },
    showReceipts() {
      // 불요 처리가 되지 않았을 때만 영수증 뷰어 섹션을 보여줍니다.
      return this.notNeedReceipt === false
    },
    isAddPage() {
      // 추가 페이지는 canEdit이 true이고, 현재 페이지가 MAX_PAGINATOR일 때만 참입니다.
      return this.canEdit && (this.CURRENT_PAGINATOR === this.MAX_PAGINATOR)
    }
  },

  mounted() {
    this.localLedger = { ...this.ledgerRecord }
    this.notNeedReceipt = this.localLedger.not_need_receipt || false
    this.refreshReceipts()
    window.addEventListener('keydown', this.handleEscape)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleEscape)
  },

  methods: {
    refreshReceipts() {
      this.RECEIPT_LIST = this.localLedger.receipt.map(r => pb.files.getURL(this.localLedger, r))
      // MAX_PAGINATOR는 항상 '추가 페이지'를 포함하는 논리적 최대값으로 유지합니다.
      this.MAX_PAGINATOR = this.RECEIPT_LIST.length + 1
      
      // 1. 현재 페이지가 논리적 MAX를 벗어나면 조정 (canEdit=true 시)
      if (this.CURRENT_PAGINATOR > this.MAX_PAGINATOR) {
        this.CURRENT_PAGINATOR = this.MAX_PAGINATOR
      }
      
      // 2. canEdit이 false일 때, '추가 페이지'에 있으면 마지막 영수증 페이지로 이동
      if (!this.canEdit && this.CURRENT_PAGINATOR > this.RECEIPT_LIST.length) {
          // 영수증이 있다면 마지막 영수증 페이지로, 없다면 1 (페이지네이션 자체를 안 보이게 할 것)
          this.CURRENT_PAGINATOR = this.RECEIPT_LIST.length > 0 ? this.RECEIPT_LIST.length : 1;
      }
    },

    handleEscape(e) {
      if (e.key === 'Escape') this.closeModal()
    },
    closeModal() {
      this.modalOpen = false
      this.CURRENT_PAGINATOR = 1
    },

    // --- 수정/추가/삭제 메서드: canEdit 체크 추가 ---
    async toggleNotNeedReceipt() {
      if (!this.canEdit) return; // 권한 체크

      try {
        const updated = await pb.collection("Ledger").update(this.localLedger.id, {
          not_need_receipt: this.notNeedReceipt,
          // 불요 처리 시 기존 영수증 목록 제거
          ...(this.notNeedReceipt ? { receipt: [] } : {})
        })
        this.localLedger = updated
        this.notNeedReceipt = updated.not_need_receipt
        this.refreshReceipts()
        this.CURRENT_PAGINATOR = 1
        this.$emit('update-complete')
      } catch (err) {
        console.error(err)
      }
    },

    async deleteReceipt() {
      if (!this.canEdit) return; // 권한 체크

      if (this.CURRENT_PAGINATOR > this.RECEIPT_LIST.length) return
      const newList = [...this.localLedger.receipt]
      newList.splice(this.CURRENT_PAGINATOR - 1, 1)

      try {
        const updated = await pb.collection("Ledger").update(this.localLedger.id, { receipt: newList })
        this.localLedger = updated
        this.refreshReceipts()
        if (this.RECEIPT_LIST.length === 0) {
          this.CURRENT_PAGINATOR = 1
        } else if (this.CURRENT_PAGINATOR > this.RECEIPT_LIST.length) {
          this.CURRENT_PAGINATOR = this.RECEIPT_LIST.length
        }
        this.$emit('update-complete')
      } catch (err) {
        console.error(err)
      }
    },

    openReceipt() {
      const url = this.RECEIPT_LIST[this.CURRENT_PAGINATOR - 1]
      if (url) window.open(url, "_blank", "noopener")
    },

    async uploadReceipt(e) {
      if (!this.canEdit) return; // 권한 체크

      const file = e.target.files[0]
      if (!file) return

      const validExtensions = ["image/png", "image/jpeg"]
      // NOTE: alert()는 실제 앱에서는 커스텀 모달로 대체되어야 합니다.
      if (!validExtensions.includes(file.type)) {
        console.error("PNG, JPG, JPEG 파일만 업로드 가능합니다.")
        return
      }

      const formData = new FormData()
      this.localLedger.receipt.forEach(r => formData.append("receipt", r))
      formData.append("receipt", file)

      try {
        const updated = await pb.collection("Ledger").update(this.localLedger.id, formData)
        this.localLedger = updated
        this.refreshReceipts()
        // 새 이미지를 업로드했으면 해당 이미지 페이지로 이동
        this.CURRENT_PAGINATOR = this.RECEIPT_LIST.length
        e.target.value = ""
        this.$emit('update-complete')
      } catch (err) {
        console.error(err)
        console.error("업로드 실패")
      }
    }
  }
}
</script>


<style scoped>

/* =====================
   Receipt Label Styles
   ===================== */
.receipt-label {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 1em;
  padding: 6px 12px;
  background-color: var(--light-color);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  color: var(--dark-color);
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}
.receipt-label i { font-size: 0.9em; line-height: 1; }
.receipt-label:not([style*="default"]):hover {
  background-color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  color: var(--none-color);
}
.receipt-label[style*="default"]:hover {
  background-color: var(--light-color);
  color: var(--dark-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.receipt-label.exist-data { color: var(--success-color); }
.receipt-label.exist-data:not([style*="default"]):hover { background-color: var(--success-color); color: var(--none-color); }
.receipt-label.not-exist-data { color: var(--danger-color); }
.receipt-label.not-exist-data:not([style*="default"]):hover { background-color: var(--danger-color); color: var(--none-color); }
.receipt-label.not-need-data { color: var(--primary-color); }
.receipt-label.not-need-data:not([style*="default"]):hover { background-color: var(--primary-color); color: var(--none-color); }


/* =====================
   Modal Layout 
   ===================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 500;
}

.receipt-modal {
  background: var(--none-color);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  
  display: flex;
  flex-direction: column;
  padding: 30px;
  overflow: hidden; 
}

/* 1. 헤더 영역 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; 
}

.modal-header .meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-header .meta .title { font-size: 26px; font-weight: 800; color: var(--strong-color); }
.modal-header .meta .description { font-size: 15px; color: var(--strong-color); }
.close-btn { background: none; border: none; cursor: pointer; font-size: 24px; color: var(--medium-color); transition: color 0.2s; }
.close-btn:hover { color: var(--danger-color); }


/* 2. 메인 데이터 영역 (남은 공간 모두 차지) */
.modal-data-area {
  flex: 1; 
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 2-1. 컨트롤 영역 (스위치, 알림 등) */
.receipt-controls {
    flex-shrink: 0;
    margin-bottom: 15px;
}
.read-only-message p {
    color: var(--medium-color); 
    font-weight: 600; 
    font-size: 14px; 
    padding: 10px 15px;
    background-color: var(--background-subtle);
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
/* 스위치 스타일 */
.not-need-switch { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.not-need-switch input { display: none; }
.not-need-switch .slider { width: 40px; height: 20px; border-radius: 20px; background: #ccc; position: relative; transition: 0.3s; }
.not-need-switch .slider::before { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--none-color); transition: 0.3s; }
.not-need-switch input:checked + .slider { background: var(--primary-color); }
.not-need-switch input:checked + .slider::before { transform: translateX(20px); }
.not-need-switch .text { font-size: 15px; font-weight: 600; color: var(--strong-color); }


/* 2-2. 영수증 뷰어 컨테이너 (남은 공간 모두 차지 및 스크롤) */
.view-receipt-container {
  flex: 1;
  min-height: 0; 
  overflow-y: auto; 
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--background-subtle);
  display: flex;
  justify-content: center;
  align-items: flex-start; /* <-- 수직 정렬을 상단(flex-start)으로 변경하여 긴 내용이 위에서부터 시작하도록 수정 */
  padding: 10px; 
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 이미지 컨테이너 - 수정됨: height: 100% 제거 */
.already-receipt {
    position: relative;
    display: flex;
    flex-direction: column; /* 세로 정렬을 위해 추가 */
    justify-content: center;
    align-items: center;
    width: 100%;
    /* height: 100%; <- 이 코드를 제거하여 내용물 크기만큼 늘어나게 함 */
    cursor: pointer;
    padding: 20px 0; /* 세로가 긴 이미지를 위해 상하 패딩 추가 */
}

/* 영수증 이미지 - 수정됨: max-height: 100% 제거 */
.view-receipt-container img.receipt {
  /* max-height: 100%; <- 이 코드를 제거하여 세로 길이 제한을 품 */
  max-width: 100%; 
  object-fit: contain; 
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.already-receipt:hover .zoom-indicator {
    opacity: 1;
    transform: translateY(-50%);
}

.zoom-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    background: rgba(0, 0, 0, 0.7);
    color: var(--none-color);
    padding: 8px 16px;
    border-radius: 50px;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s, transform 0.3s;
    pointer-events: none;
}

.new-receipt, .no-receipt-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%; 
  width: 100%;
  border-radius: 10px;
  color: var(--medium-color); 
  gap: 15px;
}

.upload-btn {
  display: flex;
  width: 95%;
  height: 95%;

  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  color: var(--strong-color);
  border: 2px dashed var(--medium-color);
  background-color: var(--none-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  line-height: 1.4;
}
.upload-btn:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background-color: rgba(0, 123, 255, 0.05);
}


/* 3. 푸터 영역 (고정) */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0; 
  padding-top: 20px; 
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
}

.paginator {
  display: flex;
  align-items: center;
  gap: 15px;
}
.nav-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: var(--background-subtle);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--strong-color);
  transition: all 0.2s;
}
.nav-btn:hover:not(:disabled) {
  background: var(--light-color);
  color: var(--primary-color);
  border-color: var(--primary-color);
}
.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--light-color);
}
.current {
  font-weight: 700;
  color: var(--strong-color);
}

.delete-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--danger-color);
  background: var(--none-color);
  color: var(--danger-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.delete-button:hover {
  background: var(--danger-color);
  color: var(--none-color);
  box-shadow: 0 2px 5px rgba(220, 53, 69, 0.3);
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .receipt-label,
[data-theme="dark"] .receipt-label {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .receipt-label:not([style*="default"]):hover,
[data-theme="dark"] .receipt-label:not([style*="default"]):hover {
    background-color: var(--primary-600);
    color: white;
}

:deep([data-theme="dark"]) .receipt-label.exist-data,
[data-theme="dark"] .receipt-label.exist-data {
    color: var(--success-500);
}

:deep([data-theme="dark"]) .receipt-label.exist-data:not([style*="default"]):hover,
[data-theme="dark"] .receipt-label.exist-data:not([style*="default"]):hover {
    background-color: var(--success-500);
    color: white;
}

:deep([data-theme="dark"]) .receipt-label.not-exist-data,
[data-theme="dark"] .receipt-label.not-exist-data {
    color: var(--danger-500);
}

:deep([data-theme="dark"]) .receipt-label.not-exist-data:not([style*="default"]):hover,
[data-theme="dark"] .receipt-label.not-exist-data:not([style*="default"]):hover {
    background-color: var(--danger-500);
    color: white;
}

:deep([data-theme="dark"]) .receipt-label.not-need-data,
[data-theme="dark"] .receipt-label.not-need-data {
    color: var(--primary-400);
}

:deep([data-theme="dark"]) .receipt-label.not-need-data:not([style*="default"]):hover,
[data-theme="dark"] .receipt-label.not-need-data:not([style*="default"]):hover {
    background-color: var(--primary-600);
    color: white;
}

:deep([data-theme="dark"]) .modal-overlay,
[data-theme="dark"] .modal-overlay {
    background: rgba(0, 0, 0, 0.7);
}

:deep([data-theme="dark"]) .receipt-modal,
[data-theme="dark"] .receipt-modal {
    background: var(--bg-secondary);
}

:deep([data-theme="dark"]) .modal-header,
[data-theme="dark"] .modal-header {
    border-bottom-color: var(--border-color);
}

:deep([data-theme="dark"]) .modal-header .meta .title,
[data-theme="dark"] .modal-header .meta .title {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-header .meta .description,
[data-theme="dark"] .modal-header .meta .description {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .close-btn,
[data-theme="dark"] .close-btn {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .close-btn:hover,
[data-theme="dark"] .close-btn:hover {
    color: var(--danger-500);
}

:deep([data-theme="dark"]) .read-only-message p,
[data-theme="dark"] .read-only-message p {
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
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
    background: var(--primary-500);
}

:deep([data-theme="dark"]) .not-need-switch .text,
[data-theme="dark"] .not-need-switch .text {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .view-receipt-container,
[data-theme="dark"] .view-receipt-container {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) .new-receipt,
[data-theme="dark"] .new-receipt,
:deep([data-theme="dark"]) .no-receipt-placeholder,
[data-theme="dark"] .no-receipt-placeholder {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .upload-btn,
[data-theme="dark"] .upload-btn {
    color: var(--text-primary);
    border-color: var(--border-color);
    background-color: var(--bg-secondary);
}

:deep([data-theme="dark"]) .upload-btn:hover,
[data-theme="dark"] .upload-btn:hover {
    color: var(--primary-400);
    border-color: var(--primary-500);
    background-color: var(--primary-900);
}

:deep([data-theme="dark"]) .modal-footer,
[data-theme="dark"] .modal-footer {
    border-top-color: var(--border-color);
}

:deep([data-theme="dark"]) .nav-btn,
[data-theme="dark"] .nav-btn {
    background: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .nav-btn:hover:not(:disabled),
[data-theme="dark"] .nav-btn:hover:not(:disabled) {
    background: var(--bg-secondary);
    color: var(--primary-400);
    border-color: var(--primary-500);
}

:deep([data-theme="dark"]) .nav-btn:disabled,
[data-theme="dark"] .nav-btn:disabled {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .current,
[data-theme="dark"] .current {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .delete-button,
[data-theme="dark"] .delete-button {
    border-color: var(--danger-500);
    background: var(--bg-secondary);
    color: var(--danger-500);
}

:deep([data-theme="dark"]) .delete-button:hover,
[data-theme="dark"] .delete-button:hover {
    background: var(--danger-500);
    color: white;
}

</style>

<!-- Teleport된 요소는 scoped 스타일이 적용되지 않으므로 전역 스타일 사용 -->
<style>
.receipt-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 500;
}

.receipt-modal-content {
  background: var(--bg-primary);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  padding: 30px;
  overflow: hidden;
}

.receipt-modal-content .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.receipt-modal-content .modal-header .meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.receipt-modal-content .modal-header .meta .title {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
}

.receipt-modal-content .modal-header .meta .description {
  font-size: 15px;
  color: var(--text-secondary);
}

.receipt-modal-content .close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.receipt-modal-content .close-btn:hover {
  color: var(--danger-500);
}

.receipt-modal-content .modal-data-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.receipt-modal-content .receipt-controls {
  flex-shrink: 0;
  margin-bottom: 15px;
}

.receipt-modal-content .read-only-message p {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 14px;
  padding: 10px 15px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.receipt-modal-content .not-need-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.receipt-modal-content .not-need-switch input {
  display: none;
}

.receipt-modal-content .not-need-switch .slider {
  width: 40px;
  height: 20px;
  border-radius: 20px;
  background: var(--gray-400);
  position: relative;
  transition: 0.3s;
}

.receipt-modal-content .not-need-switch .slider::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: 0.3s;
}

.receipt-modal-content .not-need-switch input:checked + .slider {
  background: var(--primary-500);
}

.receipt-modal-content .not-need-switch input:checked + .slider::before {
  transform: translateX(20px);
}

.receipt-modal-content .not-need-switch .text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.receipt-modal-content .view-receipt-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-secondary);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.receipt-modal-content .already-receipt {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  cursor: pointer;
  padding: 20px 0;
}

.receipt-modal-content .view-receipt-container img.receipt {
  max-width: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.receipt-modal-content .already-receipt:hover .zoom-indicator {
  opacity: 1;
  transform: translateY(-50%);
}

.receipt-modal-content .zoom-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}

.receipt-modal-content .new-receipt,
.receipt-modal-content .no-receipt-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  border-radius: 10px;
  color: var(--text-secondary);
  gap: 15px;
}

.receipt-modal-content .upload-btn {
  display: flex;
  width: 95%;
  height: 95%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  color: var(--text-primary);
  border: 2px dashed var(--border-color);
  background-color: var(--bg-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  line-height: 1.4;
}

.receipt-modal-content .upload-btn:hover {
  color: var(--primary-500);
  border-color: var(--primary-500);
  background-color: var(--primary-50);
}

.receipt-modal-content .modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
}

.receipt-modal-content .paginator {
  display: flex;
  align-items: center;
  gap: 15px;
}

.receipt-modal-content .nav-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.receipt-modal-content .nav-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--primary-500);
  border-color: var(--primary-500);
}

.receipt-modal-content .nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-tertiary);
}

.receipt-modal-content .current {
  font-weight: 700;
  color: var(--text-primary);
}

.receipt-modal-content .delete-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--danger-500);
  background: var(--bg-primary);
  color: var(--danger-500);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.receipt-modal-content .delete-button:hover {
  background: var(--danger-500);
  color: white;
  box-shadow: 0 2px 5px rgba(220, 53, 69, 0.3);
}

/* 다크모드 */
[data-theme="dark"] .receipt-modal-overlay {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .receipt-modal-content {
  background: var(--bg-secondary);
}

[data-theme="dark"] .receipt-modal-content .upload-btn:hover {
  background-color: var(--primary-900);
}
</style>
