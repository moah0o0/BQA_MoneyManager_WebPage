<template>
    <div class="tab-root none-select">
        <template v-if="loginStatus">
            <div class="page-head">
                <div>
                    <h1 class="page-title">예산</h1>
                    <p class="page-desc">
                        회계기간을 고르고, 과목을 짜면서 그 자리에서 금액을 적습니다.
                        과목은 모든 기간이 함께 씁니다.
                    </p>
                </div>
            </div>

            <!-- ========== 회계기간 ========== -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">회계기간</h2>
                    <button v-if="canEdit" type="button" class="btn btn-primary btn-sm" @click="openPeriodModal(null)">
                        <i class="bi bi-plus-lg" aria-hidden="true"></i> 기간 추가
                    </button>
                </div>

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

            <!-- ========== 과목 · 예산 ==========
                 예전에는 과목을 계정과목 탭에서 따로 만든 뒤,
                 여기서 창을 띄워 항→목→세목을 다시 골라야 예산 한 줄이 들어갔다.
                 이제 이 표가 곧 과목표다 — 만들고, 이름 고치고, 금액을 바로 적는다.
            -->
            <div class="section" v-if="selectedPeriod">
                <div class="section-header">
                    <h2 class="section-title">
                        {{ selectedPeriod.name }} 예산
                        <span class="budget-summary">
                            (<span class="income-text num">수입 +{{ formatMoney(totalIncomeBudget) }}원</span>
                            / <span class="expense-text num">지출 −{{ formatMoney(totalExpenseBudget) }}원</span>)
                        </span>
                    </h2>

                    <div class="section-acts">
                        <button
                            type="button"
                            class="chip"
                            :class="{ on: onlyWithBudget }"
                            :aria-pressed="onlyWithBudget ? 'true' : 'false'"
                            @click="onlyWithBudget = !onlyWithBudget"
                        >
                            <i class="bi bi-funnel" aria-hidden="true"></i> 예산 잡힌 과목만
                        </button>
                        <span v-if="selectedPeriod.is_closed" class="closed-notice">
                            <i class="bi bi-lock-fill" aria-hidden="true"></i> 마감된 기간입니다
                        </span>
                    </div>
                </div>

                <p v-if="statusMessage" class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
                <p v-if="errorMessage" class="notice notice-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                    <span>{{ errorMessage }}</span>
                </p>

                <div class="budget-table-wrapper">
                    <table class="budget-table">
                        <caption class="sr-only">
                            {{ selectedPeriod.name }}의 과목과 예산.
                            과목 이름을 눌러 고치고, 금액 칸에 바로 적습니다.
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col" class="c-name">과목</th>
                                <th scope="col" class="budget-amount">수입예산</th>
                                <th scope="col" class="budget-amount">지출예산</th>
                                <th scope="col" class="c-act" v-if="editable">
                                    <span class="sr-only">관리</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-for="row in budgetTree" :key="row.key">
                                <!-- ── 항 ── -->
                                <tr v-if="row.type === 'hang'" class="row-hang">
                                    <td class="c-name">
                                        <span class="priority-badge num">{{ zeroPad(row.node.priority, 2) }}</span>
                                        <InlineEditor
                                            v-if="editable"
                                            :value="row.node.label"
                                            class="name-hang"
                                            @change="renameAsset('AssetsHang', row.node, $event)"
                                        />
                                        <span v-else class="name-hang">{{ row.node.label }}</span>
                                    </td>
                                    <td class="budget-amount num" :class="{ 'is-zero': !row.income }">{{ row.income ? '+' : '' }}{{ formatMoney(row.income) }}</td>
                                    <td class="budget-amount num" :class="{ 'is-zero': !row.expense }">{{ row.expense ? '−' : '' }}{{ formatMoney(row.expense) }}</td>
                                    <td class="c-act" v-if="editable">
                                        <button type="button" class="btn-icon danger" :aria-label="`${row.node.label} 항 지우기`"
                                                title="항 지우기" @click="deleteAsset('AssetsHang', row.node)">
                                            <i class="bi bi-trash" aria-hidden="true"></i>
                                        </button>
                                    </td>
                                </tr>

                                <!-- ── 목 ── -->
                                <tr v-else-if="row.type === 'mok'" class="row-mok">
                                    <td class="c-name">
                                        <span class="indent" aria-hidden="true"></span>
                                        <span class="priority-badge num">{{ zeroPad(row.node.priority, 3) }}</span>
                                        <InlineEditor
                                            v-if="editable"
                                            :value="row.node.label"
                                            class="name-mok"
                                            @change="renameAsset('AssetsMok', row.node, $event)"
                                        />
                                        <span v-else class="name-mok">{{ row.node.label }}</span>
                                    </td>
                                    <td class="budget-amount num" :class="{ 'is-zero': !row.income }">{{ row.income ? '+' : '' }}{{ formatMoney(row.income) }}</td>
                                    <td class="budget-amount num" :class="{ 'is-zero': !row.expense }">{{ row.expense ? '−' : '' }}{{ formatMoney(row.expense) }}</td>
                                    <td class="c-act" v-if="editable">
                                        <button type="button" class="btn-icon danger" :aria-label="`${row.node.label} 목 지우기`"
                                                title="목 지우기" @click="deleteAsset('AssetsMok', row.node)">
                                            <i class="bi bi-trash" aria-hidden="true"></i>
                                        </button>
                                    </td>
                                </tr>

                                <!-- ── 세목 + 금액 ── -->
                                <tr v-else-if="row.type === 'item'" class="row-item">
                                    <td class="c-name">
                                        <span class="indent double" aria-hidden="true"></span>
                                        <span class="priority-badge num">{{ zeroPad(getPriority('saemok', row.budget.saemok), 4) }}</span>
                                        <span class="name-saemok">{{ getAssetLabel('saemok', row.budget.saemok) }}</span>
                                    </td>
                                    <td class="budget-amount">
                                        <!-- 금액은 칸에서 바로 적는다. 창을 띄우지 않는다 -->
                                        <input
                                            v-if="editable"
                                            type="text"
                                            inputmode="numeric"
                                            class="amt num income"
                                            :data-amt="`${row.budget.id}-income`"
                                            :value="amtValue(row.budget.income_budget)"
                                            :aria-label="`${getAssetLabel('saemok', row.budget.saemok)} 수입예산`"
                                            placeholder="0"
                                            @focus="$event.target.select()"
                                            @keydown.enter.prevent="$event.target.blur()"
                                            @blur="setAmount(row.budget, 'income_budget', $event.target.value)"
                                        >
                                        <span v-else class="num" :class="{ 'is-zero': !row.budget.income_budget }">{{ formatMoney(row.budget.income_budget) }}</span>
                                    </td>
                                    <td class="budget-amount">
                                        <input
                                            v-if="editable"
                                            type="text"
                                            inputmode="numeric"
                                            class="amt num expense"
                                            :data-amt="`${row.budget.id}-expense`"
                                            :value="amtValue(row.budget.expense_budget)"
                                            :aria-label="`${getAssetLabel('saemok', row.budget.saemok)} 지출예산`"
                                            placeholder="0"
                                            @focus="$event.target.select()"
                                            @keydown.enter.prevent="$event.target.blur()"
                                            @blur="setAmount(row.budget, 'expense_budget', $event.target.value)"
                                        >
                                        <span v-else class="num" :class="{ 'is-zero': !row.budget.expense_budget }">{{ formatMoney(row.budget.expense_budget) }}</span>
                                    </td>
                                    <td class="c-act" v-if="editable">
                                        <button type="button" class="btn-icon danger"
                                                :aria-label="`${getAssetLabel('saemok', row.budget.saemok)} 예산 줄 지우기`"
                                                title="이 줄 지우기" @click="deleteBudget(row.budget.id)">
                                            <i class="bi bi-trash" aria-hidden="true"></i>
                                        </button>
                                    </td>
                                </tr>

                                <!-- ── 세목 더하기 ── -->
                                <tr v-else-if="row.type === 'add-saemok'" class="row-add">
                                    <td :colspan="editable ? 4 : 3">
                                        <span class="indent double" aria-hidden="true"></span>
                                        <label class="sr-only" :for="`add-saemok-${row.mokId}`">세목 더하기</label>
                                        <select
                                            :id="`add-saemok-${row.mokId}`"
                                            class="add-select"
                                            :disabled="row.options.length === 0"
                                            @change="addSaemokRow(row, $event)"
                                        >
                                            <option value="">
                                                {{ row.options.length ? '+ 세목 더하기' : '더할 세목이 없습니다' }}
                                            </option>
                                            <option v-for="s in row.options" :key="s.id" :value="s.id">
                                                {{ zeroPad(s.priority, 4) }} {{ s.label }}
                                            </option>
                                        </select>
                                    </td>
                                </tr>

                                <!-- ── 목 더하기 ── -->
                                <tr v-else-if="row.type === 'add-mok'" class="row-add">
                                    <td :colspan="editable ? 4 : 3">
                                        <span class="indent" aria-hidden="true"></span>
                                        <button type="button" class="add-btn" @click="createAsset('AssetsMok', row.hangId)">
                                            <i class="bi bi-plus-lg" aria-hidden="true"></i> 목 더하기
                                        </button>
                                    </td>
                                </tr>

                                <!-- ── 항 더하기 ── -->
                                <tr v-else-if="row.type === 'add-hang'" class="row-add row-add-hang">
                                    <td :colspan="editable ? 4 : 3">
                                        <button type="button" class="add-btn" @click="createAsset('AssetsHang', null)">
                                            <i class="bi bi-plus-lg" aria-hidden="true"></i> 항 더하기
                                        </button>
                                    </td>
                                </tr>
                            </template>

                            <tr v-if="budgetTree.length === 0">
                                <td :colspan="editable ? 4 : 3" class="empty-cell">
                                    {{ onlyWithBudget
                                        ? '예산이 잡힌 과목이 없습니다.'
                                        : '아직 과목이 없습니다. 항부터 하나 더해 주세요.' }}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot v-if="BUDGETS.length > 0">
                            <tr class="total-row">
                                <th scope="row">총 합계</th>
                                <th class="budget-amount num">+{{ formatMoney(totalIncomeBudget) }}</th>
                                <th class="budget-amount num">−{{ formatMoney(totalExpenseBudget) }}</th>
                                <td v-if="editable"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <p class="hint">
                    <i class="bi bi-info-circle" aria-hidden="true"></i>
                    과목 이름을 누르면 그 자리에서 고칩니다. 금액은 칸에 바로 적으면 저장됩니다.
                    세목을 새로 만들거나 목마다 쓸 세목을 정하려면
                    <strong>계정과목</strong> 탭을 쓰세요.
                </p>
            </div>

            <div v-else class="empty-state">
                <i class="bi bi-calendar3" aria-hidden="true"></i>
                <p>위에서 회계기간을 하나 고르면 그 기간의 예산이 보입니다.</p>
            </div>
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
    </div>
