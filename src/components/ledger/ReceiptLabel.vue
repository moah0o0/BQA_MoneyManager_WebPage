<template>
  <!--
    증빙 칸도 단추여야 한다 — 표 안에서 Tab으로 닿고 Enter로 열려야 한다.
    글자만으로는 '완료(2)'가 눌리는 것인지 알 수 없어 아이콘도 함께 둔다.
  -->
  <button
    v-if="localLedger"
    type="button"
    class="receipt-label"
    :class="statusLabelStyle"
    :disabled="!canEdit && RECEIPT_LIST.length === 0"
    :tabindex="tabindex"
    aria-haspopup="dialog"
    :aria-label="`지출증빙 ${statusLabel}. 눌러서 관리`"
    @click="modalOpen = true"
  >
    <i class="bi bi-receipt" aria-hidden="true"></i>
    {{ statusLabel }}
  </button>

  <AppModal
    v-if="modalOpen"
    title="지출증빙 관리"
    icon="bi-receipt"
    description="장부 한 건에 붙는 증빙을 관리합니다."
    size="md"
    @close="closeModal"
  >
    <!-- 여닫이 -->
    <section class="receipt-controls">
      <label class="not-need-switch" v-if="canEdit && notNeedReceipt !== null">
        <input type="checkbox" v-model="notNeedReceipt" @change="toggleNotNeedReceipt" />
        <span class="slider" aria-hidden="true"></span>
        <span class="text">
          <b>증빙 불요</b>
          <small>영수증이 필요 없는 거래로 표시합니다. 켜면 올려 둔 영수증은 지워집니다.</small>
        </span>
      </label>

      <p v-if="!canEdit" class="notice notice-info read-only-message">
        <i class="bi bi-lock-fill" aria-hidden="true"></i>
        조회 전용이라 고칠 수 없습니다.
      </p>

      <p v-if="uploadError" class="notice notice-danger upload-error" role="alert">
        <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
        <span>{{ uploadError }}</span>
      </p>
    </section>

    <!-- 영수증 -->
    <section class="view-receipt-container" v-if="showReceipts">
      <div v-if="isAddPage && canEdit" class="new-receipt">
        <!-- 옮기는 중에는 같은 자리에 어디까지 왔는지 띄운다 -->
        <p v-if="busy" class="uploading" role="status" aria-live="polite">
          <i class="bi bi-arrow-repeat animate-spin" aria-hidden="true"></i>
          <b>{{ busyText }}</b>
          <small>창을 닫지 말고 잠시 기다려 주세요.</small>
        </p>

        <label v-else class="upload-btn">
          <i class="bi bi-upload" aria-hidden="true"></i>
          <b>영수증 올리기</b>
          <small>png · jpg · jpeg · pdf · 여러 장 한꺼번에</small>
          <small class="hint-pdf">PDF는 쪽마다 그림으로 바꿔 모두 붙입니다.</small>
          <input type="file" accept=".png,.jpg,.jpeg,.pdf,image/*,application/pdf" multiple @change="uploadReceipt" hidden />
        </label>
      </div>

      <button v-else-if="RECEIPT_LIST.length > 0" type="button" class="already-receipt" @click="openReceipt">
        <img class="receipt" :src="RECEIPT_LIST[CURRENT_PAGINATOR-1]" :alt="`등록된 영수증 ${CURRENT_PAGINATOR}번째`" />
        <span class="zoom-indicator">
          <i class="bi bi-arrows-angle-expand" aria-hidden="true"></i> 새 창에서 크게 보기
        </span>
      </button>

      <p v-else class="empty no-receipt-placeholder">
        <i class="bi bi-cloud-slash" aria-hidden="true"></i>
        올려 둔 영수증이 없습니다.
      </p>
    </section>

    <template #footer>
      <div class="paginator" v-if="showReceipts && displayMaxPaginator > 0">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="CURRENT_PAGINATOR===1" @click="CURRENT_PAGINATOR--">
          <i class="bi bi-arrow-left" aria-hidden="true"></i> 이전
        </button>
        <span class="current num" aria-live="polite">{{ CURRENT_PAGINATOR }} / {{ displayMaxPaginator }}</span>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="CURRENT_PAGINATOR >= displayMaxPaginator" @click="CURRENT_PAGINATOR++">
          다음 <i class="bi bi-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
      <button type="button" class="btn btn-danger btn-sm" v-if="showReceipts && canEdit && CURRENT_PAGINATOR <= RECEIPT_LIST.length" @click="deleteReceipt">
        <i class="bi bi-trash3" aria-hidden="true"></i> 이 영수증 지우기
      </button>
      <button type="button" class="btn btn-secondary btn-sm" @click="closeModal">닫기</button>
    </template>
  </AppModal>
