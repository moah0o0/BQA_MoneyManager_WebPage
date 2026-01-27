<template>
<div class="header">
    <div class="info none-select">

        <!-- 모바일: 햄버거 메뉴 버튼 -->
        <button class="mobile-menu-btn" @click="$emit('toggle-mobile-menu')">
            <i :class="['bi', isMobileMenuOpen ? 'bi-x-lg' : 'bi-list']"></i>
        </button>

        <div class="service">
            <span class="logo-text">모두의결산</span>
        </div>

        <div class="user">

            <div class="auth-info-display" v-if="loginStatus">
                <span class="auth-user-name"> {{ organizationName }}</span>
                <span class="auth-user-email"> {{ loginInfo.name }}님({{ permission }})</span>
            </div>

            <!-- 테마 토글 버튼 -->
            <button class="theme-toggle-btn" @click="$emit('toggle-theme')" :title="theme === 'light' ? '다크모드로 전환' : '라이트모드로 전환'">
                <i :class="['bi', theme === 'light' ? 'bi-moon-fill' : 'bi-sun-fill']"></i>
            </button>

            <div class="status">
                <span :class="['button', loginStatus ? 'btn-logout' : 'btn-login']"
                      @click="loginStatus ? Logout() : openModal()">
                    <i :class="['bi', loginStatus ? 'bi-box-arrow-right' : 'bi-person-fill-lock']"></i>
                    <span class="btn-text">{{ loginStatus ? '로그아웃' : '로그인' }}</span>
                </span>
            </div>

        </div>
    </div>
    
    <div class="modal-backdrop" v-if="isModalOpen" @click.self="closeModal()">
        <div class="login-modal">
            <div class="modal-header">
                <h2>
                    <i class="bi bi-person-circle"></i> 
                    <span>로그인</span>
                </h2>
                <button class="close-button" @click="closeModal()"><i class="bi bi-x-lg"></i></button>
            </div>
            
            <div class="modal-body">
                <p class="description">
                    {{ organizationName }} DB에 접근하기 위해 로그인이 필요합니다
                </p>
                
                <!-- 에러 메시지 표시 영역 -->
                <div v-if="errorMessage" class="error-message">
                    <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMessage }}
                </div>

                <!-- 1. 구글 로그인 영역 (유일한 로그인 수단) -->
                <div>
                    <span class="button btn-google-login modal-submit-button" @click="LoginWithGoogle">
                        <i class="bi bi-google"></i> 구글로 로그인 
                    </span>
                </div>
                
            </div>
        </div>
    </div>
    </div>
</template>

<script>
import PocketBase from 'pocketbase';
// PocketBase SDK 초기화 (전역 변수 __POCKETBASE_API_BASE_URL__ 사용)
const pb = new PocketBase(typeof __POCKETBASE_API_BASE_URL__ !== 'undefined' ? __POCKETBASE_API_BASE_URL__ : 'http://127.0.0.1:8090');

export default {
    props: ['loginStatus', 'loginInfo', 'organizationName', 'theme', 'isMobileMenuOpen'],
    
    data(){
        return {
            isModalOpen: false, 
            errorMessage: '', // 에러 메시지
        }
    },
    computed: {
        permission() {
            switch(this.loginInfo.permission){
                case "viewer":
                    return "일부권한 : 편집 불가"
                case "editor":
                    return "전체권한"
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
                const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
                
                // OAuth2 성공 후 토큰 확인
                if (pb.authStore.isValid) {
                    // 로그인 성공 처리
                    this.closeModal();
                    this.$emit('update');
                }

            } catch (error) {
                // 사용자가 팝업을 닫거나, 인증에 실패했을 때 에러 처리
                this.errorMessage = "Google 로그인에 실패했거나 취소되었습니다.";
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
                console.log("로그아웃에 성공했습니다.") 
            } catch(error) {
                this.errorMessage = "로그아웃에 실패했습니다: " + error.message;
            }
        },
    },

    watch: {
        isModalOpen(isOpen) {
            document.body.style.overflow = isOpen ? 'hidden' : '';
            if (isOpen) {
                // 모달이 열릴 때 상태 초기화
                this.errorMessage = '';
            }
        }
    },
}
</script>

<style scoped>
/* -------------------- 기본 스타일 -------------------- */
.none-select {
    user-select: none;
    -moz-user-select: none;
    -webkit-user-drag: none;
}

.info {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
}

/* 모바일 메뉴 버튼 */
.mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    font-size: 24px;
    color: var(--text-primary);
    cursor: pointer;
    padding: 8px;
    margin-right: 10px;
    border-radius: var(--border-radius-md);
    transition: background-color var(--duration-200) var(--ease-out);
}

.mobile-menu-btn:hover {
    background-color: var(--bg-tertiary);
}

.service {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 4;
}

.logo-text {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    white-space: nowrap;
}

.user {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 200px;
}

.auth-info-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 1;
}

