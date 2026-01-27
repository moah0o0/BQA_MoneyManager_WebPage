<template>
    <div class="transaction-number-list" v-if="transaction != null && bankSetting != null">
        <span class="label background transaction-number" @click="modalOpen = true">
            <i class="bi bi-cash"></i> <div class="number">{{ bankSetting.NickName }}({{ transaction.no }})</div>
        </span>
        <Teleport to="body">
            <div :class="['transaction-modal-overlay', { disable: transaction == null }]" v-if="modalOpen" @click.self="modalOpen = false">
                <div class="transaction-modal-content">

                <div class="meta">
                    <span class="title">거래내역 원본</span>
                    <span class="description">은행에서 불러온 세부사항을 확인하세요</span>
                </div>

                <div class="data">
                    <div class="data-line">
                        <span class="key">구분</span>
                        <span class="value">{{ transaction.type == "수입" ? "입금" : "출금" }}</span>
                    </div>
                    <div class="data-line">
                        <span class="key">일시</span>
                        <span class="value">{{ datetimeFormatter(transaction.datetime) }}</span>
                    </div>
                    <div class="data-line">
                        <span class="key">적요</span>
                        <span class="value">{{ transaction.description }}</span>
                    </div>
                    <div class="data-line">
                        <span class="key">금액</span>
                        <span class="value">{{ transaction.money.toLocaleString() }}</span>
                    </div>
                </div>
                <div class="data background">
                    <div class="data-line">
                        <span class="key">거래번호</span>
                        <span class="value">{{ transaction.no }}</span>
                    </div>
                    <div class="data-line">
                        <span class="key">계좌별칭</span>
                        <span class="value">{{ bankSetting.NickName }}</span>
                    </div>
                    <div class="data-line">
                        <span class="key">계좌은행</span>
                        <span class="value">{{ bankSetting.BankType }}</span>
                    </div>
                    <div class="data-line">
                        <span class="key">계좌번호</span>
                        <span class="value">{{ bankSetting.AccountNumber }}</span>
                    </div>
                </div>
                <button class="close-btn" @click="modalOpen = false">
                    <i class="bi bi-x-square-fill"></i>창 닫기
                </button>
                </div>
            </div>
        </Teleport>
    </div>


</template>

<style scoped>

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 500;
    display: flex;
    justify-content: center;
    align-items: center;
}

.transaction-info {
    width: 450px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;

    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    background-color: var(--bg-primary);

    padding: 32px;

    display: flex;
    flex-direction: column;
    justify-content: flex-start;

    gap: 24px;
}