</template>

<script>
import PocketBase from 'pocketbase';
import AppModal from '../layout/AppModal.vue';
import { isPdf, pdfPageCount, pdfToImageFiles } from '../../utils/pdfToImages.js';
// NOTE: __POCKETBASE_API_BASE_URL__ 변수는 런타임 환경에서 제공됩니다.
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
  components: { AppModal },

  emits: ['update-complete'], 
  props: {
    ledgerRecord: { required: true },
    canEdit: { type: Boolean, default: false },
    /** 표가 탭 스톱 하나만 갖도록 바깥에서 정해 준다 */
    tabindex: { type: Number, default: 0 },
  },

  data() {
    return {
      modalOpen: false,
      RECEIPT_LIST: [],
      MAX_PAGINATOR: 1, // 실제 데이터 + 1 (추가 페이지) 기준
      CURRENT_PAGINATOR: 1,
      localLedger: null,
      notNeedReceipt: null,

      /** 옮기거나 올리는 중 — 그 사이에 또 고르지 못하게 막는다 */
      busy: false,
      busyText: '',
      uploadError: '',
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

  watch: {
    /*
      바깥에서 이 줄이 바뀌면(한꺼번에 증빙 처리 등) 따라 바뀌어야 한다.
      mounted에서 한 번 복사해 두기만 하면, 표는 바뀌었는데 이 칸만 옛 값을 보여 준다.
    */
    ledgerRecord: {
      deep: true,
      handler(next) {
        if (!next) return
        this.localLedger = { ...next }
        this.notNeedReceipt = next.not_need_receipt || false
        this.refreshReceipts()
      },
    },
  },

  mounted() {
    this.localLedger = { ...this.ledgerRecord }
    this.notNeedReceipt = this.localLedger.not_need_receipt || false
    this.refreshReceipts()
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

    /** 쪽수가 많으면 시간이 걸린다 — 시작하기 전에 먼저 알린다 */
    async confirmBigPdf(file) {
      const pages = await pdfPageCount(file)
      if (pages <= 15) return pages

      const ok = window.confirm(
        `'${file.name}'은 ${pages}쪽입니다.\n`
        + `${pages}장의 그림으로 바꿔 모두 붙입니다. 시간이 조금 걸립니다.\n\n계속할까요?`
      )
      return ok ? pages : null
    },

    /**
     * 고른 파일을 붙인다.
     * PDF는 쪽마다 그림으로 바꿔 한 장씩 붙인다 — 증빙은 그림으로만 보관하기 때문이다.
     * 예전에는 한 번에 한 장만, 그것도 그림만 받아서
     * 여러 쪽짜리 전표는 사람이 손으로 캡처해 되풀이해 올려야 했다.
     */
    async uploadReceipt(e) {
      if (!this.canEdit || this.busy) return

      const picked = [...(e.target.files ?? [])]
      const input = e.target
      if (picked.length === 0) return

      this.uploadError = ''
      this.busy = true
      this.busyText = '파일을 살펴보는 중…'

      try {
        const toUpload = []

        for (const file of picked) {
          if (isPdf(file)) {
            const pages = await this.confirmBigPdf(file)
            if (pages === null) continue   // 사람이 그만두었다

            this.busyText = `${file.name} — 쪽을 그림으로 바꾸는 중…`
            const images = await pdfToImageFiles(file, (done, total) => {
              this.busyText = `${file.name} — ${done}/${total}쪽 바꾸는 중…`
            })
            toUpload.push(...images)
            continue
          }

          if (!['image/png', 'image/jpeg'].includes(file.type)) {
            this.uploadError = `'${file.name}'은 붙일 수 없습니다. png · jpg · pdf만 됩니다.`
            continue
          }

          toUpload.push(file)
        }

        if (toUpload.length === 0) {
          if (!this.uploadError) this.uploadError = '붙일 것이 없습니다.'
          return
        }

        this.busyText = `${toUpload.length}장 올리는 중…`

        const formData = new FormData()
        // 이미 붙어 있던 것은 이름만 다시 보내면 그대로 남는다
        this.localLedger.receipt.forEach(r => formData.append('receipt', r))
        toUpload.forEach(f => formData.append('receipt', f))

        const updated = await pb.collection('Ledger').update(this.localLedger.id, formData)
        this.localLedger = updated
        this.refreshReceipts()

        // 방금 붙인 것 가운데 첫 장을 보여 준다 — 제대로 들어갔는지 눈으로 확인하는 자리
        this.CURRENT_PAGINATOR = Math.max(1, this.RECEIPT_LIST.length - toUpload.length + 1)
        this.$emit('update-complete')
      } catch (err) {
        console.error('영수증 올리기 실패:', err)
        this.uploadError = err?.message?.includes('쪽')
          ? 'PDF를 그림으로 바꾸지 못했습니다. 파일이 깨졌는지 확인해 주세요.'
          : '올리지 못했습니다. 파일 크기나 인터넷 연결을 확인해 주세요.'
      } finally {
        this.busy = false
        this.busyText = ''
        input.value = ''
      }
    }
  }
}
</script>


<style scoped>
/* ---------- 표 안의 상태 단추 ---------- */
.receipt-label {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  min-height: 28px;
  padding: 0 var(--spacing-2);
  border: 1px solid transparent;
  border-radius: var(--border-radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.receipt-label:disabled {
  cursor: default;
}

/* 붙었다 */
.receipt-label.exist-data {
  background: var(--success-50);
  color: var(--success-600);
}

/* 안 붙여도 되는 건 */
.receipt-label.not-need-data {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* 아직 안 붙였다 — 틀린 것이 아니라 남은 일이다 */
.receipt-label.not-exist-data {
  background: var(--warning-50);
  color: var(--warning-700);
}

.receipt-label:hover:not(:disabled) {
  border-color: currentColor;
}

[data-theme="dark"] .receipt-label.exist-data {
  background: rgb(34 197 94 / 0.16);
  color: var(--success-400);
}

[data-theme="dark"] .receipt-label.not-exist-data {
  background: rgb(245 158 11 / 0.16);
  color: var(--warning-200);
}

/* ---------- 창 안 ---------- */
.receipt-controls {
  margin-bottom: var(--spacing-4);
}

.not-need-switch {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
}

.not-need-switch:hover {
  background: var(--bg-secondary);
}

.not-need-switch input {
  width: 16px;
  height: 16px;
  margin-top: 3px;
  flex-shrink: 0;
}

.not-need-switch .slider {
  display: none;
}

.not-need-switch .text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-sm);
}

.not-need-switch .text small {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  line-height: var(--line-height-normal);
}

.read-only-message {
  margin: 0;
}

/* ---------- 영수증 ---------- */
.view-receipt-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: var(--spacing-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
}

.new-receipt {
  width: 100%;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  width: 100%;
  min-height: 240px;
  padding: var(--spacing-6);
  border: 2px dashed var(--border-color-strong);
  border-radius: var(--border-radius-lg);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}

.upload-btn:hover,
.upload-btn:focus-within {
  border-color: var(--primary-600);
  color: var(--primary-700);
}

.upload-btn i {
  font-size: 1.5rem;
}

.upload-btn small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.upload-btn .hint-pdf {
  margin-top: var(--spacing-1);
  color: var(--primary-700);
}

[data-theme="dark"] .upload-btn .hint-pdf {
  color: var(--primary-300);
}

/* 옮기는 중 — 올리는 자리와 같은 크기로 두어 화면이 튀지 않게 한다 */
.uploading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  width: 100%;
  min-height: 240px;
  margin: 0;
  padding: var(--spacing-6);
  border: 2px dashed var(--primary-300);
  border-radius: var(--border-radius-lg);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-align: center;
}

.uploading i {
  font-size: 1.5rem;
  color: var(--primary-600);
}

.uploading b {
  color: var(--text-primary);
  word-break: break-all;
}

.uploading small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

[data-theme="dark"] .uploading {
  border-color: var(--primary-800);
}

[data-theme="dark"] .uploading i {
  color: var(--primary-400);
}

.upload-error {
  margin: var(--spacing-3) 0 0;
}

.already-receipt {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-md);
  background: transparent;
  overflow: hidden;
}

.receipt {
  display: block;
  width: 100%;
  max-height: 46vh;
  object-fit: contain;
  border-radius: var(--border-radius-md);
  background: #fff;
}

.zoom-indicator {
  position: absolute;
  right: var(--spacing-2);
  bottom: var(--spacing-2);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  background: rgb(15 23 42 / 0.75);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
}

.no-receipt-placeholder {
  padding: var(--spacing-8);
}

.no-receipt-placeholder i {
  display: block;
  margin-bottom: var(--spacing-2);
  font-size: 2rem;
  color: var(--border-color-strong);
}

/* ---------- 쪽 넘기기 ---------- */
.paginator {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-right: auto;
}

.paginator .current {
  min-width: 52px;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-align: center;
}
</style>
