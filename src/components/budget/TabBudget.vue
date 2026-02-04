<template>
    <div class="main-content none-select">
        <template v-if="loginStatus">
            <!-- 기간 관리 섹션 -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">회계기간</h2>
                    <button v-if="canEdit" class="btn-add" @click="openPeriodModal(null)">
                        <i class="bi bi-plus-circle"></i> 기간 추가
                    </button>
                </div>

                <div class="period-list">
                    <div
                        v-for="period in sortedPeriods"
                        :key="period.id"
                        :class="['period-card', { active: selectedPeriod?.id === period.id, closed: period.is_closed }]"
                        @click="selectPeriod(period)"
                    >
                        <div class="period-info">
                            <span class="period-name">
                                {{ period.name }}
                                <span v-if="period.is_closed" class="closed-badge">마감</span>
                            </span>
                            <span class="period-date">
                                {{ formatDate(period.start_date) }} ~ {{ formatDate(period.end_date) }}
                            </span>
                        </div>
                        <div class="period-actions" v-if="canEdit">
                            <button
                                :class="['btn-icon', { 'closed-toggle': period.is_closed }]"
                                @click.stop="togglePeriodClose(period)"
                                :title="period.is_closed ? '마감 해제' : '마감 처리'"
                            >
                                <i :class="period.is_closed ? 'bi bi-unlock' : 'bi bi-lock'"></i>
                            </button>
                            <button class="btn-icon" @click.stop="openPeriodModal(period)" title="수정" :disabled="period.is_closed">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn-icon danger" @click.stop="deletePeriod(period.id)" title="삭제" :disabled="period.is_closed">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div v-if="PERIODS.length === 0" class="empty-state">
                        등록된 회계기간이 없습니다.
                    </div>
                </div>
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
                    <button v-if="canEdit && !selectedPeriod.is_closed" class="btn-add" @click="openBudgetModal(null)">
                        <i class="bi bi-plus-circle"></i> 예산 항목 추가
                    </button>
                    <span v-if="selectedPeriod.is_closed" class="closed-notice">
                        <i class="bi bi-lock-fill"></i> 마감된 기간입니다
                    </span>
                </div>

                <div class="budget-table-wrapper">
                    <table class="budget-table hierarchical">
                        <thead>
                            <tr>
                                <th style="width: 46%">분류</th>
                                <th style="width: 17%">수입예산</th>
                                <th style="width: 17%">지출예산</th>
                                <th style="width: 16%" v-if="canEdit && !selectedPeriod.is_closed">관리</th>
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
                                    <td class="budget-amount income">{{ row.income_budget > 0 ? '+' : '' }}{{ formatMoney(row.income_budget) }}원</td>
                                    <td class="budget-amount expense">{{ row.expense_budget > 0 ? '-' : '' }}{{ formatMoney(row.expense_budget) }}원</td>
                                    <td v-if="canEdit && !selectedPeriod.is_closed" class="action-cell">
                                        <button class="btn-icon" @click="openBudgetModal(row)" title="수정">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn-icon danger" @click="deleteBudget(row.id)" title="삭제">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                                <!-- 목 소계 -->
                                <tr v-else-if="row.type === 'mok-subtotal'" class="mok-subtotal-row">
                                    <td class="subtotal-label mok-subtotal-label">{{ row.mokLabel }} 소계</td>
                                    <td class="budget-amount income subtotal-amount">{{ row.incomeSum > 0 ? '+' : '' }}{{ formatMoney(row.incomeSum) }}원</td>
                                    <td class="budget-amount expense subtotal-amount">{{ row.expenseSum > 0 ? '-' : '' }}{{ formatMoney(row.expenseSum) }}원</td>
                                    <td v-if="canEdit && !selectedPeriod.is_closed"></td>
                                </tr>
                                <!-- 항 소계 -->
                                <tr v-else-if="row.type === 'hang-subtotal'" class="hang-subtotal-row">
                                    <td class="subtotal-label hang-subtotal-label">{{ row.hangLabel }} 합계</td>
                                    <td class="budget-amount income subtotal-amount hang-subtotal-amount">{{ row.incomeSum > 0 ? '+' : '' }}{{ formatMoney(row.incomeSum) }}원</td>
                                    <td class="budget-amount expense subtotal-amount hang-subtotal-amount">{{ row.expenseSum > 0 ? '-' : '' }}{{ formatMoney(row.expenseSum) }}원</td>
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
                                <th class="budget-amount income">+{{ formatMoney(totalIncomeBudget) }}원</th>
                                <th class="budget-amount expense">-{{ formatMoney(totalExpenseBudget) }}원</th>
                                <th v-if="canEdit && !selectedPeriod.is_closed"></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div v-else class="empty-state-large">
                <i class="bi bi-calendar3"></i>
                <p>회계기간을 선택하세요</p>
            </div>
        </template>

        <template v-else>
            <div class="content disable"></div>
        </template>

        <!-- 기간 모달 -->
        <div class="modal-overlay" v-if="periodModal.isOpen" @click.self="closePeriodModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>{{ periodModal.data ? '기간 수정' : '기간 추가' }}</h3>
                    <button class="close-btn" @click="closePeriodModal"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>기간 이름</label>
                        <input type="text" v-model="periodForm.name" placeholder="예: 2025년 1분기" />
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>시작일</label>
                            <input type="date" v-model="periodForm.start_date" />
                        </div>
                        <div class="form-group">
                            <label>종료일</label>
                            <input type="date" v-model="periodForm.end_date" />
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" @click="closePeriodModal">취소</button>
                    <button class="btn-primary" @click="savePeriod">저장</button>
                </div>
            </div>
        </div>

        <!-- 예산 항목 모달 -->
        <div class="modal-overlay" v-if="budgetModal.isOpen" @click.self="closeBudgetModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>{{ budgetModal.data ? '예산 항목 수정' : '예산 항목 추가' }}</h3>
                    <button class="close-btn" @click="closeBudgetModal"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>항 <span class="required">*</span></label>
                        <select v-model="budgetForm.hang" @change="onHangChange">
                            <option value="">선택하세요</option>
                            <option v-for="hang in ASSETS_HANG" :key="hang.id" :value="hang.id">
                                {{ hang.label }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>목 <span class="required">*</span></label>
                        <select v-model="budgetForm.mok" @change="onMokChange" :disabled="!budgetForm.hang">
                            <option value="">선택하세요</option>
                            <option v-for="mok in filteredMoks" :key="mok.id" :value="mok.id">
                                {{ mok.label }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>세목 <span class="required">*</span></label>
                        <select v-model="budgetForm.saemok" :disabled="!budgetForm.mok">
                            <option value="">선택하세요</option>
                            <option v-for="saemok in filteredSaemoks" :key="saemok.id" :value="saemok.id">
                                {{ saemok.label }}
                            </option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>수입예산 <span class="income-label">(+)</span></label>
                            <div class="budget-input-wrapper income">
                                <span class="budget-prefix">+</span>
                                <input
                                    type="text"
                                    :value="formatInputValue(budgetForm.income_budget)"
                                    @input="budgetForm.income_budget = parseInputValue($event.target.value)"
                                    placeholder="0"
                                />
                                <span class="budget-suffix">원</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>지출예산 <span class="expense-label">(-)</span></label>
                            <div class="budget-input-wrapper expense">
                                <span class="budget-prefix">-</span>
                                <input
                                    type="text"
                                    :value="formatInputValue(budgetForm.expense_budget)"
                                    @input="budgetForm.expense_budget = parseInputValue($event.target.value)"
                                    placeholder="0"
                                />
                                <span class="budget-suffix">원</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" @click="closeBudgetModal">취소</button>
                    <button class="btn-primary" @click="saveBudget" :disabled="!isValidBudgetForm">저장</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

export default {
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
.main-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3xl);
    margin-bottom: 50px;
}

.none-select {
    user-select: none;
    -webkit-user-select: none;
}

/* 섹션 */
.section {
    background: var(--none-color);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xl);
    box-shadow: var(--shadow-md);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
}

