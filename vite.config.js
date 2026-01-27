// vite.config.js

import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const pocketbaseUrl = mode === 'production'
    ? 'https://api-money.busanqueeract.kr' // npm run build (운영) 시 사용
    : 'https://api-money.busanqueeract.kr';          // npm run dev (개발) 시 사용

  const organizationName = '부산퀴어행동' //조직명;
  const organizationInitDate = '202503010000'; // 관리 시작일 : 202503010000

  return {
    base: mode === 'production' ? '/money-busanqueeract-kr/' : '/',
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },

    define: {
      '__POCKETBASE_API_BASE_URL__': JSON.stringify(pocketbaseUrl),
      '__ORGANIZATION_NAME__': JSON.stringify(organizationName),
      '__ORGANIZATION_INIT_DATE__': JSON.stringify(organizationInitDate),
    },
  };
});