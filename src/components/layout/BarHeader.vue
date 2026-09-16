<template>
<header class="header">
    <div class="info">

        <div class="service">
            <!-- 모바일: 길잡이 여닫기 -->
            <button
                type="button"
                class="mobile-menu-btn"
                :aria-expanded="isMobileMenuOpen ? 'true' : 'false'"
                :aria-label="isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
                aria-controls="main-nav"
                @click="$emit('toggle-mobile-menu')"
            >
                <i :class="['bi', isMobileMenuOpen ? 'bi-x-lg' : 'bi-list']" aria-hidden="true"></i>
            </button>

            <span class="logo-mark" aria-hidden="true">₩</span>
            <span class="logo-text none-select">모두의결산</span>
        </div>

        <div class="user">

            <div class="auth-info-display" v-if="loginStatus">
                <span class="auth-user-name">{{ organizationName }}</span>
                <span class="auth-user-email">
                    {{ loginInfo.name }}님
                    <span :class="['perm-badge', canEdit ? 'is-editor' : 'is-viewer']">{{ permission }}</span>
                </span>
            </div>

            <!-- 밝게/어둡게 -->
            <button
                type="button"
                class="theme-toggle-btn"
                :aria-label="theme === 'light' ? '어두운 화면으로 바꾸기' : '밝은 화면으로 바꾸기'"
                :aria-pressed="theme === 'dark' ? 'true' : 'false'"
                @click="$emit('toggle-theme')"
            >
                <i :class="['bi', theme === 'light' ? 'bi-moon-stars' : 'bi-sun']" aria-hidden="true"></i>
            </button>

            <button
                type="button"
                :class="['auth-btn', loginStatus ? 'btn-logout' : 'btn-login']"
                @click="loginStatus ? Logout() : openModal()"
            >
                <i :class="['bi', loginStatus ? 'bi-box-arrow-right' : 'bi-person-fill-lock']" aria-hidden="true"></i>
                <span class="btn-text">{{ loginStatus ? '로그아웃' : '로그인' }}</span>
                <span class="sr-only">{{ loginStatus ? '로그아웃' : '로그인' }}</span>
            </button>

        </div>
    </div>

    <AppModal
        v-if="isModalOpen"
        title="로그인"
        icon="bi-person-circle"
        size="sm"
        :description="`${organizationName} 자료를 보려면 로그인이 필요합니다.`"
        initial-focus=".btn-google-login"
        @close="closeModal"
    >
        <!-- 잘못된 일은 소리 내어 알린다. 조용히 색만 바뀌면 화면을 못 보는 사람은 모른다 -->
        <p v-if="errorMessage" class="notice notice-danger login-error" role="alert">
            <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{{ errorMessage }}</span>
        </p>

        <button type="button" class="btn btn-lg btn-google-login" @click="LoginWithGoogle">
            <i class="bi bi-google" aria-hidden="true"></i>
            구글로 로그인
        </button>

        <p class="hint login-hint">
            구글 계정 창이 새로 열립니다. 창이 뜨지 않으면 팝업 차단을 풀어 주세요.
        </p>
    </AppModal>
</header>
</template>

<script>
import PocketBase from 'pocketbase';
import AppModal from './AppModal.vue';

// PocketBase SDK 초기화 (전역 변수 __POCKETBASE_API_BASE_URL__ 사용)
const pb = new PocketBase(typeof __POCKETBASE_API_BASE_URL__ !== 'undefined' ? __POCKETBASE_API_BASE_URL__ : 'http://127.0.0.1:8090');

export default {
    components: { AppModal },

    props: ['loginStatus', 'loginInfo', 'organizationName', 'theme', 'isMobileMenuOpen'],

    emits: ['update', 'toggle-theme', 'toggle-mobile-menu'],

    data(){
        return {
            isModalOpen: false,
            errorMessage: '', // 에러 메시지
        }
    },

    computed: {
        canEdit() {
            const p = this.loginInfo?.permission
            return p === 'admin' || p === 'editor'
        },

        permission() {
            switch(this.loginInfo?.permission){
                case "viewer":
                    return "읽기 전용"
                case "editor":
                case "admin":
                    return "편집 가능"
                default:
                    return "권한 확인 중"
            }
        }
    },

    methods: {
        // 모달 열기/닫기
        openModal() {
            if (!this.loginStatus) {
                this.isModalOpen = true;
                this.errorMessage = '';
            }
        },

        closeModal() {
            this.isModalOpen = false;
            this.errorMessage = '';
        },

        // 1. Google OAuth2 로그인 처리 (주요 로그인 방법)
        async LoginWithGoogle() {
            this.errorMessage = '';
            try {
                // PocketBase OAuth2 인증 시작
                await pb.collection('users').authWithOAuth2({ provider: 'google' });

                // OAuth2 성공 후 토큰 확인
                if (pb.authStore.isValid) {
                    // 로그인 성공 처리
                    this.closeModal();
                    this.$emit('update');
                }

            } catch (error) {
                // 사용자가 팝업을 닫거나, 인증에 실패했을 때 에러 처리
                this.errorMessage = "구글 로그인에 실패했거나 취소되었습니다. 다시 시도해 주세요.";
                console.error("구글 로그인 오류:", error);
            }
        },

        // 로그아웃 처리
        async Logout(){
            if(this.loginStatus == false) return;
            this.errorMessage = '';

            try {
                pb.authStore.clear()
                this.$emit('update')
            } catch(error) {
                this.errorMessage = "로그아웃에 실패했습니다: " + error.message;
            }
        },
    },
}
</script>

