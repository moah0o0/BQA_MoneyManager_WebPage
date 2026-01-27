<template>
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
    :current-menu="currentMenu"
    :is-mobile-open="isMobileMenuOpen"
    @change-menu="menuChange"
    @close-mobile-menu="closeMobileMenu"
  />

  <!-- 모바일 메뉴 오버레이 -->
  <div
    v-if="isMobileMenuOpen"
    class="mobile-menu-overlay"
    @click="closeMobileMenu"
  ></div>

  <div class="area-main-content">
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

    <TabBudget
      v-if="currentMenu == 4"
      :login-status="loginStatus"
      :can-edit="canEdit"
    />

    <TabBudgetMonitor
      v-if="currentMenu == 5"
      :login-status="loginStatus"
    />
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
import TabBudget from './components/budget/TabBudget.vue'
import TabBudgetMonitor from './components/budget/TabBudgetMonitor.vue'

const pb = new PocketBase(__POCKETBASE_API_BASE_URL__)

export default {
  components: {
    TabLedger,
    TabAssets,
    TabReport,
    TabBudget,
    TabBudgetMonitor,
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
      this.currentMenu = parseInt(menuParam)
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

<style>
/* 모바일 메뉴 오버레이 */
.mobile-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 150;
    animation: fadeIn var(--duration-200) var(--ease-out);
}

/* -------------------- 다크모드 스타일 -------------------- */
[data-theme="dark"] .mobile-menu-overlay {
    background-color: rgba(0, 0, 0, 0.7);
}
</style>
