<template>
    <div class="tab-root none-select">
        <template v-if="loginStatus">
            <div class="page-head">
                <div>
                    <h1 class="page-title">예산</h1>
                    <p class="page-desc">회계기간을 정하고, 그 기간에 쓸 예산을 항·목·세목별로 적습니다.</p>
                </div>
            </div>

            <!-- 기간 관리 섹션 -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">회계기간</h2>
                    <button v-if="canEdit" type="button" class="btn btn-primary btn-sm" @click="openPeriodModal(null)">
                        <i class="bi bi-plus-lg" aria-hidden="true"></i> 기간 추가
                    </button>
                </div>

                <!--
                    카드 안에 또 단추를 넣을 수는 없다(단추 안의 단추는 HTML이 아니다).
                    고르는 단추와 손보는 단추를 나란히 둔다.
                -->
                <ul class="period-list">
                    <li
                        v-for="period in sortedPeriods"
                        :key="period.id"
                        :class="['period-card', { active: selectedPeriod?.id === period.id, closed: period.is_closed }]"
                    >
                        <button
                            type="button"
                            class="period-select"
                            :aria-pressed="selectedPeriod?.id === period.id ? 'true' : 'false'"
                            @click="selectPeriod(period)"
                        >
                            <span class="period-name">
                                {{ period.name }}
                                <span v-if="period.is_closed" class="closed-badge">
                                    <i class="bi bi-lock-fill" aria-hidden="true"></i> 마감
                                </span>
                            </span>
                            <span class="period-date num">
                                {{ formatDate(period.start_date) }} ~ {{ formatDate(period.end_date) }}
                            </span>
                        </button>

                        <div class="period-actions" v-if="canEdit">
                            <button
                                type="button"
                                :class="['btn-icon', { 'closed-toggle': period.is_closed }]"
                                @click="togglePeriodClose(period)"
                                :title="period.is_closed ? '마감 풀기' : '마감하기'"
                                :aria-label="`${period.name} ${period.is_closed ? '마감 풀기' : '마감하기'}`"
                            >
                                <i :class="period.is_closed ? 'bi bi-unlock' : 'bi bi-lock'" aria-hidden="true"></i>
                            </button>
                            <button type="button" class="btn-icon" @click="openPeriodModal(period)"
                                :title="period.is_closed ? '마감된 기간은 고칠 수 없습니다' : '고치기'"
                                :aria-label="`${period.name} 고치기`" :disabled="period.is_closed">
                                <i class="bi bi-pencil" aria-hidden="true"></i>
                            </button>
                            <button type="button" class="btn-icon danger" @click="deletePeriod(period.id)"
                                :title="period.is_closed ? '마감된 기간은 지울 수 없습니다' : '지우기'"
                                :aria-label="`${period.name} 지우기`" :disabled="period.is_closed">
                                <i class="bi bi-trash" aria-hidden="true"></i>
                            </button>
                        </div>
                    </li>
                    <li v-if="PERIODS.length === 0" class="empty">
                        아직 정한 회계기간이 없습니다. 먼저 기간을 하나 더해 주세요.
                    </li>
                </ul>
            </div>

            <!-- 예산 관리 섹션 -->
            <div class="section" v-if="selectedPeriod">
                <div class="section-header">
                    <h2 class="section-title">
                        {{ selectedPeriod.name }} 예산
                        <span class="budget-summary">
                            (<span class="income-text">수입 +{{ formatMoney(totalIncomeBudget) }}원</span> / <span class="expense-text">지출 -{{ formatMoney(totalExpenseBudget) }}원</span>)
                        </span>
                    </h2>
                    <button v-if="canEdit && !selectedPeriod.is_closed" type="button" class="btn btn-primary btn-sm" @click="openBudgetModal(null)">
                        <i class="bi bi-plus-lg" aria-hidden="true"></i> 예산 항목 추가
                    </button>
                    <span v-if="selectedPeriod.is_closed" class="closed-notice">
                        <i class="bi bi-lock-fill" aria-hidden="true"></i> 마감된 기간입니다
                    </span>
                </div>

                <div class="budget-table-wrapper">
                    <table class="budget-table hierarchical">
                        <caption class="sr-only">{{ selectedPeriod.name }} 예산을 항·목·세목 차례로 보여 줍니다.</caption>
                        <thead>
                            <tr>
                                <th scope="col" style="width: 46%">분류</th>
                                <th scope="col" style="width: 17%" class="budget-amount">수입예산</th>
                                <th scope="col" style="width: 17%" class="budget-amount">지출예산</th>
                                <th scope="col" style="width: 16%" v-if="canEdit && !selectedPeriod.is_closed">
                                    <span class="sr-only">관리</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-for="(row, idx) in budgetsWithSubtotals" :key="idx">
                                <!-- 항 헤더 -->
                                <tr v-if="row.type === 'hang-header'" class="hang-header-row">
                                    <td :colspan="(canEdit && !selectedPeriod.is_closed) ? 4 : 3" class="hang-header-cell">
                                        <i class="bi bi-folder2"></i>
                                        <span class="priority-badge">{{ row.hangPriority }}</span>
                                        {{ row.hangLabel }}
                                    </td>
                                </tr>
                                <!-- 목 헤더 -->
                                <tr v-else-if="row.type === 'mok-header'" class="mok-header-row">
                                    <td :colspan="(canEdit && !selectedPeriod.is_closed) ? 4 : 3" class="mok-header-cell">
                                        <i class="bi bi-folder"></i>
                                        <span class="priority-badge mok">{{ row.mokPriority }}</span>
                                        {{ row.mokLabel }}
                                    </td>
                                </tr>
                                <!-- 세목 항목 -->
                                <tr v-else-if="row.type === 'item'" class="item-row">
                                    <td class="item-cell">{{ getAssetLabel('saemok', row.saemok) }}</td>
                                    <td class="budget-amount income num" :class="{ 'is-zero': !row.income_budget }">{{ row.income_budget > 0 ? '+' : '' }}{{ formatMoney(row.income_budget) }}원</td>
                                    <td class="budget-amount expense num" :class="{ 'is-zero': !row.expense_budget }">{{ row.expense_budget > 0 ? '−' : '' }}{{ formatMoney(row.expense_budget) }}원</td>
                                    <td v-if="canEdit && !selectedPeriod.is_closed" class="action-cell">
                                        <button type="button" class="btn-icon" @click="openBudgetModal(row)"
                                            title="고치기" :aria-label="`${getAssetLabel('saemok', row.saemok)} 예산 고치기`">
                                            <i class="bi bi-pencil" aria-hidden="true"></i>
                                        </button>
                                        <button type="button" class="btn-icon danger" @click="deleteBudget(row.id)"
                                            title="지우기" :aria-label="`${getAssetLabel('saemok', row.saemok)} 예산 지우기`">
                                            <i class="bi bi-trash" aria-hidden="true"></i>
                                        </button>
                                    </td>
                                </tr>
                                <!-- 목 소계 -->
                                <tr v-else-if="row.type === 'mok-subtotal'" class="mok-subtotal-row">
                                    <td class="subtotal-label mok-subtotal-label">{{ row.mokLabel }} 소계</td>
                                    <td class="budget-amount income subtotal-amount num" :class="{ 'is-zero': !row.incomeSum }">{{ row.incomeSum > 0 ? '+' : '' }}{{ formatMoney(row.incomeSum) }}원</td>
                                    <td class="budget-amount expense subtotal-amount num" :class="{ 'is-zero': !row.expenseSum }">{{ row.expenseSum > 0 ? '−' : '' }}{{ formatMoney(row.expenseSum) }}원</td>
                                    <td v-if="canEdit && !selectedPeriod.is_closed"></td>
                                </tr>
                                <!-- 항 소계 -->
                                <tr v-else-if="row.type === 'hang-subtotal'" class="hang-subtotal-row">
                                    <td class="subtotal-label hang-subtotal-label">{{ row.hangLabel }} 합계</td>
                                    <td class="budget-amount income subtotal-amount hang-subtotal-amount num" :class="{ 'is-zero': !row.incomeSum }">{{ row.incomeSum > 0 ? '+' : '' }}{{ formatMoney(row.incomeSum) }}원</td>
                                    <td class="budget-amount expense subtotal-amount hang-subtotal-amount num" :class="{ 'is-zero': !row.expenseSum }">{{ row.expenseSum > 0 ? '−' : '' }}{{ formatMoney(row.expenseSum) }}원</td>
                                    <td v-if="canEdit && !selectedPeriod.is_closed"></td>
                                </tr>
                            </template>
                            <tr v-if="BUDGETS.length === 0">
                                <td :colspan="(canEdit && !selectedPeriod.is_closed) ? 4 : 3" class="empty-cell">
                                    예산 항목이 없습니다. 예산 항목을 추가해주세요.
                                </td>
                            </tr>
                        </tbody>
                        <tfoot v-if="BUDGETS.length > 0">
                            <tr class="total-row">
                                <th>총 합계</th>
                                <th scope="row" class="budget-amount income num">+{{ formatMoney(totalIncomeBudget) }}원</th>
                                <th class="budget-amount expense num">−{{ formatMoney(totalExpenseBudget) }}원</th>
                                <td v-if="canEdit && !selectedPeriod.is_closed"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div v-else class="empty-state">
                <i class="bi bi-calendar3" aria-hidden="true"></i>
                <p>위에서 회계기간을 하나 고르면 그 기간의 예산이 보입니다.</p>
            </div>
        </template>

        <template v-else>
            <div class="content disable"></div>
        </template>

        <!-- 기간 창 -->
        <AppModal
            v-if="periodModal.isOpen"
            :title="periodModal.data ? '기간 고치기' : '기간 추가'"
            icon="bi-calendar-range"
            description="장부와 보고서를 묶는 단위입니다. 보통 한 해나 반기로 잡습니다."
            size="sm"
            initial-focus="input"
            @close="closePeriodModal"
        >
            <div class="form-group">
                <label for="period-name">기간 이름</label>
                <input id="period-name" type="text" v-model="periodForm.name" placeholder="예: 2025년 1분기" />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="period-start">시작일</label>
                    <input id="period-start" type="date" v-model="periodForm.start_date" />
                </div>
                <div class="form-group">
                    <label for="period-end">종료일</label>
                    <input id="period-end" type="date" v-model="periodForm.end_date" />
                </div>
            </div>

            <template #footer>
                <button type="button" class="btn btn-ghost" @click="closePeriodModal">취소</button>
                <button type="button" class="btn btn-primary" @click="savePeriod">저장</button>
            </template>
        </AppModal>

        <!-- 예산 항목 창 -->
        <AppModal
            v-if="budgetModal.isOpen"
            :title="budgetModal.data ? '예산 항목 고치기' : '예산 항목 추가'"
            icon="bi-cash-coin"
            description="항 → 목 → 세목 차례로 고른 뒤 금액을 적습니다."
            size="md"
            @close="closeBudgetModal"
        >
            <div class="form-group">
                <label for="budget-hang">항 <span class="required" aria-hidden="true">*</span></label>
                <select id="budget-hang" v-model="budgetForm.hang" @change="onHangChange" required>
                    <option value="">고르세요</option>
                    <option v-for="hang in ASSETS_HANG" :key="hang.id" :value="hang.id">
                        {{ hang.label }}
                    </option>
                </select>
            </div>
            <div class="form-group">
                <label for="budget-mok">목 <span class="required" aria-hidden="true">*</span></label>
                <select id="budget-mok" v-model="budgetForm.mok" @change="onMokChange" :disabled="!budgetForm.hang" required>
                    <option value="">{{ budgetForm.hang ? '고르세요' : '항을 먼저 고르세요' }}</option>
                    <option v-for="mok in filteredMoks" :key="mok.id" :value="mok.id">
                        {{ mok.label }}
                    </option>
                </select>
            </div>
            <div class="form-group">
                <label for="budget-saemok">세목 <span class="required" aria-hidden="true">*</span></label>
                <select id="budget-saemok" v-model="budgetForm.saemok" :disabled="!budgetForm.mok" required>
                    <option value="">{{ budgetForm.mok ? '고르세요' : '목을 먼저 고르세요' }}</option>
                    <option v-for="saemok in filteredSaemoks" :key="saemok.id" :value="saemok.id">
                        {{ saemok.label }}
                    </option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="budget-income">수입예산</label>
                    <div class="budget-input-wrapper income">
                        <span class="budget-prefix" aria-hidden="true">+</span>
                        <input
                            id="budget-income"
                            type="text"
                            inputmode="numeric"
                            class="num"
                            :value="formatInputValue(budgetForm.income_budget)"
                            @input="budgetForm.income_budget = parseInputValue($event.target.value)"
                            placeholder="0"
                        />
                        <span class="budget-suffix">원</span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="budget-expense">지출예산</label>
                    <div class="budget-input-wrapper expense">
                        <span class="budget-prefix" aria-hidden="true">−</span>
                        <input
                            id="budget-expense"
                            type="text"
                            inputmode="numeric"
                            class="num"
                            :value="formatInputValue(budgetForm.expense_budget)"
                            @input="budgetForm.expense_budget = parseInputValue($event.target.value)"
                            placeholder="0"
                        />
                        <span class="budget-suffix">원</span>
                    </div>
                </div>
            </div>
            <p class="hint">한 줄에는 수입이나 지출 가운데 하나만 적습니다.</p>

            <template #footer>
                <button type="button" class="btn btn-ghost" @click="closeBudgetModal">취소</button>
                <button type="button" class="btn btn-primary" @click="saveBudget" :disabled="!isValidBudgetForm">저장</button>
            </template>
        </AppModal>
    </div>
