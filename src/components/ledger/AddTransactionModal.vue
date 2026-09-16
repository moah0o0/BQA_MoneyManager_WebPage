<template>
    <template v-if="TRNASACTION_LIST != null">
        <button
            type="button"
            class="add-transaction"
            v-if="TRNASACTION_LIST.length > 0"
            aria-haspopup="dialog"
            @click="addTransactionModalStatus = true"
        >
            <i class="bi bi-file-earmark-plus" aria-hidden="true"></i>
            <strong>아직 안 적은 거래</strong>
            <small class="num">{{ TRNASACTION_LIST.length }}건</small>
        </button>

        <AppModal
            v-if="addTransactionModalStatus == true"
            title="아직 안 적은 거래 추가"
            icon="bi-file-earmark-plus"
            description="은행에서 들어왔지만 아직 장부에 옮기지 않은 거래입니다."
            size="xl"
            panel-class="add-tx-modal"
            :close-on-scrim="false"
            @close="closeModalNow"
        >
            <div class="modal-function">
                <div class="selectTransaction">
                    <table class="transaction" v-if="TRNASACTION_LIST != null">
                        <caption class="sr-only">장부에 옮길 거래를 고르세요.</caption>
                        <thead>
                            <tr class="transaction_pin">
                                <th scope="col" style="width:8%;">
                                    <!-- 쉰 건을 한 건씩 체크하게 두면 그것부터가 일이다 -->
                                    <input
                                        type="checkbox"
                                        class="select"
                                        :checked="allSelected"
                                        :indeterminate.prop="SELECTED_TRANSACTION_LIST.length > 0 && !allSelected"
                                        aria-label="모두 고르기"
                                        @change="toggleSelectAll"
                                    >
                                </th>
                                <th scope="col" style="width:13%;">구분</th>
                                <th scope="col" style="width:19%;">일시</th>
                                <th scope="col" style="width:19%;">계좌</th>
                                <th scope="col" style="width:25%;">적요</th>
                                <th scope="col" style="width:16%;" class="r">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="transaction in TRNASACTION_LIST"
                                :key="transaction.id"
                                :class="SELECTED_TRANSACTION_LIST.includes(transaction) ? 'transaction_row selected' : 'transaction_row'">
                                <td>
                                    <input class="select" type="checkbox"
                                    @change="selectTransactionRow(transaction)"
                                    :checked="SELECTED_TRANSACTION_LIST.includes(transaction)"
                                    :aria-label="`${datetimeFormatter(transaction.datetime)} ${transaction.description} ${transaction.money.toLocaleString()}원 고르기`">
                                </td>
                                <td>
                                    <span :class="['gwan-tag', transaction.type === '수입' ? 'is-income' : 'is-expense']">
                                        <span aria-hidden="true">{{ transaction.type === '수입' ? '+' : '−' }}</span>{{ transaction.type }}
                                    </span>
                                </td>
                                <td class="num">{{ datetimeFormatter(transaction.datetime) }}</td>
                                <td>{{ transaction.expand.bank.BankType }}<br/><small class="num">{{ transaction.expand.bank.AccountNumber }}</small></td>
                                <td>{{ transaction.description }}</td>
                                <td class="num r">{{ transaction.money.toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="createSettings">
                    <fieldset class="option">
                        <legend class="sr-only">추가 방법</legend>
                        <!-- 라디오와 설명을 label로 묶는다 — 글자를 눌러도 골라져야 한다 -->
                        <label class="option-line" :class="{ 'is-off': SELECTED_TRANSACTION_LIST.length == 0 }">
                            <input class="select" type="radio" v-model="ADD_TYPE" value="GENERAL"
                                :disabled="SELECTED_TRANSACTION_LIST.length == 0">
                            <span class="option-name">일반</span>
                            <span class="option-description">고른 거래를 그대로 장부에 옮깁니다.</span>
                        </label>
                        <label class="option-line" :class="{ 'is-off': SELECTED_TRANSACTION_LIST.length !== 1 }">
                            <input class="select" type="radio" v-model="ADD_TYPE" value="SPLIT"
                            :disabled="SELECTED_TRANSACTION_LIST.length !== 1">
                            <span class="option-name">분할</span>
                            <span class="option-description">한 건만 골랐을 때, 그 거래를 여러 줄로 나눠 적습니다.</span>
                        </label>
                    </fieldset>

                    <div class="split">
                        <div class="spliter" v-if="ADD_TYPE == 'SPLIT'">
                            <div class="status">
                                <div class="money-total">
                                    <span class="title">분할항목 합계</span>
                                    <span class="amount num">{{ getSplitMoneyListSum().toLocaleString() }}원</span>
                                </div>
                                <p class="check-vaild" :class="isSameSplitMoneyListAndSelectTransaction() ? 'is-ok' : 'is-todo'" role="status">
                                    <template v-if="isSameSplitMoneyListAndSelectTransaction()">
                                        <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
                                        고른 거래의 금액과 분할금액의 합계가 맞습니다.
                                    </template>
                                    <template v-else>
                                        <i class="bi bi-info-circle-fill" aria-hidden="true"></i>
                                        분할금액의 합계가
                                        <b class="num">{{ SELECTED_TRANSACTION_LIST[0].type == "수입" ? "+" : "−" }}{{ SELECTED_TRANSACTION_LIST[0].money.toLocaleString() }}원</b>
                                        이 되어야 합니다.
                                    </template>
                                </p>
                                <fieldset class="split-add-type">
                                    <legend class="sr-only">나눠 적을 줄의 구분</legend>
                                    <label class="select-line">
                                        <input class="select" type="radio" v-model="SPLIT_ADD_TYPE" value="수입">수입
                                    </label>
                                    <label class="select-line">
                                        <input class="select" type="radio" v-model="SPLIT_ADD_TYPE" value="지출">지출
                                    </label>
                                </fieldset>
                                <div class="split-amount">
                                    <label class="sr-only" for="split-amount-input">나눠 적을 금액</label>
                                    <input id="split-amount-input" class="number num" type="text" inputmode="numeric"
                                        v-model="SPLIT_ADD_MONEY" @input="formatNumber"
                                        @keydown.enter.prevent="addSplitMoney" placeholder="금액">
                                    <span class="currency">원</span>
                                    <button type="button" class="btn-add" @click="addSplitMoney">추가</button>
                                </div>
                            </div>

                            <ul class="split-money-result">
                                <li class="split-money" v-for="(split_money, i) in SPLIT_ADD_MONEY_LIST" :key="i">
                                    <button
                                        type="button"
                                        class="split-remove"
                                        :aria-label="`${split_money.gwan} ${split_money.money.toLocaleString()}원 지우기`"
                                        @click="removeSplitMoney(split_money)"
                                    >
                                        <i class="bi bi-trash-fill" aria-hidden="true"></i>
                                    </button>
                                    <span :class="['gwan-tag', split_money.gwan === '수입' ? 'is-income' : 'is-expense']">
                                        <span aria-hidden="true">{{ split_money.gwan == '수입' ? '+' : '−' }}</span>{{ split_money.gwan }}
                                    </span>
                                    <span class="money num">{{ split_money.money.toLocaleString() }}원</span>
                                </li>
                                <li v-if="SPLIT_ADD_MONEY_LIST.length === 0" class="hint">
                                    나눠 적을 금액을 하나씩 더해 주세요.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <span class="foot-count">
                    {{ SELECTED_TRANSACTION_LIST.length
                        ? `${TRNASACTION_LIST.length}건 가운데 ${SELECTED_TRANSACTION_LIST.length}건 고름`
                        : `아직 안 적은 거래 ${TRNASACTION_LIST.length}건` }}
                </span>
                <button type="button" class="btn btn-ghost" @click="toggleSelectAll">
                    {{ allSelected ? '모두 해제' : '전부 고르기' }}
                </button>
                <button type="button" class="btn btn-ghost" @click="closeModalNow">닫기</button>
                <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="!canSubmit"
                    @click="createLedgerRecord"
                >
                    장부에 추가
                </button>
            </template>
        </AppModal>
    </template>
</template>

<style scoped>
/* ---------- 여는 단추 ---------- */
.add-transaction {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 36px;
    padding: 0 var(--spacing-4);
    border: 1px solid var(--primary-600);
    border-radius: var(--border-radius-md);
    background: var(--primary-600);
    color: #fff;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.add-transaction:hover {
    background: var(--primary-700);
    border-color: var(--primary-700);
}

.add-transaction small {
    padding: 1px var(--spacing-2);
    border-radius: var(--border-radius-full);
    background: #fff;
    color: var(--primary-700);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-bold);
}

/* ---------- 창 안 ---------- */
.modal-function {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: var(--spacing-5);
    align-items: start;
}

.selectTransaction {
    min-width: 0;
    max-height: 52vh;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
}

table.transaction {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: var(--text-xs);
}

tr.transaction_pin th {
    position: sticky;
    top: 0;
    z-index: 1;
    height: 36px;
    padding: 0 var(--spacing-2);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color-strong);
    color: var(--text-secondary);
    font-weight: var(--font-weight-semibold);
    text-align: left;
}