.auth-user-name {
    font-weight: 700;
    font-size: 16px;
    color: var(--text-primary);
    white-space: nowrap;
}

.auth-user-email {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-secondary);
    white-space: nowrap;
}

/* 테마 토글 버튼 */
.theme-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-full);
    cursor: pointer;
    font-size: 18px;
    color: var(--text-primary);
    transition: all var(--duration-200) var(--ease-out);
}

.theme-toggle-btn:hover {
    background: var(--primary-100);
    border-color: var(--primary-300);
    color: var(--primary-600);
    transform: rotate(15deg);
}

.status {
    flex-shrink: 0;
}

.status > .button {
    font-weight: 700;
    cursor: pointer;
    font-size: 14px;
    padding: 8px 16px;
    gap: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--border-radius-lg);
    transition: all var(--duration-200) var(--ease-out);
}

.status > .btn-login {
    color: white;
    background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
    box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
}

.status > .btn-login:hover {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(139, 92, 246, 0.4);
}

.status > .btn-logout {
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
}

.status > .btn-logout:hover {
    background-color: var(--bg-secondary);
    border-color: var(--text-secondary);
}

/* 반응형: 태블릿 */
@media (max-width: 768px) {
    .mobile-menu-btn {
        display: flex;
    }

    .auth-info-display {
        display: none;
    }

    .user {
        min-width: auto;
        gap: 12px;
    }

    .status > .button .btn-text {
        display: none;
    }

    .status > .button {
        padding: 10px;
    }
}

/* 반응형: 모바일 */
@media (max-width: 640px) {
    .info {
        padding: 12px 0;
    }

    .logo-text {
        font-size: 20px;
    }

    .theme-toggle-btn {
        width: 36px;
        height: 36px;
        font-size: 16px;
    }
}


/* -------------------- 모달 디자인 -------------------- */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    animation: fadeIn var(--duration-200) var(--ease-out);
}

.login-modal {
    background: var(--bg-primary);
    padding: 32px 40px;
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-xl);
    width: 400px;
    max-width: 90%;
    color: var(--text-primary);
    animation: slideUp var(--duration-300) var(--ease-out);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
}

.close-button {
    background: var(--bg-tertiary);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: var(--border-radius-full);
    font-size: 16px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-200) var(--ease-out);
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-button:hover {
    background: var(--danger-100);
    color: var(--danger-600);
}

.modal-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.modal-body .description {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
    line-height: 1.6;
    text-align: left;
}

.modal-submit-button {
    margin-top: 8px;
    width: 100%;
    height: 52px;
    font-size: 16px;
    font-weight: 700;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-md);
    transition: all var(--duration-200) var(--ease-out);
}

.modal-submit-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.modal-submit-button:active {
    transform: translateY(0);
}

/* 구글 로그인 버튼 스타일 */
.btn-google-login {
    background: linear-gradient(135deg, #4285f4, #357ae8);
    color: white;
    margin-top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.btn-google-login:hover {
    background: linear-gradient(135deg, #357ae8, #2a6bc7);
}

/* 에러 메시지 스타일 */
.error-message {
    padding: 14px 16px;
    background-color: var(--danger-50);
    border: 1px solid var(--danger-200);
    color: var(--danger-700);
    border-radius: var(--border-radius-lg);
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
}

/* 반응형: 모바일 */
@media (max-width: 640px) {
    .login-modal {
        padding: 24px;
        width: 100%;
        max-width: calc(100% - 32px);
    }

    .modal-header h2 {
        font-size: 20px;
    }
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .theme-toggle-btn:hover,
[data-theme="dark"] .theme-toggle-btn:hover {
    background: var(--primary-900);
    border-color: var(--primary-700);
    color: var(--primary-400);
}

:deep([data-theme="dark"]) .modal-backdrop,
[data-theme="dark"] .modal-backdrop {
    background-color: rgba(0, 0, 0, 0.8);
}

:deep([data-theme="dark"]) .login-modal,
[data-theme="dark"] .login-modal {
    background: var(--bg-secondary);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

:deep([data-theme="dark"]) .modal-header,
[data-theme="dark"] .modal-header {
    border-bottom-color: var(--border-color);
}

:deep([data-theme="dark"]) .close-button,
[data-theme="dark"] .close-button {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .close-button:hover,
[data-theme="dark"] .close-button:hover {
    background: var(--danger-900);
    color: var(--danger-400);
}

:deep([data-theme="dark"]) .error-message,
[data-theme="dark"] .error-message {
    background-color: var(--danger-900);
    border-color: var(--danger-700);
    color: var(--danger-300);
}

:deep([data-theme="dark"]) .btn-google-login,
[data-theme="dark"] .btn-google-login {
    background: linear-gradient(135deg, #3b7dd8, #2a5ba8);
}

:deep([data-theme="dark"]) .btn-google-login:hover,
[data-theme="dark"] .btn-google-login:hover {
    background: linear-gradient(135deg, #4a8ae6, #3b7dd8);
}
</style>