</template>

<script>
import PocketBase from 'pocketbase';
import AppModal from '../layout/AppModal.vue';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
    components: { AppModal },

    props: ['loginStatus', 'canEdit'],

    data() {
        return {
            PERIODS: [],
            BUDGETS: [],
            ASSETS_HANG: [],
            ASSETS_MOK: [],
            ASSETS_SAEMOK: [],

            selectedPeriod: null,

            periodModal: { isOpen: false, data: null },
            budgetModal: { isOpen: false, data: null },

            periodForm: {
                name: '',
                start_date: '',
                end_date: ''
            },

            budgetForm: {
                hang: '',
                mok: '',
                saemok: '',
                income_budget: 0,
                expense_budget: 0
            }
        }
    },

    computed: {
        // 회계기간 정렬: 마감되지 않은 것이 먼저, 마감된 것은 나중에
        sortedPeriods() {
            return [...this.PERIODS].sort((a, b) => {
                // 마감 여부로 먼저 정렬 (false가 먼저)
                if (a.is_closed !== b.is_closed) {
                    return a.is_closed ? 1 : -1;
                }
                // 같은 마감 상태라면 시작일 내림차순
                return b.start_date - a.start_date;
            });
        },

        // 우선순위로 정렬된 예산 목록
        sortedBudgets() {
            return [...this.BUDGETS].sort((a, b) => {
                const hp = this.getPriority('hang', a.hang) - this.getPriority('hang', b.hang);
                if (hp !== 0) return hp;
                const mp = this.getPriority('mok', a.mok) - this.getPriority('mok', b.mok);
                if (mp !== 0) return mp;
                return this.getPriority('saemok', a.saemok) - this.getPriority('saemok', b.saemok);
            });
        },

        // 항별/목별 소계가 포함된 계층적 예산 목록
        budgetsWithSubtotals() {
            const items = this.sortedBudgets;
            if (items.length === 0) return [];

            const result = [];
            let currentHang = null;
            let currentMok = null;
            let hangItems = [];
            let mokItems = [];

            const flushMok = () => {
                if (mokItems.length > 0) {
                    // 목 내 세목들 출력
                    for (const item of mokItems) {
                        result.push({ type: 'item', ...item });
                    }
                    // 목 소계 (세목이 2개 이상일 때만)
                    if (mokItems.length >= 2) {
                        const incomeSum = mokItems.reduce((s, i) => s + (i.income_budget || 0), 0);
                        const expenseSum = mokItems.reduce((s, i) => s + (i.expense_budget || 0), 0);
                        result.push({
                            type: 'mok-subtotal',
                            mok: currentMok,
                            mokLabel: this.getAssetLabel('mok', currentMok),
                            incomeSum,
                            expenseSum
                        });
                    }
                    mokItems = [];
                }
            };

            const flushHang = () => {
                flushMok();
                if (hangItems.length > 0) {
                    // 항 소계
                    const incomeSum = hangItems.reduce((s, i) => s + (i.income_budget || 0), 0);
                    const expenseSum = hangItems.reduce((s, i) => s + (i.expense_budget || 0), 0);
                    result.push({
                        type: 'hang-subtotal',
                        hang: currentHang,
                        hangLabel: this.getAssetLabel('hang', currentHang),
                        incomeSum,
                        expenseSum
                    });
                    hangItems = [];
                }
            };

            for (const item of items) {
                // 항이 바뀌면 이전 항 마무리
                if (currentHang !== null && item.hang !== currentHang) {
                    flushHang();
                }
                // 목이 바뀌면 이전 목 마무리
                if (currentMok !== null && (item.mok !== currentMok || item.hang !== currentHang)) {
                    flushMok();
                }

                // 항 헤더 (새로운 항 시작)
                if (item.hang !== currentHang) {
                    result.push({
                        type: 'hang-header',
                        hang: item.hang,
                        hangLabel: this.getAssetLabel('hang', item.hang),
                        hangPriority: this.getPriority('hang', item.hang)
                    });
                    currentHang = item.hang;
                }

                // 목 헤더 (새로운 목 시작)
                if (item.mok !== currentMok || item.hang !== currentHang) {
                    result.push({
                        type: 'mok-header',
                        mok: item.mok,
                        mokLabel: this.getAssetLabel('mok', item.mok),
                        mokPriority: this.getPriority('mok', item.mok)
                    });
                    currentMok = item.mok;
                }

                hangItems.push(item);
                mokItems.push(item);
            }

            // 마지막 항/목 마무리
            flushHang();

            return result;
        },

        totalIncomeBudget() {
            return this.BUDGETS.reduce((sum, b) => sum + (b.income_budget || 0), 0);
        },

        totalExpenseBudget() {
            return this.BUDGETS.reduce((sum, b) => sum + (b.expense_budget || 0), 0);
        },

        filteredMoks() {
            if (!this.budgetForm.hang) return [];
            return this.ASSETS_MOK.filter(m => m.parent_hang === this.budgetForm.hang);
        },

        filteredSaemoks() {
            if (!this.budgetForm.mok) return this.ASSETS_SAEMOK;

            const selectedMok = this.ASSETS_MOK.find(m => m.id === this.budgetForm.mok);
            if (selectedMok && selectedMok.is_able_specific_saemok && selectedMok.able_specific_saemok_list?.length > 0) {
                return this.ASSETS_SAEMOK.filter(s => selectedMok.able_specific_saemok_list.includes(s.id));
            }
            return this.ASSETS_SAEMOK;
        },

        isValidBudgetForm() {
            return this.budgetForm.hang && this.budgetForm.mok && this.budgetForm.saemok &&
                   (this.budgetForm.income_budget >= 0 || this.budgetForm.expense_budget >= 0);
        }
    },

    async created() {
        if (this.loginStatus) {
            await this.loadData();
        }
    },

    methods: {
        async loadData() {
            const [periods, hangs, moks, saemoks] = await Promise.all([
                pb.collection('Periods').getFullList({ sort: '-start_date', requestKey: null }),
                pb.collection('AssetsHang').getFullList({ sort: 'priority', requestKey: null }),
                pb.collection('AssetsMok').getFullList({ sort: 'priority', requestKey: null }),
                pb.collection('AssetsSaemok').getFullList({ sort: 'priority', requestKey: null })
            ]);

            this.PERIODS = periods;
            this.ASSETS_HANG = hangs;
            this.ASSETS_MOK = moks;
            this.ASSETS_SAEMOK = saemoks;

            // 첫 번째 기간 자동 선택
            if (this.PERIODS.length > 0 && !this.selectedPeriod) {
                this.selectPeriod(this.PERIODS[0]);
            }
        },

        async loadBudgets(periodId) {
            this.BUDGETS = await pb.collection('PeriodAndBudget').getFullList({
                filter: `field="${periodId}"`,
                expand: 'hang,mok,saemok',
                requestKey: null
            });
        },

        selectPeriod(period) {
            this.selectedPeriod = period;
            this.loadBudgets(period.id);
        },

        getAssetLabel(type, id) {
            const list = type === 'hang' ? this.ASSETS_HANG
                       : type === 'mok' ? this.ASSETS_MOK
                       : this.ASSETS_SAEMOK;
            const item = list.find(a => a.id === id);
            return item?.label || '-';
        },

        getPriority(type, id) {
            const list = type === 'hang' ? this.ASSETS_HANG
                       : type === 'mok' ? this.ASSETS_MOK
                       : this.ASSETS_SAEMOK;
            const item = list.find(a => a.id === id);
            return item?.priority ?? 9999;
        },

        formatDate(num) {
            if (!num) return '';
            const str = String(num);
            return `${str.slice(0,4)}.${str.slice(4,6)}.${str.slice(6,8)}`;
        },

        formatMoney(amount) {
            return (amount || 0).toLocaleString();
        },

        formatInputValue(value) {
            if (!value && value !== 0) return '';
            return value.toLocaleString();
        },

        parseInputValue(value) {
            if (!value) return 0;
            const num = parseInt(value.replace(/[^\d]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        },

        dateToNumber(dateStr) {
            if (!dateStr) return 0;
            return parseInt(dateStr.replace(/-/g, '') + '0000');
        },

        numberToDate(num) {
            if (!num) return '';
            const str = String(num);
            return `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`;
        },

        // 기간 모달
        openPeriodModal(period) {
            this.periodModal.data = period;
            if (period) {
                this.periodForm = {
                    name: period.name,
                    start_date: this.numberToDate(period.start_date),
                    end_date: this.numberToDate(period.end_date)
                };
            } else {
                this.periodForm = { name: '', start_date: '', end_date: '' };
            }
            this.periodModal.isOpen = true;
        },

        closePeriodModal() {
            this.periodModal.isOpen = false;
            this.periodModal.data = null;
        },

        async savePeriod() {
            if (!this.periodForm.name || !this.periodForm.start_date || !this.periodForm.end_date) {
                alert('모든 필드를 입력해주세요.');
                return;
            }

            const data = {
                name: this.periodForm.name,
                start_date: this.dateToNumber(this.periodForm.start_date),
                end_date: this.dateToNumber(this.periodForm.end_date),
                is_closed: false
            };

            try {
                if (this.periodModal.data) {
                    await pb.collection('Periods').update(this.periodModal.data.id, data);
                } else {
                    await pb.collection('Periods').create(data);
                }
                await this.loadData();
                this.closePeriodModal();
            } catch (error) {
                console.error('Failed to save period:', error);
                alert('저장에 실패했습니다.');
            }
        },

        async togglePeriodClose(period) {
            const action = period.is_closed ? '마감 해제' : '마감 처리';
            if (!confirm(`이 기간을 ${action}하시겠습니까?`)) return;

            try {
                await pb.collection('Periods').update(period.id, {
                    is_closed: !period.is_closed
                });
                await this.loadData();

                // 선택된 기간이 업데이트된 기간이면 다시 선택
                if (this.selectedPeriod?.id === period.id) {
                    const updated = this.PERIODS.find(p => p.id === period.id);
                    if (updated) this.selectedPeriod = updated;
                }
            } catch (error) {
                console.error('Failed to toggle period close:', error);
                alert(`${action}에 실패했습니다.`);
            }
        },

        async deletePeriod(id) {
            const period = this.PERIODS.find(p => p.id === id);
            if (period?.is_closed) {
                alert('마감된 기간은 삭제할 수 없습니다. 먼저 마감 해제해주세요.');
                return;
            }
            if (!confirm('이 기간을 삭제하시겠습니까? 연결된 예산 정보도 함께 삭제됩니다.')) return;

            try {
                // 연결된 예산 항목 먼저 삭제
                const budgets = await pb.collection('PeriodAndBudget').getFullList({
                    filter: `field="${id}"`,
                    requestKey: null
                });
                for (const budget of budgets) {
                    await pb.collection('PeriodAndBudget').delete(budget.id);
                }

                await pb.collection('Periods').delete(id);

                if (this.selectedPeriod?.id === id) {
                    this.selectedPeriod = null;
                    this.BUDGETS = [];
                }
                await this.loadData();
            } catch (error) {
                console.error('Failed to delete period:', error);
                alert('삭제에 실패했습니다.');
            }
        },

        // 예산 모달
        openBudgetModal(budget) {
            this.budgetModal.data = budget;
            if (budget) {
                this.budgetForm = {
                    hang: budget.hang,
                    mok: budget.mok,
                    saemok: budget.saemok,
                    income_budget: budget.income_budget || 0,
                    expense_budget: budget.expense_budget || 0
                };
            } else {
                this.budgetForm = { hang: '', mok: '', saemok: '', income_budget: 0, expense_budget: 0 };
            }
            this.budgetModal.isOpen = true;
        },

        closeBudgetModal() {
            this.budgetModal.isOpen = false;
            this.budgetModal.data = null;
        },

        onHangChange() {
            this.budgetForm.mok = '';
            this.budgetForm.saemok = '';
        },

        onMokChange() {
            this.budgetForm.saemok = '';
        },

        async saveBudget() {
            if (!this.isValidBudgetForm) {
                alert('모든 필드를 입력해주세요.');
                return;
            }

            const data = {
                field: this.selectedPeriod.id,
                hang: this.budgetForm.hang,
                mok: this.budgetForm.mok,
                saemok: this.budgetForm.saemok,
                income_budget: this.budgetForm.income_budget || 0,
                expense_budget: this.budgetForm.expense_budget || 0
            };

            try {
                if (this.budgetModal.data) {
                    await pb.collection('PeriodAndBudget').update(this.budgetModal.data.id, data);
                } else {
                    await pb.collection('PeriodAndBudget').create(data);
                }
                await this.loadBudgets(this.selectedPeriod.id);
                this.closeBudgetModal();
            } catch (error) {
                console.error('Failed to save budget:', error);
                alert('저장에 실패했습니다.');
            }
        },

        async deleteBudget(id) {
            if (!confirm('이 예산 항목을 삭제하시겠습니까?')) return;

            try {
                await pb.collection('PeriodAndBudget').delete(id);
                await this.loadBudgets(this.selectedPeriod.id);
            } catch (error) {
                console.error('Failed to delete budget:', error);
                alert('삭제에 실패했습니다.');
            }
        }
    }
}
</script>

<style scoped>
.tab-root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
}

