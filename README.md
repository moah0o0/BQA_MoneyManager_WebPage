# 모두의결산 - Frontend

운동 조직을 위한 재정 관리 시스템 프론트엔드

## 기술 스택

- **Vue 3** - 프론트엔드 프레임워크
- **Vite 7** - 빌드 도구
- **PocketBase** - 백엔드 연동
- **vue-draggable-next** - 드래그 앤 드롭 기능

## 요구사항

- Node.js ^20.19.0 또는 >=22.12.0

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 환경 설정

`vite.config.js`에서 다음 설정을 변경할 수 있습니다:

```js
// PocketBase API URL
const pocketbaseUrl = mode === 'production'
  ? 'https://your-api-domain.com'  // 운영 환경
  : 'http://127.0.0.1:8090';       // 개발 환경

// 조직 정보
const organizationName = '조직명';
const organizationInitDate = '202503010000'; // 관리 시작일 (YYYYMMDDHHMM)
```

## 프로젝트 구조

```
src/
├── App.vue                 # 루트 컴포넌트
├── main.js                 # 진입점
├── style.css               # 전역 스타일
├── logo.png                # 로고 이미지
└── components/
    ├── layout/             # 레이아웃 컴포넌트
    │   ├── BarHeader.vue   # 헤더 (로그인, 테마 전환)
    │   └── BarMenu.vue     # 메뉴 네비게이션
    ├── ledger/             # 장부 기능
    │   ├── TabLedger.vue   # 장부 탭 메인
    │   ├── LedgerTable.vue # 장부 테이블
    │   ├── AddTransactionModal.vue  # 거래 추가 모달
    │   ├── *Label.vue      # 셀 라벨 컴포넌트들
    │   └── style.css
    ├── assets/             # 계정과목 기능
    │   ├── TabAssets.vue   # 계정과목 탭 메인
    │   ├── HangBlock.vue   # 항 블록
    │   ├── MokBlock.vue    # 목 블록
    │   ├── SaemokModal.vue # 세목 관리 모달
    │   └── InlineEditor.vue # 인라인 편집기
    ├── report/             # 공금보고서 기능
    │   ├── TabReport.vue   # 공금보고서 탭 메인
    │   ├── TotalPage.vue   # 총괄표 페이지
    │   ├── HistoryPage.vue # 집행내역 페이지
    │   ├── ReceiptPage.vue # 영수증 페이지
    │   ├── BudgetMonitorPage.vue # 예산현황 페이지
    │   ├── AssetsLabel.vue # 계정과목 라벨
    │   └── style.css
    └── budget/             # 예산 기능
        ├── TabBudget.vue   # 예산 탭 메인
        └── TabBudgetMonitor.vue # 예산현황 탭 메인
```

## 주요 기능

| 탭 | 기능 |
|---|---|
| 장부 | 수입/지출 내역 관리, 거래 추가/수정/삭제, 영수증 첨부 |
| 계정과목 | 항/목/세목 체계 관리, 순서 변경 (드래그 앤 드롭) |
| 공금보고서 | 총괄표, 집행내역, 영수증 보고서 생성 및 PDF 다운로드 |
| 예산 | 회계기간별 예산 편성 및 관리 |
| 예산현황 | 예산 대비 집행 현황 조회 및 PDF 다운로드 |

## 권한 체계

- **admin** - 전체 권한
- **editor** - 편집 권한
- **viewer** - 조회 권한

## 라이선스

Private