table.transaction td {
    height: 42px;
    padding: var(--spacing-1) var(--spacing-2);
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
}

table.transaction th.r,
table.transaction td.r {
    text-align: right;
}

table.transaction td small {
    color: var(--text-muted);
}

tr.transaction_row:hover {
    background: var(--bg-secondary);
}

tr.transaction_row.selected {
    background: var(--bg-active);
}

table.transaction tbody tr:last-child td {
    border-bottom: none;
}

/* 수입/지출은 기호를 함께 둔다 */
.gwan-tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.gwan-tag.is-income { color: var(--income-color); }
.gwan-tag.is-expense { color: var(--expense-color); }

input.select[type='checkbox'],
input.select[type='radio'] {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
}

/* ---------- 오른쪽: 방법 고르기 ---------- */
.createSettings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    min-width: 0;
}

.option {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin: 0;
    padding: 0;
    border: none;
}

.option-line {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: var(--spacing-1) var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    cursor: pointer;
}

.option-line:hover:not(.is-off) {
    background: var(--bg-hover);
}

/* 고를 수 없는 줄은 왜 못 고르는지 설명이 남아 있어야 한다 — 숨기지 않고 흐리게 둔다 */
.option-line.is-off {
    opacity: 0.5;
    cursor: not-allowed;
}