.transaction-info > .meta {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.transaction-info > .meta > span.title {
    font-size: 24px;
    font-weight: 800;
}

.transaction-info > .meta > span.description {
    font-size: 16px;
    font-weight: 500;
}


.transaction-info > .data {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.transaction-info > .data.background {
    border: 1px solid var(--medium-color);
    padding: 20px 20px;
    box-sizing: border-box;
}   

.transaction-info > .data > .data-line {
    display: flex;
    flex-direction: row;
    gap: 20px;
    box-sizing: border-box;
}

.transaction-info > .data > .data-line > span.key {
    font-size: 16px;
    font-weight: 800;
}

.transaction-info > .data > .data-line > span.value {
    font-size: 16px;
    font-weight: 500;
}

button.close-btn {
    height: 40px;
    border: unset;
    background-color: var(--light-color);
    padding: 5px 20px;
    
    display: flex;
    gap: 8px;

    align-items: center;
    font-weight: 600;
    font-size: 14px;

    justify-content: center;

    border-radius: 10px;

    transition: all 0.25s ease;
}

button.close-btn > i {
    font-size: 12px;
    transition: transform 0.25s ease;
}

button.close-btn:hover {
    cursor: pointer;
    background-color: var(--danger-color);
    color: white;
}

button.close-btn:hover > i {
    transform: rotate(90deg);
}



.transaction-number-list {
    display: flex;
    gap: 10pt;
    flex-wrap: wrap;
    margin-top:10px;
    margin-bottom:10px;

}

.transaction-number {
    cursor: pointer;
}

.transaction-number > .number{
    text-align: left;
    font-size: 0.8em;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis;
}

/* -------------------- 반응형 -------------------- */
@media (max-width: 480px) {
    .transaction-info {
        padding: 20px;
        gap: 16px;
    }

    .transaction-info > .meta > span.title {
        font-size: 20px;
    }

    .transaction-info > .meta > span.description {
        font-size: 14px;
    }
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .modal,
[data-theme="dark"] .modal {
    background-color: rgba(0, 0, 0, 0.7);
}

:deep([data-theme="dark"]) .transaction-info,
[data-theme="dark"] .transaction-info {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .transaction-info > .meta > span.title,
[data-theme="dark"] .transaction-info > .meta > span.title {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .transaction-info > .meta > span.description,
[data-theme="dark"] .transaction-info > .meta > span.description {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .transaction-info > .data > .data-line > span.key,
[data-theme="dark"] .transaction-info > .data > .data-line > span.key {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .transaction-info > .data > .data-line > span.value,
[data-theme="dark"] .transaction-info > .data > .data-line > span.value {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .transaction-info > .data.background,
[data-theme="dark"] .transaction-info > .data.background {
    border-color: var(--border-color);
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) button.close-btn,
[data-theme="dark"] button.close-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) button.close-btn:hover,
[data-theme="dark"] button.close-btn:hover {
    background-color: var(--danger-500);
    color: white;
}

:deep([data-theme="dark"]) .label.background.transaction-number,
[data-theme="dark"] .label.background.transaction-number {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

</style>

<!-- Teleport된 요소는 scoped 스타일이 적용되지 않으므로 전역 스타일 사용 -->
<style>
.transaction-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 500;
    display: flex;
    justify-content: center;
    align-items: center;
}

.transaction-modal-overlay.disable {
    display: none;
}

.transaction-modal-content {
    width: 450px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    background-color: var(--bg-primary);
    padding: 32px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 24px;
}

.transaction-modal-content > .meta {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.transaction-modal-content > .meta > span.title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
}

.transaction-modal-content > .meta > span.description {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
}

.transaction-modal-content > .data {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.transaction-modal-content > .data.background {
    border: 1px solid var(--border-color);
    padding: 20px;
    box-sizing: border-box;
    border-radius: 8px;
    background-color: var(--bg-secondary);
}

.transaction-modal-content > .data > .data-line {
    display: flex;
    flex-direction: row;
    gap: 20px;
    box-sizing: border-box;
}

.transaction-modal-content > .data > .data-line > span.key {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
    min-width: 70px;
}

.transaction-modal-content > .data > .data-line > span.value {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
}

.transaction-modal-content button.close-btn {
    height: 40px;
    border: unset;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 5px 20px;
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 600;
    font-size: 14px;
    justify-content: center;
    border-radius: 10px;
    transition: all 0.25s ease;
    cursor: pointer;
}

.transaction-modal-content button.close-btn > i {
    font-size: 12px;
    transition: transform 0.25s ease;
}

.transaction-modal-content button.close-btn:hover {
    background-color: var(--danger-500);
    color: white;
}

.transaction-modal-content button.close-btn:hover > i {
    transform: rotate(90deg);
}

@media (max-width: 480px) {
    .transaction-modal-content {
        padding: 20px;
        gap: 16px;
    }

    .transaction-modal-content > .meta > span.title {
        font-size: 20px;
    }

    .transaction-modal-content > .meta > span.description {
        font-size: 14px;
    }
}

[data-theme="dark"] .transaction-modal-overlay {
    background-color: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .transaction-modal-content {
    background-color: var(--bg-secondary);
}

[data-theme="dark"] .transaction-modal-content > .data.background {
    background-color: var(--bg-tertiary);
}
</style>

<script>
export default {
    props: ['transaction', 'bankSettingList'],

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

    mounted(){
        window.addEventListener('keydown', this.closeModal)
    },

    beforeUnmount(){
        window.removeEventListener('keydown', this.closeModal)
    },

    methods: {
        datetimeFormatter(str){
            str = String(str)
            return str.substring(0, 12).replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/,"$1-$2-$3 $4:$5")
        },

        closeModal(e) {
            if (e.key === 'Escape') {
                this.modalOpen = false
            }
        }
    }

}
</script>