.none-select {
    user-select: none;
    -webkit-user-select: none;
}

.section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-5);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-sm);
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    flex-wrap: wrap;
}

.section-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.budget-summary {
    margin-left: var(--spacing-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
}

.budget-summary .income-text { color: var(--income-color); }
.budget-summary .expense-text { color: var(--expense-color); }

/* -------------------- 회계기간 -------------------- */
.period-list {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    list-style: none;
}

.period-card {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    background: var(--bg-primary);
    transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.period-card:hover {
    border-color: var(--border-color-strong);
}

/* 고른 기간은 테두리와 바탕 둘 다로 알린다 */
.period-card.active {
    border-color: var(--primary-600);
    background: var(--bg-active);
}

.period-card.closed {
    background: var(--bg-secondary);
}

.period-select {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: var(--spacing-3) var(--spacing-4);
    border: none;
    border-radius: var(--border-radius-lg);
    background: transparent;
    text-align: left;
}

.period-name {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: var(--text-base);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.period-date {
    font-size: var(--text-xs);
    color: var(--text-secondary);
}

.closed-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px var(--spacing-2);
    border-radius: var(--border-radius-full);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
}

.period-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: var(--spacing-2);
}

.closed-notice {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--border-radius-full);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
}

.btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-sm);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.btn-icon:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.btn-icon.danger:hover:not(:disabled) {
    background: var(--danger-50);
    color: var(--danger-600);
}

