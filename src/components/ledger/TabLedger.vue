<template>
    <div class="tab-root">
        <template v-if="loginStatus == true">
            <!-- 제목과 설명을 한 줄에 둔다. 이 화면에서 봐야 하는 것은 표다 -->
            <div class="page-head">
                <div class="head-text">
                    <h1 class="page-title">장부</h1>
                    <p class="page-desc">은행에서 불러온 거래에 항·목·세목과 내용을 적습니다.</p>
                </div>
                <div class="acts" v-if="canEdit">
                    <AddTransactionModal
                        ref="addTransactionModal"
                        @refresh="refreshLedger"
                        :filter-start-date=filterStartDate
                        :filter-end-date=filterEndDate>
                    </AddTransactionModal>
                </div>
            </div>

            <PeriodFilter :init-date="initDate" @change="onPeriodChange" />

            <LedgerTable
                v-if="filterStartDate && filterEndDate"
                ref="ledgerTable"
                @refresh="refreshAddTransactionModal"
                :filter-start-date=filterStartDate
                :filter-end-date=filterEndDate
                :canEdit="canEdit">
            </LedgerTable>
        </template>
    </div>
</template>

<script>
import AddTransactionModal from './AddTransactionModal.vue';
import LedgerTable from './LedgerTable.vue';
import PeriodFilter from '../layout/PeriodFilter.vue';
import { nextTick } from "vue"

export default {
    props:['loginStatus', 'canEdit', 'initDate'],

    components: { LedgerTable, AddTransactionModal, PeriodFilter },

    data() {
        return {
            filterStartDate: null,
            filterEndDate: null,
        }
    },

    methods: {
        onPeriodChange({ startDate, endDate }) {
            this.filterStartDate = startDate
            this.filterEndDate = endDate
            // 표는 기간을 지켜보고 있다가 스스로 다시 불러온다. 여기서는 '안 적은 거래'만 맞춰 준다
            this.$nextTick(() => this.refreshAddTransactionModal())
        },

        refreshLedger() {
            this.$refs.ledgerTable?.getLedger();
        },

        refreshAddTransactionModal(){
            nextTick(() => {
                this.$refs.addTransactionModal?.getNotAddedTransactionList();
            });
        },
    }
}

</script>

<style scoped>
/*
    표가 화면 끝까지 내려오게 한다.
    예전에는 표에 `max-height: calc(100vh - 320px)`를 박아 두어서, 위 부속이
    조금만 늘어도 표가 그만큼 짧아졌다. 게다가 페이지까지 함께 굴러
    머리줄을 붙여 둔 보람이 없었다. 이제 남는 자리를 전부 표가 가진다.
*/
.tab-root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    height: calc(100vh - var(--header-height) - var(--spacing-6) * 2);
    min-height: 480px;
}

.page-head {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    flex-wrap: wrap;
    flex-shrink: 0;
    margin-bottom: 0;
}

.head-text {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    flex-wrap: wrap;
}

.page-head .page-title {
    font-size: var(--text-xl);
}

.page-head .page-desc {
    margin: 0;
}

.page-head .acts {
    margin-left: auto;
}

</style>