.section-title {
    font-size: 1.1em;
    font-weight: var(--font-weight-bold);
    color: var(--strong-color);
    margin: 0;
}

.budget-summary {
    font-weight: var(--font-weight-medium);
    color: var(--medium-color);
    font-size: 0.9em;
}

.budget-summary .income-text {
    color: var(--income-color, #2563eb);
}

.budget-summary .expense-text {
    color: var(--expense-color, #dc2626);
}

/* 기간 목록 */
.period-list {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.period-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--light-color);
    border: 2px solid transparent;
    border-radius: var(--border-radius-lg);
    cursor: pointer;
    transition: all var(--transition-normal);
}

.period-card:hover {
    border-color: var(--medium-color);
}

.period-card.active {
    border-color: var(--strong-color);
    background: rgba(51, 122, 183, 0.1);
}

.period-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.period-name {
    font-weight: var(--font-weight-semibold);
    color: var(--strong-color);
}

.period-date {
    font-size: 0.8em;
    color: var(--medium-color);
}

.period-actions {
    display: flex;
    gap: var(--spacing-xs);
}

.period-card.closed {
    opacity: 0.7;
    background: var(--bg-tertiary);
}

.period-card.closed.active {
    opacity: 1;
}

.closed-badge {
    display: inline-block;
    padding: 2px 6px;
    margin-left: 6px;
    font-size: 0.7em;
    font-weight: var(--font-weight-bold);
    background: var(--danger-color);
    color: white;
    border-radius: var(--border-radius-sm);
    vertical-align: middle;
}

.closed-notice {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--danger-50);
    color: var(--danger-600);
    border-radius: var(--border-radius-md);
    font-size: 0.9em;
    font-weight: var(--font-weight-semibold);
}