.btn-icon.closed-toggle {
    color: var(--warning-600);
}

.btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

[data-theme="dark"] .btn-icon.danger:hover:not(:disabled) {
    background: rgb(239 68 68 / 0.16);
    color: var(--danger-300);
}

/* -------------------- 예산 표 -------------------- */
.budget-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.budget-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: var(--text-sm);
}

.budget-table th,
.budget-table td {
    padding: var(--table-cell-padding);
    border-bottom: 1px solid var(--border-color);
    text-align: left;
    vertical-align: middle;
}

.budget-table thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color-strong);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

/*
    항·목 머리줄은 옅은 띠로 나눈다.
    예전에는 항 머리줄을 새까맣게 칠했는데, 표 안에서 가장 센 것이
    정작 읽어야 할 금액이 아니라 분류 이름이 되어 버렸다.
*/
.hang-header-row td {
    padding-top: var(--spacing-4);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color-strong);
    color: var(--text-primary);
    font-size: var(--text-base);
    font-weight: var(--font-weight-bold);
}

.hang-header-cell i,
.mok-header-cell i {
    margin-right: var(--spacing-2);
    color: var(--text-muted);
}

.mok-header-row td {
    padding-left: var(--spacing-6);
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
}

.priority-badge {
    display: inline-block;
    min-width: 26px;
    margin-right: var(--spacing-2);
    padding: 0 var(--spacing-1);
    border-radius: var(--border-radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
    text-align: center;
}

.item-cell {
    padding-left: var(--spacing-10);
}

.item-row:hover td {
    background: var(--bg-secondary);
}

.mok-subtotal-row td,
.hang-subtotal-row td {
    background: var(--bg-secondary);
    font-weight: var(--font-weight-semibold);
}

.mok-subtotal-label {
    padding-left: var(--spacing-6);
    color: var(--text-secondary);
}

.hang-subtotal-label {
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
}

.hang-subtotal-row td {
    border-bottom: 1px solid var(--border-color-strong);
}

.total-row th {
    background: var(--bg-tertiary);
    border-bottom: none;
    color: var(--text-primary);
    font-size: var(--text-base);
    font-weight: var(--font-weight-bold);
}

.budget-amount {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

/* 0원은 알릴 것이 없다 — 색을 빼서 실제 금액만 눈에 걸리게 한다 */
.budget-amount.income { color: var(--income-color); }
.budget-amount.expense { color: var(--expense-color); }
.budget-amount.is-zero { color: var(--text-muted); font-weight: var(--font-weight-normal); }

.action-cell {
    display: flex;
    gap: 2px;
    justify-content: flex-end;
}

.empty-cell {
    padding: var(--spacing-10) var(--spacing-5);
    text-align: center;
    color: var(--text-muted);
}

/* -------------------- 창 안의 입력 -------------------- */
.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin-bottom: var(--spacing-4);
    min-width: 0;
}

.form-group label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.required {
    color: var(--danger-600);
}

.form-group input,
.form-group select {
    width: 100%;
    min-height: 40px;
    padding: 0 var(--spacing-3);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-base);
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .form-group input:focus,
[data-theme="dark"] .form-group select:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.form-group select:disabled {
    background: var(--bg-secondary);
    color: var(--text-muted);
    cursor: not-allowed;
}

.form-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--spacing-3);
}

.budget-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-3);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
}

.budget-input-wrapper:focus-within {
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .budget-input-wrapper:focus-within {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.budget-input-wrapper input {
    flex: 1;
    min-width: 0;
    border: none;
    box-shadow: none;
    padding: 0;
    text-align: right;
}

.budget-input-wrapper input:focus {
    box-shadow: none;
}

.budget-prefix {
    font-weight: var(--font-weight-bold);
}

.budget-input-wrapper.income .budget-prefix { color: var(--income-color); }
.budget-input-wrapper.expense .budget-prefix { color: var(--expense-color); }

.budget-suffix {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}

/* -------------------- 반응형 -------------------- */
@media (max-width: 768px) {
    .section {
        padding: var(--spacing-4);
    }

    .period-list {
        flex-direction: column;
    }

    .period-card {
        width: 100%;
        justify-content: space-between;
    }

    .period-select {
        flex: 1;
    }

    .budget-table {
        min-width: 620px;
    }

    .form-row {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
