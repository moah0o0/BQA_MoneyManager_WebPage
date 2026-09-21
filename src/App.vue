<template>
  <!-- 키보드로 들어온 사람이 길잡이를 매번 지나치지 않도록 -->
  <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>

  <BarHeader
    :login-status="loginStatus"
    :login-info="loginInfo"
    :organization-name="ORGANIZATION_NAME"
    :theme="theme"
    :is-mobile-menu-open="isMobileMenuOpen"
    @update="updateLoginData"
    @toggle-theme="toggleTheme"
    @toggle-mobile-menu="toggleMobileMenu"
  />
  <BarMenu
    id="main-nav"
    :current-menu="currentMenu"
    :is-mobile-open="isMobileMenuOpen"
    @change-menu="menuChange"
    @close-mobile-menu="closeMobileMenu"
  />

  <!-- 모바일 메뉴 오버레이 -->
  <div
    v-if="isMobileMenuOpen"
    class="mobile-menu-overlay"
    aria-hidden="true"
    @click="closeMobileMenu"
  ></div>

  <div class="area-main-content">
    <main id="main-content" class="main-content" tabindex="-1">
      <!-- 로그인 전에는 빈 화면 대신 다음에 할 일을 알려 준다 -->
      <div v-if="!loginStatus" class="signed-out">
        <i class="bi bi-person-fill-lock" aria-hidden="true"></i>
        <h1>로그인이 필요합니다</h1>
        <p>{{ ORGANIZATION_NAME }}의 장부를 보려면 오른쪽 위 <strong>로그인</strong>을 눌러 주세요.</p>
      </div>

      <template v-else>
        <TabLedger
          v-if="currentMenu == 1"
          :login-status="loginStatus"
          :init-date="ORGANIZATION_INIT_DATE"
          :can-edit="canEdit"
        />

        <TabAssets
          v-if="currentMenu == 2"
          :login-status="loginStatus"
          :can-edit="canEdit"
        />

        <TabReport
          v-if="currentMenu == 3"
          :login-status="loginStatus"
          :init-date="ORGANIZATION_INIT_DATE"
          :organization-name="ORGANIZATION_NAME"
        />

        <TabTransaction
          v-if="currentMenu == 4"
          :login-status="loginStatus"
          :init-date="ORGANIZATION_INIT_DATE"
        />
      </template>
    </main>
  </div>
</template>

<script>
import './style.css'
import PocketBase from 'pocketbase'

import BarHeader from './components/layout/BarHeader.vue'
import BarMenu from './components/layout/BarMenu.vue'
import TabLedger from './components/ledger/TabLedger.vue'
import TabAssets from './components/assets/TabAssets.vue'
import TabReport from './components/report/TabReport.vue'
import TabTransaction from './components/transaction/TabTransaction.vue'

const pb = new PocketBase(__POCKETBASE_API_BASE_URL__)

/** 화면 이름 — 탭을 바꾸면 문서 제목도 바꾼다. 화면을 못 보는 사람은 제목으로 위치를 안다 */
const MENU_TITLES = {
  1: '장부',
  2: '계정과목',
  3: '공금보고서',
  4: '거래내역',
}

export default {
  components: {
    TabLedger,
    TabAssets,
    TabReport,
    TabTransaction,
    BarHeader,
    BarMenu
  },

  data() {
    return {
      ORGANIZATION_NAME: __ORGANIZATION_NAME__,
      ORGANIZATION_INIT_DATE: __ORGANIZATION_INIT_DATE__,

      loginInfo: null,
      loginStatus: false,

      currentMenu: 1,
      theme: 'light',
      isMobileMenuOpen: false
    }
  },

  computed: {
    canEdit() {
      const permission = pb.authStore.record?.permission
      return permission === 'admin' || permission === 'editor'
    }
  },

  watch: {
    currentMenu: {
      immediate: true,
      handler(menu) {
        document.title = `${MENU_TITLES[menu] ?? '모두의결산'} · 모두의결산`
      }
    }
  },

  async created() {
    // 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      this.theme = savedTheme
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme = 'dark'
    }
    this.applyTheme()

    const params = new URLSearchParams(window.location.search)
    const menuParam = params.get("current_menu")
    if (menuParam != null) {
      // 없어진 화면(예산·예산현황)을 가리키는 옛 주소가 남아 있을 수 있다 — 장부로 되돌린다
      const n = parseInt(menuParam)
      this.currentMenu = MENU_TITLES[n] ? n : 1
    }

    this.updateLoginData()

    // 시스템 테마 변경 감지
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        this.theme = e.matches ? 'dark' : 'light'
        this.applyTheme()
      }
    })
  },

  mounted() {
    window.addEventListener('keydown', this.onKeydown)
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown)
  },

  methods: {
    updateLoginData() {
      this.loginStatus = pb.authStore.isValid
      this.loginInfo = pb.authStore.record
    },

    menuChange(newMenu) {
      this.currentMenu = newMenu
      this.closeMobileMenu()
      const params = new URLSearchParams(window.location.search)
      params.set('current_menu', newMenu)
      window.history.pushState({}, '', `${window.location.pathname}?${params}`)

      // 탭을 옮기면 읽는 자리도 본문 처음으로 옮겨 준다
      this.$nextTick(() => document.getElementById('main-content')?.focus())
    },

    onKeydown(e) {
      if (e.key === 'Escape' && this.isMobileMenuOpen) this.closeMobileMenu()
    },

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', this.theme)
      this.applyTheme()
    },

    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen
      document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : ''
    },

    closeMobileMenu() {
      this.isMobileMenuOpen = false
      document.body.style.overflow = ''
    }
  }
}
</script>

<style scoped>
#main-content:focus {
  outline: none;
}

/* 로그인 전 화면 */
.signed-out {
  display: grid;
  justify-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-12) var(--spacing-5);
  text-align: center;
}

.signed-out i {
  font-size: 2.5rem;
  color: var(--border-color-strong);
}

.signed-out h1 {
  margin: var(--spacing-2) 0 0;
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.signed-out p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-base);
}
</style>