.btn-icon.closed-toggle {
    background: var(--success-100);
    color: var(--success-600);
}

.btn-icon.closed-toggle:hover {
    background: var(--success-500);
    color: white;
}

.btn-icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.btn-icon:disabled:hover {
    background: var(--light-color);
    color: var(--strong-color);
}

/* 예산 테이블 */
.budget-table-wrapper {
    overflow-x: auto;
}

.budget-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
}

.budget-table th,
.budget-table td {
    padding: var(--spacing-md);
    text-align: left;
    border: 1px solid var(--light-color);
}

/* 계층적 테이블 스타일 */
.budget-table.hierarchical {
    border-collapse: separate;
    border-spacing: 0;
}

/* 항 헤더 */
.hang-header-row td {
    background: var(--strong-color);
    color: white;
    font-weight: var(--font-weight-bold);
    font-size: 0.95em;
    padding: var(--spacing-md) var(--spacing-lg) !important;
    border: none !important;
    border-bottom: 2px solid var(--strong-color) !important;
}

.hang-header-cell i {
    margin-right: var(--spacing-xs);
    opacity: 0.8;
}

.priority-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    margin-right: var(--spacing-sm);
    background: rgba(255, 255, 255, 0.25);
    border-radius: var(--border-radius-sm);
    font-size: 0.8em;
    font-weight: var(--font-weight-bold);
}

.priority-badge.mok {
    background: rgba(51, 122, 183, 0.15);
    color: var(--strong-color);
    font-size: 0.75em;
    min-width: 20px;
    height: 20px;
}

/* 목 헤더 */
.mok-header-row td {
    background: var(--light-color);
    font-weight: var(--font-weight-semibold);
    font-size: 0.9em;
    padding: var(--spacing-sm) var(--spacing-lg) !important;
    padding-left: calc(var(--spacing-lg) + 1rem) !important;
    color: var(--strong-color);
    border-left: 3px solid var(--medium-color) !important;
}

.mok-header-cell i {
    margin-right: var(--spacing-xs);
    opacity: 0.6;
    font-size: 0.9em;
}

/* 세목 항목 */
.item-row td {
    background: var(--none-color);
}

.item-cell {
    padding-left: calc(var(--spacing-lg) + 2rem) !important;
    font-size: 0.9em;
}

/* 목 소계 */
.mok-subtotal-row td {
    background: rgba(100, 116, 139, 0.08);
    border-top: 1px dashed var(--medium-color) !important;
}

.mok-subtotal-label {
    padding-left: calc(var(--spacing-lg) + 1rem) !important;
    font-size: 0.85em;
    font-weight: var(--font-weight-semibold);
    color: var(--medium-color);
    font-style: italic;
}

.subtotal-amount {
    font-size: 0.9em;
}

/* 항 소계 */
.hang-subtotal-row td {
    background: rgba(51, 122, 183, 0.1);
    border-top: 2px solid var(--strong-color) !important;
    border-bottom: 2px solid var(--strong-color) !important;
}

