<template>
    <div class="transaction-number-list" v-if="transaction != null && bankSetting != null">
        <button
            type="button"
            class="transaction-number"
            :tabindex="tabindex"
            aria-haspopup="dialog"
            :aria-label="`${bankSetting.NickName} 거래 ${transaction.no}번 원본 보기`"
            @click="modalOpen = true"
        >
            <i class="bi bi-cash" aria-hidden="true"></i>
            <span class="number">{{ bankSetting.NickName }}<span class="no num">({{ transaction.no }})</span></span>
        </button>

        <AppModal
            v-if="modalOpen"
            title="거래내역 원본"
            icon="bi-bank"
            description="은행에서 불러온 그대로입니다. 이 값은 고칠 수 없습니다."
            size="sm"
            @close="modalOpen = false"
        >
            <dl class="data">
                <div class="data-line">
                    <dt>구분</dt>
                    <dd :class="transaction.type === '수입' ? 'is-income' : 'is-expense'">
                        <span aria-hidden="true">{{ transaction.type === '수입' ? '+' : '−' }}</span>
                        {{ transaction.type == "수입" ? "입금" : "출금" }}
                    </dd>
                </div>
                <div class="data-line">
                    <dt>일시</dt>
                    <dd class="num">{{ datetimeFormatter(transaction.datetime) }}</dd>
                </div>
                <div class="data-line">
                    <dt>적요</dt>
                    <dd>{{ transaction.description }}</dd>
                </div>
                <div class="data-line">
                    <dt>금액</dt>
                    <dd class="num amount">{{ transaction.money.toLocaleString() }}원</dd>
                </div>
            </dl>

            <dl class="data background">
                <div class="data-line">
                    <dt>거래번호</dt>
                    <dd class="num">{{ transaction.no }}</dd>
                </div>
                <div class="data-line">
                    <dt>계좌별칭</dt>
                    <dd>{{ bankSetting.NickName }}</dd>
                </div>
                <div class="data-line">
                    <dt>계좌은행</dt>
                    <dd>{{ bankSetting.BankType }}</dd>
                </div>
                <div class="data-line">
                    <dt>계좌번호</dt>
                    <dd class="num">{{ bankSetting.AccountNumber }}</dd>
                </div>
            </dl>

            <template #footer>
                <button type="button" class="btn btn-secondary" @click="modalOpen = false">닫기</button>
            </template>
        </AppModal>
    </div>
</template>

<style scoped>
.transaction-number-list {
    display: flex;
    min-width: 0;
}

.transaction-number {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    min-width: 0;
    min-height: 28px;
    padding: 0 var(--spacing-2);
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.transaction-number:hover {
    background: var(--bg-hover);
    border-color: var(--border-color-strong);
    color: var(--text-primary);
}

.transaction-number .number {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.transaction-number .no {
    margin-left: 2px;
    color: var(--text-muted);
}

/* ---------- 창 안 ---------- */
.data {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    margin: 0;
}

.data.background {
    margin-top: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
}

.data-line {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: var(--spacing-3);
    align-items: baseline;
}

.data-line dt {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
}

.data-line dd {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-primary);
}

.data-line dd.amount {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-bold);
}

.data-line dd.is-income {
    color: var(--income-color);
    font-weight: var(--font-weight-semibold);
}

.data-line dd.is-expense {
    color: var(--expense-color);
    font-weight: var(--font-weight-semibold);
}
</style>

<script>
import AppModal from '../layout/AppModal.vue';

export default {
    components: { AppModal },

    props: {
        transaction: { required: true },
        bankSettingList: { type: Array, default: () => [] },
        /** 표가 탭 스톱 하나만 갖도록 바깥에서 정해 준다 */
        tabindex: { type: Number, default: 0 },
    },

    data(){
        return {
            modalOpen: false
        }
    },

    computed: {
        bankSetting() {
            if (!this.bankSettingList || !this.transaction) return null;
            return this.bankSettingList.find(b => b.id === this.transaction.bank) || null;
        }
    },

    methods: {
        datetimeFormatter(str){
            str = String(str)
            return str.substring(0, 12).replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/,"$1-$2-$3 $4:$5")
        }
    }
}
</script>