</template>

<script>
import PocketBase from 'pocketbase';
import AppModal from '../layout/AppModal.vue';
import InlineEditor from '../assets/InlineEditor.vue';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

/** 과목 갈래별 옷걸이 — 컬렉션 이름, 사람이 부르는 이름, 번호 자릿수 */
const ASSET_KINDS = {
    AssetsHang: { label: '항', pad: 2, listKey: 'ASSETS_HANG' },
    AssetsMok: { label: '목', pad: 3, listKey: 'ASSETS_MOK' },
    AssetsSaemok: { label: '세목', pad: 4, listKey: 'ASSETS_SAEMOK' },
};

export default {
    components: { AppModal, InlineEditor },

    props: ['loginStatus', 'canEdit'],

    data() {
        return {
            PERIODS: [],
            BUDGETS: [],
            ASSETS_HANG: [],
            ASSETS_MOK: [],
            ASSETS_SAEMOK: [],

            selectedPeriod: null,

            /** 예산이 잡힌 과목만 볼지. 과목이 많은 단체에서 화면이 길어지는 것을 막는다 */
            onlyWithBudget: false,
            statusMessage: '',
            errorMessage: '',

            periodModal: { isOpen: false, data: null },

            periodForm: {
                name: '',
                start_date: '',
                end_date: ''
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

        /** 마감된 기간이거나 권한이 없으면 아무것도 못 고친다 */
        editable() {
            return !!this.canEdit && !this.selectedPeriod?.is_closed
        },

        /**
         * 이 표가 곧 과목표다.
         * 예산이 잡힌 줄만 보여 주면 "무엇을 아직 안 잡았는지"가 화면에 없다 —
         * 그래서 과목 전체를 펴 놓고, 예산은 그 위에 얹는다.
         */
        budgetTree() {
            const rows = []
            const byMok = new Map()
            for (const b of this.BUDGETS) {
                if (!byMok.has(b.mok)) byMok.set(b.mok, [])
                byMok.get(b.mok).push(b)
            }

            const hangs = [...this.ASSETS_HANG].sort((a, b) => a.priority - b.priority)

            for (const hang of hangs) {
                const moks = this.ASSETS_MOK
                    .filter(m => this.parentHangId(m) === hang.id)
                    .sort((a, b) => a.priority - b.priority)

                const mokBlocks = []
                let hangIncome = 0
                let hangExpense = 0

                for (const mok of moks) {
                    const items = (byMok.get(mok.id) ?? [])
                        .sort((a, b) => this.getPriority('saemok', a.saemok) - this.getPriority('saemok', b.saemok))

                    const income = items.reduce((t, b) => t + (b.income_budget || 0), 0)
                    const expense = items.reduce((t, b) => t + (b.expense_budget || 0), 0)

                    if (this.onlyWithBudget && items.length === 0) continue

                    hangIncome += income
                    hangExpense += expense
                    mokBlocks.push({ mok, items, income, expense })
                }

                if (this.onlyWithBudget && mokBlocks.length === 0) continue

                rows.push({ key: `h-${hang.id}`, type: 'hang', node: hang, income: hangIncome, expense: hangExpense })

                for (const block of mokBlocks) {
                    rows.push({
                        key: `m-${block.mok.id}`, type: 'mok', node: block.mok,
                        hangId: hang.id, income: block.income, expense: block.expense,
                    })

                    for (const b of block.items) {
                        rows.push({ key: `b-${b.id}`, type: 'item', budget: b, mokId: block.mok.id, hangId: hang.id })
                    }

                    if (this.editable && !this.onlyWithBudget) {
                        rows.push({
                            key: `as-${block.mok.id}`, type: 'add-saemok',
                            mokId: block.mok.id, hangId: hang.id,
                            options: this.availableSaemoks(block.mok, block.items),
                        })
                    }
                }

                if (this.editable && !this.onlyWithBudget) {
                    rows.push({ key: `am-${hang.id}`, type: 'add-mok', hangId: hang.id })
                }
            }

            if (this.editable && !this.onlyWithBudget) {
                rows.push({ key: 'ah', type: 'add-hang' })
            }

            return rows
        },

        totalIncomeBudget() {
            return this.BUDGETS.reduce((sum, b) => sum + (b.income_budget || 0), 0);
        },

        totalExpenseBudget() {
            return this.BUDGETS.reduce((sum, b) => sum + (b.expense_budget || 0), 0);
        },

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

        // ---------- 알림 ----------
        showStatus(message) {
            this.statusMessage = message
            clearTimeout(this._statusTimer)
            this._statusTimer = setTimeout(() => (this.statusMessage = ''), 3000)
        },

        showError(message) {
            this.errorMessage = message
            clearTimeout(this._errorTimer)
            this._errorTimer = setTimeout(() => (this.errorMessage = ''), 6000)
        },

        /** 0은 빈칸으로 둔다 — 알릴 것이 없는 숫자가 색까지 입고 있으면 진짜 금액이 묻힌다 */
        amtValue(n) {
            return n ? n.toLocaleString() : ''
        },

        zeroPad(number, desiredLength) {
            return String(number ?? 0).padStart(desiredLength, '0')
        },

        /** expand를 붙였을 때와 안 붙였을 때가 달라서 한곳에서 풀어 준다 */
        parentHangId(mok) {
            return mok?.parent_hang?.id ?? mok?.parent_hang ?? null
        },

        /**
         * 이 목에 아직 안 쓴 세목.
         * 목이 쓸 세목을 정해 뒀으면 그 안에서만 고르게 한다 — 장부에서 못 고를 세목에
         * 예산을 잡아 두면 영영 맞출 수 없는 줄이 된다.
         */
        availableSaemoks(mok, usedItems) {
            const used = new Set((usedItems ?? []).map(b => b.saemok))

            let list = this.ASSETS_SAEMOK
            if (mok.is_able_specific_saemok && mok.able_specific_saemok_list?.length > 0) {
                list = list.filter(s => mok.able_specific_saemok_list.includes(s.id))
            }

            return list
                .filter(s => !used.has(s.id))
                .sort((a, b) => a.priority - b.priority)
        },

        // ---------- 과목 ----------
        /** 이름을 그 자리에서 고친다 */
        async renameAsset(collection, node, nextLabel) {
            const label = (nextLabel ?? '').trim()
            if (!this.editable || !label || label === node.label) return

            const before = node.label
            node.label = label   // 화면을 먼저 바꾼다

            try {
                await pb.collection(collection).update(node.id, { label })
                this.showStatus(`${ASSET_KINDS[collection].label} 이름을 바꿨습니다`)
            } catch (error) {
                console.error('Failed to rename asset:', error)
                node.label = before
                this.showError('이름을 바꾸지 못했습니다.')
            }
        },

        /**
         * 과목을 이 표에서 바로 만든다.
         * 예전에는 계정과목 탭에 가서 만들고, 다시 예산 탭으로 돌아와
         * 창을 띄워 항·목·세목을 골라야 한 줄이 들어갔다.
         */
        async createAsset(collection, hangId) {
            if (!this.editable) return

            const kind = ASSET_KINDS[collection]
            const body = { label: `새로운 ${kind.label}` }

            if (collection === 'AssetsHang') {
                body.priority = this.ASSETS_HANG.length + 1
            } else {
                const siblings = this.ASSETS_MOK.filter(m => this.parentHangId(m) === hangId)
                body.priority = siblings.length + 1
                body.parent_hang = hangId
                body.is_able_specific_saemok = false
            }

            try {
                const created = await pb.collection(collection).create(body)
                this[kind.listKey].push(created)
                this.showStatus(`${kind.label}을(를) 더했습니다. 이름을 눌러 고치세요`)
            } catch (error) {
                console.error('Failed to create asset:', error)
                this.showError(`${kind.label}을(를) 더하지 못했습니다.`)
            }
        },

        /** 과목을 지운다. 그에 딸린 예산 줄도 함께 사라진다는 것을 먼저 알린다 */
        async deleteAsset(collection, node) {
            if (!this.editable) return

            const kind = ASSET_KINDS[collection]
            const isHang = collection === 'AssetsHang'

            const childMoks = isHang
                ? this.ASSETS_MOK.filter(m => this.parentHangId(m) === node.id)
                : []
            const linked = this.BUDGETS.filter(b => (isHang ? b.hang : b.mok) === node.id)

            const lines = [`'${node.label}' ${kind.label}을(를) 지웁니다.`]
            if (childMoks.length) lines.push(`딸린 목 ${childMoks.length}개도 함께 지워집니다.`)
            if (linked.length) lines.push(`이 기간에 잡아 둔 예산 ${linked.length}줄도 함께 지워집니다.`)
            lines.push('되돌릴 수 없습니다. 계속할까요?')

            if (!window.confirm(lines.join('\n'))) return

            try {
                // 예산 줄 → 딸린 목 → 과목 차례로 지운다 (거꾸로 지우면 남는 것이 생긴다)
                const budgetsToDrop = await pb.collection('PeriodAndBudget').getFullList({
                    filter: isHang ? `hang="${node.id}"` : `mok="${node.id}"`,
                    requestKey: null,
                })
                await Promise.all(budgetsToDrop.map(b => pb.collection('PeriodAndBudget').delete(b.id)))
                await Promise.all(childMoks.map(m => pb.collection('AssetsMok').delete(m.id)))
                await pb.collection(collection).delete(node.id)

                await this.loadData()
                if (this.selectedPeriod) await this.loadBudgets(this.selectedPeriod.id)
                this.showStatus(`${kind.label}을(를) 지웠습니다`)
            } catch (error) {
                console.error('Failed to delete asset:', error)
                this.showError(`${kind.label}을(를) 지우지 못했습니다.`)
            }
        },

        // ---------- 예산 ----------
        /** 목에 세목 한 줄을 더한다. 금액은 0으로 두고 곧바로 적게 한다 */
        async addSaemokRow(row, event) {
            const saemokId = event.target.value
            event.target.value = ''
            if (!saemokId || !this.editable) return

            try {
                const created = await pb.collection('PeriodAndBudget').create({
                    field: this.selectedPeriod.id,
                    hang: row.hangId,
                    mok: row.mokId,
                    saemok: saemokId,
                    income_budget: 0,
                    expense_budget: 0,
                })
                this.BUDGETS.push(created)
                this.showStatus(`${this.getAssetLabel('saemok', saemokId)} 줄을 더했습니다`)

                // 방금 만든 줄의 수입 칸으로 손을 옮긴다 — 더한 뒤 바로 적는 것이 이어진다
                this.$nextTick(() => {
                    this.$el.querySelector(`[data-amt="${created.id}-income"]`)?.focus()
                })
            } catch (error) {
                console.error('Failed to add budget row:', error)
                this.showError('세목 줄을 더하지 못했습니다.')
            }
        },

        /**
         * 금액을 칸에서 바로 저장한다.
         * 화면을 먼저 바꾸고 보내되, 실패하면 되돌린다.
         */
        async setAmount(budget, field, rawValue) {
            if (!this.editable) return

            const next = this.parseInputValue(rawValue)
            const before = budget[field] || 0
            if (next === before) return

            budget[field] = next

            try {
                await pb.collection('PeriodAndBudget').update(budget.id, { [field]: next })
                this.showStatus('예산을 저장했습니다')
            } catch (error) {
                console.error('Failed to save amount:', error)
                budget[field] = before
                this.showError('금액을 저장하지 못했습니다.')
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

/* -------------------- 예산 표 (과목표 겸용) -------------------- */
.section-acts {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
}

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
    padding: var(--table-cell-padding-compact);
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

.c-name { width: auto; }
.budget-table .budget-amount { width: 150px; text-align: right; }
.c-act { width: 52px; }

/* 단계는 들여쓰기로만 나눈다 — 칸을 따로 두면 이름이 좁아진다 */
.c-name {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
}

.indent {
    display: inline-block;
    flex-shrink: 0;
    width: var(--spacing-4);
}

.indent.double {
    width: var(--spacing-8);
}

.row-hang td {
    background: var(--bg-secondary);
    border-bottom-color: var(--border-color-strong);
}

.name-hang {
    font-size: var(--text-base);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.name-mok {
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.name-saemok {
    color: var(--text-primary);
}

.row-item:hover td {
    background: var(--bg-secondary);
}

/* 더하는 줄은 눈에 먼저 띄면 안 된다 — 있다는 것만 알면 된다 */
.row-add td {
    padding-top: var(--spacing-1);
    padding-bottom: var(--spacing-1);
    border-bottom: none;
}

.row-add-hang td {
    padding-top: var(--spacing-3);
}

.add-btn,
.add-select {
    min-height: 28px;
    padding: 0 var(--spacing-3);
    border: 1px dashed var(--border-color-strong);
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
}

.add-btn:hover,
.add-select:hover:not(:disabled) {
    border-color: var(--primary-600);
    color: var(--primary-700);
}

.add-select:disabled {
    opacity: 0.5;
}

[data-theme="dark"] .add-btn:hover,
[data-theme="dark"] .add-select:hover:not(:disabled) {
    color: var(--primary-300);
}

/* 금액 칸. 창을 띄우지 않고 여기에 바로 적는다 */
.amt {
    width: 100%;
    min-height: 30px;
    padding: 0 var(--spacing-2);
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    text-align: right;
    transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.amt:hover {
    border-color: var(--border-color);
    background: var(--bg-primary);
}

.amt:focus {
    outline: none;
    border-color: var(--primary-600);
    background: var(--bg-primary);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .amt:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.amt.income { color: var(--income-color); }
.amt.expense { color: var(--expense-color); }
.amt:placeholder-shown { color: var(--text-muted); font-weight: var(--font-weight-normal); }

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