<style scoped>
/* -------------------- 머리띠 -------------------- */
.info {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-4);
}

.service {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
}

.logo-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: var(--border-radius-md);
    /* 그러데이션은 이 한 곳에만 쓴다 — 표지 구실을 하는 자리 */
    background: var(--gradient);
    color: #fff;
    font-size: var(--text-md);
    font-weight: var(--font-weight-bold);
    line-height: 1;
}

.logo-text {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    white-space: nowrap;
}

/* 길잡이 여닫기 */
.mobile-menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-left: calc(var(--spacing-2) * -1);
    background: none;
    border: none;
    border-radius: var(--border-radius-md);
    font-size: 1.25rem;
    color: var(--text-primary);
    transition: background-color var(--transition-fast);
}

.mobile-menu-btn:hover {
    background-color: var(--bg-hover);
}

.user {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--spacing-3);
    min-width: 0;
}

.auth-info-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: var(--line-height-tight);
    min-width: 0;
}

.auth-user-name {
    font-weight: var(--font-weight-bold);
    font-size: var(--text-base);
    color: var(--text-primary);
    white-space: nowrap;
}

.auth-user-email {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-top: 2px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: nowrap;
}

/*
    권한은 배지로 또렷하게 보여 준다.
    '일부권한 : 편집 불가'처럼 길게 적어 두면 읽히지 않는다 —
    편집이 되는지 안 되는지 한눈에 알아야 한다.
*/
.perm-badge {
    padding: 1px var(--spacing-2);
    border-radius: var(--border-radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
}

.perm-badge.is-editor {
    background: var(--success-50);
    color: var(--success-600);
}

.perm-badge.is-viewer {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
}

/* 밝게/어둡게 */
.theme-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-full);
    font-size: var(--text-md);
    color: var(--text-secondary);
    transition: background-color var(--transition-fast), color var(--transition-fast),
        border-color var(--transition-fast);
}

.theme-toggle-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-color-strong);
    color: var(--text-primary);
}

.auth-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    flex-shrink: 0;
    min-height: 36px;
    padding: 0 var(--spacing-4);
    border: 1px solid transparent;
    border-radius: var(--border-radius-md);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.auth-btn .sr-only {
    /* 글자가 보일 때는 두 번 읽히지 않게 한다 */
    display: none;
}

.btn-login {
    color: #fff;
    background: var(--primary-600);
    border-color: var(--primary-600);
}

.btn-login:hover {
    background: var(--primary-700);
    border-color: var(--primary-700);
}

.btn-logout {
    color: var(--text-primary);
    background-color: var(--bg-primary);
    border-color: var(--border-color-strong);
}

.btn-logout:hover {
    background-color: var(--bg-hover);
}

/* -------------------- 로그인 창 -------------------- */
.login-error {
    margin: 0 0 var(--spacing-4);
}

.btn-google-login {
    width: 100%;
    background: #4285f4;
    border-color: #4285f4;
    color: #fff;
    font-size: var(--text-md);
}

.btn-google-login:hover {
    background: #3367d6;
    border-color: #3367d6;
}

.login-hint {
    margin-top: var(--spacing-3);
    text-align: center;
}

/* -------------------- 반응형 -------------------- */
@media (max-width: 1024px) {
    .mobile-menu-btn {
        display: flex;
    }
}

@media (max-width: 768px) {
    .auth-info-display {
        display: none;
    }

    .user {
        gap: var(--spacing-2);
    }

    .auth-btn .btn-text {
        display: none;
    }

    .auth-btn .sr-only {
        display: initial;
    }

    .auth-btn {
        width: 40px;
        min-height: 40px;
        padding: 0;
    }

    .theme-toggle-btn {
        width: 40px;
        height: 40px;
    }

    .logo-text {
        font-size: var(--text-md);
    }
}

/* -------------------- 다크모드 -------------------- */
[data-theme="dark"] .perm-badge.is-editor {
    background: rgb(34 197 94 / 0.16);
    color: var(--success-400);
}

[data-theme="dark"] .btn-login {
    background: var(--primary-500);
    border-color: var(--primary-500);
}

[data-theme="dark"] .btn-login:hover {
    background: var(--primary-400);
    border-color: var(--primary-400);
    color: var(--primary-950);
}
</style>
