<template>
  <div class="dropdown-container">
    <!--
      고르는 자리는 단추여야 한다.
      span에 click만 달면 키보드로는 닿지 않는다 — 장부는 손이 키보드에 있는 일이다.
    -->
    <button
      ref="anchorRef"
      type="button"
      class="value-btn"
      :class="{ 'is-none-field': Assets.is_none_field, 'is-empty': !assetsId, 'is-open': isOpen }"
      :disabled="disabled"
      :tabindex="tabindex"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="listbox"
      :aria-label="`${typeLabel}: ${currentLabel}`"
      @click="toggle"
      @keydown="onAnchorKeydown"
    >
      <template v-if="assetsId">
        <span class="priority num">{{ Assets.priority_string }}</span>
        <span class="text">{{ Assets.label }}</span>
      </template>
      <template v-else>
        <span class="require" v-if="isRequire">미입력</span>
        <span class="dash" v-else>-</span>
      </template>
    </button>

    <!--
      목록은 body에 띄운다.
      표 칸 안에 두면 칸 밖으로 잘리거나 아래 줄에 가려 보이지 않는다.
    -->
    <Teleport :to="panelHost" v-if="isOpen">
      <div
        ref="panelRef"
        class="dd-panel"
        :style="panelStyle"
        @mousedown.stop
      >
        <div class="dd-search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input
            ref="searchRef"
            v-model="searchQuery"
            type="text"
            class="dd-search-input"
            :placeholder="`${typeLabel} 검색`"
            :aria-label="`${typeLabel} 검색`"
            autocomplete="off"
            role="combobox"
            aria-expanded="true"
            :aria-controls="listId"
            :aria-activedescendant="activeOptionId"
            @keydown="onSearchKeydown"
          />
        </div>

        <ul ref="listRef" :id="listId" class="dd-list scroll-thin" role="listbox" :aria-label="typeLabel">
          <li
            v-if="!isRequire"
            :id="`${listId}-clear`"
            class="dd-option is-clear"
            :class="{ 'is-cursor': cursor === -1 }"
            role="option"
            :aria-selected="!assetsId"
            @mouseenter="cursor = -1"
            @mousedown.prevent="changeRecord({ id: null })"
          >
            비우기
          </li>

          <li
            v-for="(option, i) in searchOptions"
            :key="option.id"
            :id="`${listId}-${i}`"
            class="dd-option"
            :class="{ 'is-cursor': cursor === i, 'is-current': option.id === assetsId }"
            role="option"
            :aria-selected="option.id === assetsId"
            @mouseenter="cursor = i"
            @mousedown.prevent="changeRecord(option)"
          >
            <span class="priority num">{{ option.priority_string }}</span>
            <span class="text">{{ option.label }}</span>
            <i v-if="option.id === assetsId" class="bi bi-check2 dd-check" aria-hidden="true"></i>
          </li>

          <li v-if="searchOptions.length === 0" class="dd-empty">
            {{ emptyMessage }}
          </li>
        </ul>

        <p class="dd-foot" aria-hidden="true">
          <kbd>↑</kbd><kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 선택 · <kbd>Esc</kbd> 닫기
        </p>
      </div>
    </Teleport>
  </div>
</template>

<script>
const LABELS = { Hang: '항', Mok: '목', Saemok: '세목' }
const PAD = { Hang: 2, Mok: 3, Saemok: 4 }

let seq = 0