.hang-subtotal-label {
    font-weight: var(--font-weight-bold);
    color: var(--strong-color);
    font-size: 0.95em;
}

.hang-subtotal-amount {
    font-weight: var(--font-weight-bold) !important;
    font-size: 0.95em !important;
}

/* 총합계 */
.total-row th {
    background: var(--strong-color) !important;
    color: white !important;
    font-weight: var(--font-weight-bold);
    font-size: 1em;
}

.total-row .income {
    color: #93c5fd !important;
}

.total-row .expense {
    color: #fca5a5 !important;
}

.budget-table thead th {
    background: var(--light-color);
    font-weight: var(--font-weight-semibold);
    color: var(--strong-color);
}

.budget-table tfoot th {
    background: var(--light-color);
    font-weight: var(--font-weight-bold);
}

.budget-amount {
    text-align: right;
    font-weight: var(--font-weight-semibold);
    color: var(--strong-color);
}

.budget-amount.income {
    color: var(--income-color, #2563eb);
}

.budget-amount.expense {
    color: var(--expense-color, #dc2626);
}

.action-cell {
    display: flex;
    gap: var(--spacing-xs);
}

.empty-cell {
    text-align: center;
    color: var(--medium-color);
    padding: 30px !important;
}

/* 버튼 */
.btn-add {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--strong-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background var(--transition-normal);
}

.btn-add:hover {
    background: #2b6aa0;
}

.btn-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--light-color);
    border: none;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    color: var(--strong-color);
    transition: all var(--transition-normal);
}

.btn-icon:hover {
    background: var(--medium-color);
    color: white;
}

.btn-icon.danger:hover {
    background: var(--danger-color);
}

/* 모달 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal-content {
    width: 90%;
    max-width: 450px;
    background: white;
    border-radius: var(--border-radius-2xl);
    box-shadow: var(--shadow-xl);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg) var(--spacing-xl);
    border-bottom: 1px solid var(--light-color);
}

.modal-header h3 {
    margin: 0;
    font-size: 1.1em;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    color: var(--medium-color);
    transition: color var(--transition-fast);
}

.close-btn:hover {
    color: var(--strong-color);
}

.modal-body {
    padding: var(--spacing-xl);
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg) var(--spacing-xl);
    border-top: 1px solid var(--light-color);
}

/* 폼 */
.form-group {
    margin-bottom: var(--spacing-lg);
}

.form-group label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: var(--font-weight-semibold);
    font-size: 0.9em;
    color: var(--strong-color);
}

.form-group input,
.form-group select {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--medium-color);
    border-radius: var(--border-radius-md);
    font-size: 0.95em;
    box-sizing: border-box;
    transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--strong-color);
}

.form-row {
    display: flex;
    gap: var(--spacing-lg);
}

.form-row .form-group {
    flex: 1;
}

.required {
    color: var(--danger-color);
}