.option-name {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.option-description {
    grid-column: 2;
    font-size: var(--text-xs);
    color: var(--text-secondary);
}

/* ---------- 분할 ---------- */
.spliter {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
}

.status {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
}

.money-total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-2);
}

.money-total .title {
    font-size: var(--text-xs);
    color: var(--text-secondary);
}

.money-total .amount {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

/*
    금액이 맞는지 알리는 자리.
    아직 못 맞춘 것은 잘못한 것이 아니므로 빨강 대신 안내 색을 쓴다.
*/
.check-vaild {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-2);
    margin: 0;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--border-radius-md);
    font-size: var(--text-xs);
    line-height: var(--line-height-normal);
}

.check-vaild.is-ok {
    background: var(--success-50);
    color: var(--success-600);
}

.check-vaild.is-todo {
    background: var(--info-50);
    color: var(--info-600);
}

[data-theme="dark"] .check-vaild.is-ok {
    background: rgb(34 197 94 / 0.14);
    color: var(--success-400);
}

[data-theme="dark"] .check-vaild.is-todo {
    background: rgb(59 130 246 / 0.14);
    color: var(--income-color);
}

.split-add-type {
    display: flex;
    gap: var(--spacing-4);
    margin: 0;
    padding: 0;
    border: none;
}

.select-line {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: var(--text-sm);
    cursor: pointer;
}

.split-amount {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
}

.split-amount .number {
    flex: 1;
    min-width: 0;
    min-height: 34px;
    padding: 0 var(--spacing-3);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
    text-align: right;
}