export default {
  props: {
    type: { type: String, required: true },
    assetsId: { type: String, default: null },
    assetsList: { type: Array, required: true },
    ledgerRecord: { required: true },
    isOpen: { type: Boolean, default: false },
    isRequire: { type: Boolean, default: false },
    currentMokId: { type: String, default: null },
    disabled: { type: Boolean, default: false },
    /** 표가 탭 스톱 하나만 갖도록 바깥에서 정해 준다 (-1이면 Tab이 지나친다) */
    tabindex: { type: Number, default: 0 },
    /** 글자를 쳐서 열었을 때의 첫 검색어 */
    initialQuery: { type: String, default: '' },
  },

  emits: ['open', 'close', 'updated'],

  data() {
    seq += 1
    return {
      uid: seq,
      searchQuery: '',
      cursor: 0,
      panelStyle: {},
    }
  },

  computed: {
    listId() { return `dd-list-${this.uid}` },
    /** 본문 안쪽에 띄운다. 없으면(시험 등) body로 물러난다 */
    panelHost() {
      return document.getElementById('main-content') ? '#main-content' : 'body'
    },
    typeLabel() { return LABELS[this.type] ?? this.type },

    currentLabel() {
      if (!this.assetsId) return this.isRequire ? '미입력' : '없음'
      return this.Assets.label
    },

    activeOptionId() {
      if (this.cursor === -1) return `${this.listId}-clear`
      return this.searchOptions.length ? `${this.listId}-${this.cursor}` : undefined
    },

    /** 고를 것이 없을 때 왜 없는지 알려 준다 — 빈 목록만 보여 주면 고장인 줄 안다 */
    emptyMessage() {
      if (this.searchQuery.trim()) return '검색 결과가 없습니다'
      if (this.type === 'Mok' && !this.ledgerRecord?.hang) return '항을 먼저 고르세요'
      if (this.type === 'Mok') return '고를 목이 없습니다 (잠근 목은 나오지 않습니다)'
      if (this.type === 'Saemok' && !this.ledgerRecord?.mok) return '목을 먼저 고르세요'
      return '고를 항목이 없습니다'
    },

    Assets() {
      if (!this.assetsId) return { label: '-' }

      const original = this.assetsList.find(assets => assets.id === this.assetsId)
      if (!original) return { label: '-' }

      // 원본을 건드리지 않고 표시용 값만 붙인다
      return { ...original, priority_string: this.zeroPad(original.priority, PAD[this.type]) }
    },

    sortedAndFilteredList() {
      let list = [...this.assetsList]

      list.sort((a, b) => a.priority - b.priority)

      if (this.type == "Mok") {
        list = list.filter(asset => {
          if (!this.ledgerRecord.hang) return false
          if (asset.expand.parent_hang.id !== this.ledgerRecord.hang) return false
          // 잠근 목은 새로 고를 수 없다. 이미 그 목으로 적힌 줄은 그대로 남는다
          if (asset.lock) return false
          return true
        });
      }

      // 세목은 목을 고른 뒤에만 고를 수 있다 (목마다 쓸 세목을 제한하던 기능은 걷어냈다)
      if (this.type == "Saemok" && !this.ledgerRecord.mok) {
        list = []
      }

      return list.map(asset => ({
        ...asset,
        priority_string: this.zeroPad(asset.priority, PAD[this.type]),
      }))
    },

    /*
      지금 고른 것도 목록에 남겨 둔다.
      빼 버리면 "내가 무엇을 골랐더라" 하고 창을 닫았다 다시 열게 된다.
    */
    searchOptions() {
      const query = this.searchQuery.toLowerCase().trim()
      if (!query) return this.sortedAndFilteredList
      return this.sortedAndFilteredList.filter(option =>
        option.label.toLowerCase().includes(query) ||
        option.priority_string.includes(query)
      )
    }
  },

  watch: {
    isOpen(open) {
      if (open) this.onOpened()
      else this.teardown()
    },

    searchQuery() {
      this.cursor = this.searchOptions.length ? 0 : -1
    },

    currentMokId(newVal, oldVal) {
      if (newVal !== oldVal) this.searchQuery = ''
    }
  },

  mounted() {
    if (this.isOpen) this.onOpened()
  },

  beforeUnmount() {
    this.teardown()
  },

  methods: {
    zeroPad(number, desiredLength){
      return String(number).padStart(desiredLength, '0');
    },

    toggle() {
      if (this.disabled) return
      if (this.isOpen) this.$emit('close', { move: null })
      else this.$emit('open')
    },

    /**
     * 닫힌 채로 Enter나 F2를 누르면 열린다 — 표 안에서 손을 옮기지 않아도 되게.
     * Space는 일부러 뺐다. 표 어디서나 Space는 '이 줄 고르기'여야 한다.
     * (방향키도 뺀다 — 표가 칸 옮기기에 쓴다)
     */
    onAnchorKeydown(e) {
      if (this.isOpen || this.disabled) return
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault()
        this.$emit('open')
      }
    },

    async onOpened() {
      // 글자를 쳐서 열었으면 그 글자부터 찾는다 — 엑셀에서 칸에 바로 치는 것과 같게
      this.searchQuery = this.initialQuery || ''

      if (this.searchQuery) {
        this.cursor = this.searchOptions.length ? 0 : -1
      } else {
        this.cursor = this.searchOptions.findIndex(o => o.id === this.assetsId)
        if (this.cursor < 0) this.cursor = this.searchOptions.length ? 0 : -1
      }

      await this.$nextTick()
      this.position()
      this.$refs.searchRef?.focus()
      this.scrollCursorIntoView()

      // 표가 스크롤되면 목록도 따라가야 한다. 스크롤은 버블링되지 않으므로 capture로 잡는다
      window.addEventListener('scroll', this.position, true)
      window.addEventListener('resize', this.position)
    },

    teardown() {
      window.removeEventListener('scroll', this.position, true)
      window.removeEventListener('resize', this.position)
    },

    /** 자리가 모자라면 위로 펼친다 — 마지막 줄에서 목록이 화면 밖으로 나가지 않게 */
    position() {
      const anchor = this.$refs.anchorRef
      if (!anchor) return

      const r = anchor.getBoundingClientRect()
      const maxHeight = 300
      const below = window.innerHeight - r.bottom
      const flip = below < maxHeight && r.top > below

      this.panelStyle = {
        left: `${Math.max(8, Math.min(r.left, window.innerWidth - 260))}px`,
        minWidth: `${Math.max(r.width, 240)}px`,
        maxHeight: `${maxHeight}px`,
        ...(flip
          ? { bottom: `${window.innerHeight - r.top + 4}px` }
          : { top: `${r.bottom + 4}px` }),
      }
    },

    onSearchKeydown(e) {
      // 한글을 조합하는 중에는 방향키가 글자 고르기에 쓰인다 — 가로채면 안 된다
      if (e.isComposing || e.keyCode === 229) return

      const last = this.searchOptions.length - 1
      const min = this.isRequire ? 0 : -1

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (this.cursor < last) this.cursor += 1
          this.$nextTick(this.scrollCursorIntoView)
          break

        case 'ArrowUp':
          e.preventDefault()
          if (this.cursor > min) this.cursor -= 1
          this.$nextTick(this.scrollCursorIntoView)
          break

        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (this.cursor === -1) this.changeRecord({ id: null })
          else if (this.searchOptions[this.cursor]) this.changeRecord(this.searchOptions[this.cursor])
          break

        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          this.$emit('close', { move: null })
          break

        case 'Tab':
          // Tab은 고르지 않고 옆 칸으로 넘어간다. 잘못 고른 채로 넘어가는 편이 더 나쁘다
          e.preventDefault()
          e.stopPropagation()
          this.$emit('close', { move: e.shiftKey ? 'prev' : 'next' })
          break
      }
    },

    scrollCursorIntoView() {
      const list = this.$refs.listRef
      const el = list?.querySelector('.is-cursor')
      el?.scrollIntoView({ block: 'nearest' })
    },

    changeRecord(newAssetsValue) {
      this.$emit('updated', newAssetsValue.id ?? null)
      // 고르고 나면 다음 칸으로. 항 → 목 → 세목은 잇달아 적는 자리라 저절로 넘어가야 한다
      this.$emit('close', { move: 'next' })
    }
  },
}
</script>