.income-label {
    color: var(--income-color, #2563eb);
    font-weight: var(--font-weight-bold);
}

.expense-label {
    color: var(--expense-color, #dc2626);
    font-weight: var(--font-weight-bold);
}

.budget-input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid var(--medium-color);
    border-radius: var(--border-radius-md);
    overflow: hidden;
    transition: border-color var(--transition-fast);
}

.budget-input-wrapper:focus-within {
    border-color: var(--strong-color);
}

.budget-input-wrapper.income:focus-within {
    border-color: var(--income-color, #2563eb);
}

.budget-input-wrapper.expense:focus-within {
    border-color: var(--expense-color, #dc2626);
}

.budget-input-wrapper .budget-prefix {
    padding: var(--spacing-sm) var(--spacing-md);
    font-weight: var(--font-weight-bold);
    font-size: 1.1em;
    background: var(--light-color);
}

.budget-input-wrapper.income .budget-prefix {
    color: var(--income-color, #2563eb);
}

.budget-input-wrapper.expense .budget-prefix {
    color: var(--expense-color, #dc2626);
}

.budget-input-wrapper input {
    flex: 1;
    border: none !important;
    border-radius: 0 !important;
    text-align: right;
    font-size: 1em;
    font-weight: var(--font-weight-semibold);
}

.budget-input-wrapper input:focus {
    outline: none;
}

.budget-input-wrapper .budget-suffix {
    padding: var(--spacing-sm) var(--spacing-md);
    color: var(--medium-color);
    font-size: 0.9em;
}

.btn-primary {
    padding: var(--spacing-sm) var(--spacing-xl);
    background: var(--strong-color);
    color: white;
    border: none;
    border-radius: var(--border-radius-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background var(--transition-normal);
}

.btn-primary:hover {
    background: #2b6aa0;
}

.btn-primary:disabled {
    background: var(--medium-color);
    cursor: not-allowed;
}

.btn-secondary {
    padding: var(--spacing-sm) var(--spacing-xl);
    background: var(--light-color);
    color: var(--strong-color);
    border: none;
    border-radius: var(--border-radius-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-normal);
}

.btn-secondary:hover {
    background: var(--medium-color);
    color: white;
}

/* 빈 상태 */
.empty-state {
    text-align: center;
    color: var(--medium-color);
    padding: var(--spacing-xl);
    font-size: 0.95em;
}

.empty-state-large {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px var(--spacing-xl);
    color: var(--medium-color);
}

.empty-state-large i {
    font-size: 3em;
    margin-bottom: var(--spacing-lg);
}

.content.disable {
    width: 100%;
    min-height: 400px;
    background-color: var(--none-color);
    box-shadow: var(--shadow-sm);
    border-radius: var(--border-radius-sm);
}

/* ============================================
   📱 모바일 반응형 스타일
   ============================================ */

@media (max-width: 768px) {
    .main-content {
        gap: var(--spacing-xl);
    }

    .section {
        padding: var(--spacing-lg);
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-md);
    }

    .section-title {
        font-size: 1em;
    }

    .budget-summary {
        display: block;
        margin-top: var(--spacing-xs);
    }

    .period-list {
        flex-direction: column;
    }

    .period-card {
        width: 100%;
        justify-content: space-between;
    }

    .budget-table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .budget-table {
        min-width: 480px;
    }

    .modal-content {
        max-width: 95%;
        max-height: 90vh;
        overflow-y: auto;
    }

    .form-row {
        flex-direction: column;
        gap: 0;
    }
}

@media (max-width: 480px) {
    .section {
        padding: var(--spacing-md);
    }

    .btn-add {
        width: 100%;
        justify-content: center;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
        padding: var(--spacing-md);
    }
}

/* ============================================
   🌙 다크모드 스타일
   ============================================ */

[data-theme="dark"] .section {
    background: var(--bg-primary);
    box-shadow: var(--shadow-md);
}

[data-theme="dark"] .section-title {
    color: var(--text-primary);
}

[data-theme="dark"] .budget-summary {
    color: var(--text-secondary);
}

[data-theme="dark"] .budget-summary .income-text {
    color: var(--income-color, #60a5fa);
}

[data-theme="dark"] .budget-summary .expense-text {
    color: var(--expense-color, #f87171);
}

[data-theme="dark"] .period-card {
    background: var(--bg-secondary);
    border-color: transparent;
}

[data-theme="dark"] .period-card:hover {
    border-color: var(--border-color-strong);
}

[data-theme="dark"] .period-card.active {
    border-color: var(--primary-500);
    background: var(--primary-900);
}

[data-theme="dark"] .period-name {
    color: var(--text-primary);
}

[data-theme="dark"] .period-date {
    color: var(--text-secondary);
}

[data-theme="dark"] .budget-table th,
[data-theme="dark"] .budget-table td {
    border-color: var(--border-color);
}

[data-theme="dark"] .budget-table thead th {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

/* 다크모드 계층적 테이블 스타일 */
[data-theme="dark"] .hang-header-row td {
    background: var(--primary-700);
    color: white;
    border-bottom-color: var(--primary-600) !important;
}

[data-theme="dark"] .priority-badge {
    background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .priority-badge.mok {
    background: rgba(96, 165, 250, 0.2);
    color: var(--primary-300);
}

[data-theme="dark"] .mok-header-row td {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-left-color: var(--primary-500) !important;
}

[data-theme="dark"] .item-row td {
    background: var(--bg-primary);
}

[data-theme="dark"] .mok-subtotal-row td {
    background: rgba(100, 116, 139, 0.15);
    border-top-color: var(--border-color) !important;
}

[data-theme="dark"] .mok-subtotal-label {
    color: var(--text-secondary);
}

[data-theme="dark"] .hang-subtotal-row td {
    background: rgba(59, 130, 246, 0.15);
    border-top-color: var(--primary-500) !important;
    border-bottom-color: var(--primary-500) !important;
}

[data-theme="dark"] .hang-subtotal-label {
    color: var(--primary-400);
}

[data-theme="dark"] .total-row th {
    background: var(--primary-700) !important;
    color: white !important;
}

[data-theme="dark"] .total-row .income {
    color: #93c5fd !important;
}

[data-theme="dark"] .total-row .expense {
    color: #fca5a5 !important;
}

[data-theme="dark"] .budget-amount {
    color: var(--text-primary);
}

[data-theme="dark"] .budget-amount.income {
    color: var(--income-color, #60a5fa);
}

[data-theme="dark"] .budget-amount.expense {
    color: var(--expense-color, #f87171);
}

[data-theme="dark"] .budget-input-wrapper {
    border-color: var(--border-color);
}

[data-theme="dark"] .budget-input-wrapper:focus-within {
    border-color: var(--primary-500);
}

[data-theme="dark"] .budget-input-wrapper.income:focus-within {
    border-color: var(--income-color, #60a5fa);
}

[data-theme="dark"] .budget-input-wrapper.expense:focus-within {
    border-color: var(--expense-color, #f87171);
}

[data-theme="dark"] .budget-input-wrapper .budget-prefix {
    background: var(--bg-tertiary);
}

[data-theme="dark"] .budget-input-wrapper.income .budget-prefix {
    color: var(--income-color, #60a5fa);
}

[data-theme="dark"] .budget-input-wrapper.expense .budget-prefix {
    color: var(--expense-color, #f87171);
}

[data-theme="dark"] .budget-input-wrapper input {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

[data-theme="dark"] .budget-input-wrapper .budget-suffix {
    color: var(--text-secondary);
}

[data-theme="dark"] .income-label {
    color: var(--income-color, #60a5fa);
}

[data-theme="dark"] .expense-label {
    color: var(--expense-color, #f87171);
}

[data-theme="dark"] .btn-add {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
}

[data-theme="dark"] .btn-add:hover {
    background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
}

[data-theme="dark"] .btn-icon {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

[data-theme="dark"] .btn-icon:hover {
    background: var(--primary-600);
}

[data-theme="dark"] .modal-overlay {
    background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .modal-content {
    background: var(--bg-primary);
    color: var(--text-primary);
}

[data-theme="dark"] .modal-header {
    border-bottom-color: var(--border-color);
}

[data-theme="dark"] .modal-footer {
    border-top-color: var(--border-color);
}

[data-theme="dark"] .close-btn {
    color: var(--text-secondary);
}

[data-theme="dark"] .close-btn:hover {
    color: var(--text-primary);
}

[data-theme="dark"] .form-group label {
    color: var(--text-primary);
}

[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group select {
    background: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

[data-theme="dark"] .form-group input:focus,
[data-theme="dark"] .form-group select:focus {
    border-color: var(--primary-500);
}

[data-theme="dark"] .btn-primary {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
}

[data-theme="dark"] .btn-primary:hover {
    background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
}

[data-theme="dark"] .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

[data-theme="dark"] .btn-secondary:hover {
    background: var(--bg-hover);
}

[data-theme="dark"] .empty-state,
[data-theme="dark"] .empty-state-large,
[data-theme="dark"] .empty-cell {
    color: var(--text-secondary);
}

[data-theme="dark"] .content.disable {
    background: var(--bg-primary);
}

[data-theme="dark"] .period-card.closed {
    background: var(--bg-tertiary);
    opacity: 0.6;
}

[data-theme="dark"] .period-card.closed.active {
    opacity: 1;
}

[data-theme="dark"] .closed-badge {
    background: var(--danger-500);
}

[data-theme="dark"] .closed-notice {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger-400);
}

[data-theme="dark"] .btn-icon.closed-toggle {
    background: rgba(34, 197, 94, 0.2);
    color: var(--success-400);
}

[data-theme="dark"] .btn-icon.closed-toggle:hover {
    background: var(--success-600);
    color: white;
}

[data-theme="dark"] .btn-icon:disabled {
    opacity: 0.3;
}

[data-theme="dark"] .btn-icon:disabled:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}
</style>