.split-amount .number:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .split-amount .number:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.split-amount .currency {
    font-size: var(--text-sm);
    color: var(--text-secondary);
}

.btn-add {
    min-height: 34px;
    padding: 0 var(--spacing-4);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
}

.btn-add:hover {
    background: var(--bg-hover);
}

.split-money-result {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 200px;
    overflow-y: auto;
}

.split-money {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md);
    font-size: var(--text-sm);
}

.split-money .money {
    margin-left: auto;
    font-weight: var(--font-weight-semibold);
}

.split-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-xs);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.split-remove:hover {
    background: var(--danger-50);
    color: var(--danger-600);
}

[data-theme="dark"] .split-remove:hover {
    background: rgb(239 68 68 / 0.16);
    color: var(--danger-300);
}

.foot-count {
    margin-right: auto;
    font-size: var(--text-sm);
    color: var(--text-muted);
}

/* ---------- 반응형 ---------- */
@media (max-width: 900px) {
    .modal-function {
        grid-template-columns: minmax(0, 1fr);
    }

    .selectTransaction {
        max-height: 40vh;
    }
}
</style>

<script>
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

import './style.css'
import AppModal from '../layout/AppModal.vue'

export default {
    components: { AppModal },

    props: ['filterStartDate', 'filterEndDate'],
    emits: ['refresh'],   

    data(){
        return {
            TRNASACTION_LIST: null,

            ADD_TYPE: null,
            SELECTED_TRANSACTION_LIST: [],
            SPLIT_ADD_TYPE: null,
            SPLIT_ADD_MONEY: '',
            SPLIT_ADD_MONEY_LIST: [],

            addTransactionModalStatus: false
        }
    },

    computed: {
        allSelected() {
            return this.TRNASACTION_LIST?.length > 0
                && this.SELECTED_TRANSACTION_LIST.length === this.TRNASACTION_LIST.length
        },

        /** 추가할 수 있는 때인지 한곳에서 정한다 — 단추 두 개를 번갈아 감추던 자리다 */
        canSubmit() {
            if (this.ADD_TYPE === 'GENERAL') return this.SELECTED_TRANSACTION_LIST.length > 0
            if (this.ADD_TYPE === 'SPLIT') return this.isSameSplitMoneyListAndSelectTransaction() === true
            return false
        }
    },

    watch: {
        async filterStartDate(){
            await this.getNotAddedTransactionList()
        },

        async filterEndDate(){
            await this.getNotAddedTransactionList()
        }
    },  
    
    async mounted(){
        await this.getNotAddedTransactionList()
    },

    methods: {
        datetimeFormatter(str){
            str = String(str)
            return str.substring(0, 12).replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/,"$1-$2-$3 $4:$5")
        },

        /**
         * 아직 안 적은 거래를 한 번에 다 고른다.
         * 달마다 쌓인 것을 옮기는 일이라, 대개는 '전부'가 답이다.
         */
        toggleSelectAll() {
            if (this.allSelected) {
                this.SELECTED_TRANSACTION_LIST = []
                return
            }
            this.SELECTED_TRANSACTION_LIST = [...this.TRNASACTION_LIST]
            // 여러 건을 고르면 '분할'은 쓸 수 없다 — 방법을 함께 맞춰 준다
            if (this.SELECTED_TRANSACTION_LIST.length !== 1) this.ADD_TYPE = 'GENERAL'
        },

        /** 창을 닫을 때마다 목록을 다시 맞춘다 — 안에서 추가한 것이 밖에도 보여야 한다 */
        closeModalNow() {
            this.$emit("refresh")
            this.addTransactionModalStatus = false
        },

        closeModal(e) {
            if (e.key === 'Escape') this.closeModalNow()
        },

        async getNotAddedTransactionList(){            
            let transaction_list = await pb.collection("Transaction").getFullList({
                sort:'datetime',
                filter: `${this.filterStartDate} <= datetime && datetime <= ${this.filterEndDate}`,
                expand: 'bank',
                requestKey: null
            })

            let added_ledger_list = await pb.collection("Ledger").getFullList({
                filter: `${this.filterStartDate} <= transaction.datetime && transaction.datetime <= ${this.filterEndDate}`,
                expand: "transaction",
                requestKey: null
            })

            added_ledger_list = added_ledger_list.map((added_ledger) => added_ledger.transaction)
            transaction_list = transaction_list.filter((transaction) => !added_ledger_list.includes(transaction.id))

            this.TRNASACTION_LIST = transaction_list
            

        },

        selectTransactionRow(id){
            if(this.SELECTED_TRANSACTION_LIST.includes(id)){
                this.SELECTED_TRANSACTION_LIST = this.SELECTED_TRANSACTION_LIST.filter(v => v !== id)
            } else{
                this.SELECTED_TRANSACTION_LIST.push(id)
            }
            this.resetSettings()
        },

        formatNumber(e) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                value = Number(value).toLocaleString();
            }
            this.SPLIT_ADD_MONEY = value;
        },

        addSplitMoney(){
            const add_type = this.SPLIT_ADD_TYPE
            const add_money = Number(this.SPLIT_ADD_MONEY.replace(/,/g, ''))

            if(add_type != "수입" && add_type != "지출"){
                alert("수입 또는 지출을 선택하세요.")
                return
            }

            if(!add_money || add_money == 0){
                alert("0원 이상의 값을 입력하세요.")
                return
            }

            const split_money_ledger = {
                transaction: this.SELECTED_TRANSACTION_LIST[0].id,
                ADD_TYPE: "SPLIT",
                gwan: add_type,
                money: add_money
            }

            this.SPLIT_ADD_MONEY_LIST.push(split_money_ledger)
        },

        getSplitMoneyListSum(){
            let sum = 0
            for(const split_money_ledger of this.SPLIT_ADD_MONEY_LIST){
                if(split_money_ledger.gwan == "수입") {
                    sum = sum + split_money_ledger.money
                } 
                if(split_money_ledger.gwan == "지출") {
                    sum = sum - split_money_ledger.money
                }
            }
            return sum
        },

        isSameSplitMoneyListAndSelectTransaction(){
            let original_money = this.SELECTED_TRANSACTION_LIST[0].money

            if(this.SELECTED_TRANSACTION_LIST[0].type == '수입'){
                original_money = original_money
            }
            
            if(this.SELECTED_TRANSACTION_LIST[0].type == '지출'){
                original_money = -original_money
            }
            
            return original_money == this.getSplitMoneyListSum()
        },

        removeSplitMoney(target){
            this.SPLIT_ADD_MONEY_LIST = this.SPLIT_ADD_MONEY_LIST.filter((ledger) => {
                return ledger != target
            })
        },

        resetSettings(){
            this.ADD_TYPE = null
            this.SPLIT_ADD_TYPE = null
            this.SPLIT_ADD_MONEY = ''
            this.SPLIT_ADD_MONEY_LIST = []
        },

        async createLedgerRecord(){
            let new_record_list = []
            
            if(this.ADD_TYPE == 'GENERAL'){
                new_record_list = this.SELECTED_TRANSACTION_LIST.map((transaction) => {
                    return {
                        transaction: transaction.id,
                        ADD_TYPE: "GENERAL",
                        gwan: transaction.type,
                        money: transaction.money
                    }
                })
            }
            
            if(this.ADD_TYPE == "SPLIT"){
                new_record_list = this.SPLIT_ADD_MONEY_LIST
            }

            for(const record of new_record_list){
                await pb.collection("Ledger").create(record)
            }

            await this.getNotAddedTransactionList()
            
            this.SELECTED_TRANSACTION_LIST = []
        
            this.ADD_TYPE = null
            this.SPLIT_ADD_TYPE = null
            this.SPLIT_ADD_MONEY = ''
            this.SPLIT_ADD_MONEY_LIST = []

            this.closeModalNow()
        }
        
    }
}
</script>