<style scoped>
.dropdown-container {
  position: relative;
  width: 100%;
}

/* ---------- 지금 값 ---------- */
.value-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  width: 100%;
  min-height: 30px;
  padding: var(--spacing-1) var(--spacing-2);
  border: 1px solid transparent;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: inherit;
  text-align: left;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.value-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-color);
}

.value-btn.is-open {
  background: var(--bg-active);
  border-color: var(--primary-300);
}

.value-btn:disabled {
  cursor: default;
}

.value-btn .text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-btn .priority {
  flex-shrink: 0;
  font-size: 0.85em;
  color: var(--text-muted);
}

.value-btn .dash {
  color: var(--text-muted);
}

.value-btn.is-none-field .text {
  color: var(--text-secondary);
}

/* 아직 안 적은 칸. 틀린 것이 아니라 '남은 일'이므로 빨강 덩어리로 칠하지 않는다 */
.require {
  padding: 1px var(--spacing-2);
  border-radius: var(--border-radius-full);
  background: var(--warning-50);
  color: var(--warning-700);
  font-size: 0.85em;
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

[data-theme="dark"] .require {
  background: rgb(245 158 11 / 0.16);
  color: var(--warning-200);
}
</style>

<!-- Teleport된 목록은 scoped가 닿지 않으므로 전역으로 둔다 -->
<style>
.dd-panel {
  position: fixed;
  z-index: var(--z-popover);
  display: flex;
  flex-direction: column;
  max-width: min(360px, calc(100vw - 16px));
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: slideDown var(--duration-150) var(--ease-out);
}

.dd-search {
  position: relative;
  flex-shrink: 0;
  padding: var(--spacing-2);
  border-bottom: 1px solid var(--border-color);
}

.dd-search .bi-search {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: var(--text-xs);
  pointer-events: none;
}

.dd-search-input {
  width: 100%;
  min-height: 32px;
  padding: 0 var(--spacing-2) 0 28px;
  border: 1px solid var(--border-color-strong);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.dd-search-input:focus {
  outline: none;
  border-color: var(--primary-600);
  box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .dd-search-input:focus {
  box-shadow: 0 0 0 3px var(--primary-950);
}

.dd-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: var(--spacing-1);
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.dd-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-2);
  border-radius: var(--border-radius-sm);
  font-size: var(--text-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.dd-option .priority {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 0.85em;
}

.dd-option .text {
  flex: 1;
  min-width: 0;
}

.dd-option .dd-check {
  color: var(--primary-600);
}

.dd-option.is-clear {
  color: var(--text-muted);
}

/* 지금 손이 가 있는 줄. 고른 줄(is-current)과 다른 뜻이라 다르게 보여 준다 */
.dd-option.is-cursor {
  background: var(--bg-active);
  color: var(--primary-700);
  font-weight: var(--font-weight-semibold);
}

.dd-option.is-current {
  font-weight: var(--font-weight-semibold);
}

[data-theme="dark"] .dd-option.is-cursor {
  color: var(--primary-200);
}

[data-theme="dark"] .dd-option .dd-check {
  color: var(--primary-400);
}

.dd-empty {
  padding: var(--spacing-5) var(--spacing-3);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.dd-foot {
  flex-shrink: 0;
  margin: 0;
  padding: var(--spacing-2);
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-align: center;
}

.dd-foot kbd {
  display: inline-block;
  min-width: 18px;
  margin: 0 1px;
  padding: 0 4px;
  border: 1px solid var(--border-color-strong);
  border-radius: 4px;
  background: var(--bg-primary);
  font-family: inherit;
  font-size: 0.95em;
}

@media (max-width: 640px) {
  .dd-foot {
    display: none;
  }
}
</style>
