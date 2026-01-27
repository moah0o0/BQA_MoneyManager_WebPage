<template>
    <template v-if="TRNASACTION_LIST != null">
        <button class="add-transaction" @click="addTransactionModalStatus = true;" v-if="TRNASACTION_LIST.length > 0">
            <i class="bi bi-file-earmark-plus"></i>
            <strong>미계정 거래 추가</strong>
            <small>{{ TRNASACTION_LIST.length }}건</small>
        </button>
        <div class="modal" v-if="addTransactionModalStatus == true">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="meta">
                        <span class="title">미계정 거래 추가</span>
                        <span class="description">장부에 기입되지 않은 거래를 추가합니다</span>
                    </div>
                    <div class="close">
                        <button class="close-btn" @click="closeModal({key:'Escape'})"><i class="bi bi-x-square-fill"></i>창 닫기</button>
                    </div>
                </div>
                <div class="modal-function">
                    <div class="selectTransaction">
                        <table class="transaction" v-if="TRNASACTION_LIST != null">
                            <thead>
                                <tr class="transaction_pin">
                                    <th style="width:10%;">선택</th>
                                    <th style="width:10%;">구분</th>
                                    <th style="width:25%;">일시</th>
                                    <th style="width:20%;">계좌</th>
                                    <th style="width:25%;">적요</th>
                                    <th style="width:10%;">금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="transaction in TRNASACTION_LIST" :class="SELECTED_TRANSACTION_LIST.includes(transaction) ? 'transaction_row selected' : 'transaction_row'">
                                    <td>
                                        <input class="select" type="checkbox"
                                        @change="selectTransactionRow(transaction)" 
                                        :checked="SELECTED_TRANSACTION_LIST.includes(transaction)">

                                    </td>
                                    <td>{{ transaction.type }}</td>
                                    <td>{{ datetimeFormatter(transaction.datetime) }}</td>
                                    <td>{{ transaction.expand.bank.BankType }}<br/><small>{{ transaction.expand.bank.AccountNumber }}</small></td>
                                    <td>{{ transaction.description }}</td>
                                    <td>{{ transaction.money.toLocaleString() }}</td>

                                </tr>
                            </tbody>

                        </table>
                    </div>
                    <div class="createSettings">
                        <div class="option">
                            <div class="option-line">
                                <input class="select" type="radio" v-model="ADD_TYPE" value="GENERAL"
                                    :disabled="SELECTED_TRANSACTION_LIST.length == 0">
                                <span class="option-name">일반</span>
                                <span class="option-description">선택한 항목을 모두 장부에 추가합니다.</span>
                            </div>
                            <div class="option-line">
                                <input class="select" type="radio" v-model="ADD_TYPE" value="SPLIT"
                                :disabled="SELECTED_TRANSACTION_LIST.length !== 1">
                                <span class="option-name">분할</span>
                                <span class="option-description">(단일 선택시) 선택한 한 항목을 분할하여 장부에 추가합니다.</span>
                            </div>

                        </div>
                        <div class="split">
                            <div class="spliter" v-if="ADD_TYPE == 'SPLIT'">
                                <div class="status">
                                    <div class="money-total">
                                        <span class="title">분할항목 합계</span>
                                        <span class="amount">{{ getSplitMoneyListSum().toLocaleString() }}원</span>
                                    </div>
                                    <div class="check-vaild">
                                        <template v-if="isSameSplitMoneyListAndSelectTransaction()">
                                            문제없이 선택한 거래의 금액과<br/>
                                            분할금액의 합계가 일치합니다.
                                        </template>
                                        <template v-else>
                                            반드시 분할금액의 합계는<br/>
                                            {{ SELECTED_TRANSACTION_LIST[0].type == "수입" ? "+" : "-" }}
                                            {{ SELECTED_TRANSACTION_LIST[0].money.toLocaleString() }}원
                                        </template>
                                    </div>
                                    <div class="split-add-type">
                                        <div class="select-line">
                                            <input class="select" type="radio" v-model="SPLIT_ADD_TYPE" value="수입">수입
                                        </div>
                                        <div class="select-line">
                                            <input class="select" type="radio" v-model="SPLIT_ADD_TYPE" value="지출">지출
                                        </div>
                                    </div>
                                    <div class="split-amount">
                                        <input class="number" type="text" v-model="SPLIT_ADD_MONEY" @input="formatNumber" placeholder="금액">
                                        <span class="currency">원</span>
                                        <button class="btn-add" @click="addSplitMoney">추가</button>
                                    </div>

                                </div>
                                <div class="split-money-result">
                                    <div class="split-money" v-for="split_money in SPLIT_ADD_MONEY_LIST">
                                        <i class="bi bi-trash-fill" @click="removeSplitMoney(split_money)"></i>
                                        <span class="gwan">
                                            <div class="money-plus" v-if="split_money.gwan == '수입'">+</div> 
                                            <div class="money-minus" v-if="split_money.gwan == '지출'">-</div>
                                            {{split_money.gwan}}
                                        </span>
                                        <span class="money">{{ split_money.money.toLocaleString() }}원</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="add" v-if="SELECTED_TRANSACTION_LIST.length">
                            <button class="add_button" v-if="SELECTED_TRANSACTION_LIST.length != 0 && ADD_TYPE == 'GENERAL'" @click="createLedgerRecord">
                                <small>{{ SELECTED_TRANSACTION_LIST.length }}건</small>
                                <strong>추가하시겠습니까?</strong>
                            </button>
                            <button class="add_button" v-if="isSameSplitMoneyListAndSelectTransaction() == true && ADD_TYPE == 'SPLIT'" @click="createLedgerRecord">
                                <small>{{ SPLIT_ADD_MONEY_LIST.length }}건</small>
                                <strong>추가하시겠습니까?</strong>
                            </button>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    </template>
</template>

<style scoped>
.modal-content {
    width: 1280px;
    max-width: 95vw;
    height: 720px;
    max-height: 90vh;
    border-radius: 10px;
    padding: 50px;

    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-content > .modal-header {
    width: 100%;
    height: 100px;

    display: flex;
    flex-direction: row;
}

.modal-content > .modal-header > .meta {
    flex:1;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.modal-content > .modal-header > .meta > span.title {
    font-size: 30px;
    font-weight: 800;
}

.modal-content > .modal-header > .meta > span.description {
    font-size: 16px;
    font-weight: 600;
}

.modal-content > .modal-header > .close {
    flex:1;
    width: 100%;
    display: flex;

    justify-content: end;
}

.modal-content > .modal-header > .close > button.close-btn {
    height: 30px;
    border: unset;
    background-color: var(--light-color);
    padding: 5px 20px;
    
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 600;
    font-size: 14px;

    border-radius: 10px;

    transition: all 0.25s ease;
}

.modal-content > .modal-header > .close > button.close-btn > i {
    font-size: 12px;
    transition: transform 0.25s ease;
}

.modal-content > .modal-header > .close > button.close-btn:hover {
    cursor: pointer;
    background-color: var(--danger-color);
    color: white;
}

.modal-content > .modal-header > .close > button.close-btn:hover > i {
    transform: rotate(90deg);
}

.modal-content > .modal-function {
    display: flex;
    width: 100%;
    flex: 1;
    min-height: 0;
}


.modal-content > .modal-function > .selectTransaction {
    width: 50%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
}

table.transaction {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;   /* 열 너비 고정 */
  font-size: 0.8em;

  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

table.transaction thead,
table.transaction tbody tr {
  width: 100%;
  table-layout: fixed;
}

table.transaction tbody {
  max-height: 630px;
  overflow-y: auto;
}

tr.transaction_pin {
  height: 30px;
  background-color: var(--light-color);
  border-top: 1px solid var(--medium-color);
  border-bottom: 1px solid var(--medium-color);
}

tr.transaction_row {
  height: 65px;
  font-weight: 500;
  border-bottom: 1px solid var(--medium-color);
}

tr.transaction_row.selected {
  background-color: var(--light-color);
}

table.transaction th,
table.transaction td {
  position: relative;
  padding: 0 16px;
  text-align: left;
  font-weight: 500;
}

table.transaction tbody tr:hover {
  background-color: #f9f9f9;
}

table.transaction tbody tr.selected {
  background-color: var(--light-color);
}



input.select[type='checkbox'] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--medium-color);
    border-radius: 3px;
    cursor: pointer;
    position: relative;

    background-color: var(--none-color);
    vertical-align: middle;
    transition: all 0.15s ease;
}

input.select[type='checkbox']:hover {
    border-color: var(--strong-color);
}

input.select[type='checkbox']:checked {
    background-color: var(--strong-color);
    border-color: var(--strong-color);
}

input.select[type='checkbox']:checked::after {
    content: "\F26E";
    font-family: "bootstrap-icons";
    color: var(--none-color);
    font-size: 12px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}


.modal-content > .modal-function > .createSettings {
    width: 50%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 30px;
    overflow-y: auto;
}

.modal-content > .modal-function > .createSettings > .option {
    width: 100%;
    flex-shrink: 0;
    display: flex;

    flex-direction: column;
    gap:20px;

    padding-left: 50px;
    box-sizing: border-box;
}

.modal-content > .modal-function > .createSettings > .split {
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;

    flex-direction: column;
    gap:20px;

    padding-left: 50px;
    box-sizing: border-box;

}

.modal-content > .modal-function > .createSettings > .add {
    width: 100%;
    flex-shrink: 0;
    display: flex;

    flex-direction: column;
    gap:20px;

    padding-left: 50px;
    box-sizing: border-box;

}


.modal-content > .modal-function > .createSettings > .option > .option-line{
    width: 100%;
    display: flex;
    gap: 8px;

    align-items: center;
}

.modal-content > .modal-function > .createSettings > .option > .option-line > span.option-name{
    font-size: 19px;
    font-weight: 700;
}

.modal-content > .modal-function > .createSettings > .option > .option-line > span.option-description{
    font-size: 15px;
    font-weight: 500;
}


input.select[type='radio'] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;

    margin: 0;
    width: 14px;
    height: 14px;
    border: 1px solid var(--medium-color);
    border-radius: 30px;
    cursor: pointer;
    position: relative;

    background-color: var(--none-color);
    vertical-align: middle;
    transition: all 0.15s ease;
}

input.select[type='radio']:hover {
    border-color: var(--strong-color);
}

input.select[type='radio']:checked {
    background-color: var(--strong-color);
    border-color: var(--strong-color);
}

input.select[type='radio']:checked::after {
    content: "\F26E";
    font-family: "bootstrap-icons";
    color: var(--none-color);
    font-size: 12px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.modal-content > .modal-function > .createSettings > .split > .spliter {
    width: 100%;
    height: 100%;
    min-height: 400px;
    background-color: var(--light-color);
    border-radius: 15px;

    display: flex;
    flex-direction: row;

}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status {
    width: 50%;
    height: 100%;
    
    padding-left: 30px;
    padding-top: 30px;
    padding-bottom: 30px;

    box-sizing: border-box;

    display: flex;
    flex-direction: column;
    justify-content: end;

    gap:20px;

}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .money-total {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .money-total > span.amount, 
.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .money-total > span.title {
    font-size: 20px;
    font-weight: 700;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .check-vaild {
    width: 100%;
    font-weight: 500;
    font-size: 15px;
    line-height: 20px;
}


.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-add-type {
    width: 100%;

    display: flex;
    gap: 15px;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-add-type > .select-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 15px;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount {
    width: 100%;
    display: flex;
    gap: 5px;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > .number{
    all:unset;
    font-size: 16px;
    font-weight: 700;
    text-align: right;
    width: 60px;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > span.currency{
    font-size: 16px;
    font-weight: 700;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > button.btn-add {
  border-radius: 6px;
  border: none;
  cursor: pointer;

  font-size: 10px;
  font-weight: 600;


  margin-left:5px;
  padding:2px 7px;
  background-color: var(--strong-color);
  color: var(--none-color);

  transition: all 0.2s ease;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > button.btn-add:hover {
  background-color: #444;
  color: white;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > button.btn-add:active {
  transform: scale(0.96);
}


.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result {
    width: 50%;
    height: 100%;
    
    padding-right: 30px;
    padding-top: 30px;
    padding-bottom: 30px;

    box-sizing: border-box;
    overflow-y: scroll;

    display: flex;
    align-items: end;
    gap: 10px;

    flex-direction: column;

}

.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money {
    background-color: var(--none-color);
    border-radius: 5px;

    width: 80%;
    min-height: 30px;

    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
}


.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > i {
    width: 20%;
    height: 100%;
    display: flex;
    justify-content: end;
    font-size: 14px;
    align-items: center;
    cursor: pointer;
    color: var(--medium-color);
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > i:hover {
    color: var(--strong-color);
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.gwan {
    width: 18%;
    text-align: center;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.gwan > .money-plus {
    color: var(--danger-color);

}

.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.gwan > .money-minus {
    color: var(--primary-color);
}

.modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.money {
    width: 62%;
    text-align: right;
    font-weight: 600;
    font-size: 14px;
    padding-right: 25px;
    box-sizing: border-box;
}


button.add_button {
  display: flex;
  justify-content: center;
  gap: 10px;
  
  width: 100%;
  padding: 8px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background-color: var(--strong-color);
  color: var(--none-color); 
}

button.add_button > small {
  font-size: 13px;
  font-weight: 600;
  background-color: white;
  color: var(--strong-color);
  padding: 4px;
  border-radius:10px;
}

button.add_button > strong{
  display: flex;
  align-items: center;
  font-weight: 500;
  font-size: 16px;
}

button.add-transaction {
    all: unset;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    width: 200px;
    padding: 8px 12px;


    border-radius: 8px;
    background-color: var(--light-color);
    color: var(--primary-color);
    cursor: pointer;

    transition: background-color 0.2s ease, transform 0.1s ease;
}

 button.add-transaction:hover {
    background-color: var(--primary-color);
    color: var(--light-color);
}

button.add-transaction:hover i {
    color: var(--light-color);
}

button.add-transaction:hover small {
    background-color: var(--none-color);
    color: var(--primary-color);
}

button.add-transaction:active {
    transform: scale(0.97);
}


button.add-transaction > small {
  font-size: 13px;
  font-weight: 600;
  background-color: var(--primary-color);
  color: var(--none-color);
  padding: 4px;
  border-radius:10px;
}

button.add-transaction > strong{
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 16px;
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .modal-content,
[data-theme="dark"] .modal-content {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-header > .meta > span.title,
[data-theme="dark"] .modal-content > .modal-header > .meta > span.title {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-header > .meta > span.description,
[data-theme="dark"] .modal-content > .modal-header > .meta > span.description {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .modal-content > .modal-header > .close > button.close-btn,
[data-theme="dark"] .modal-content > .modal-header > .close > button.close-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) tr.transaction_pin,
[data-theme="dark"] tr.transaction_pin {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) tr.transaction_row,
[data-theme="dark"] tr.transaction_row {
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) tr.transaction_row.selected,
[data-theme="dark"] tr.transaction_row.selected {
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) table.transaction tbody tr:hover,
[data-theme="dark"] table.transaction tbody tr:hover {
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) input.select[type='checkbox'],
[data-theme="dark"] input.select[type='checkbox'] {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) input.select[type='radio'],
[data-theme="dark"] input.select[type='radio'] {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .option > .option-line > span.option-name,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .option > .option-line > span.option-name {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .option > .option-line > span.option-description,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .option > .option-line > span.option-description {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter {
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .money-total > span,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .money-total > span {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .check-vaild,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .check-vaild {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-add-type > .select-line,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-add-type > .select-line {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > .number,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > .number {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > span.currency,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .status > .split-amount > span.currency {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money {
    background-color: var(--bg-secondary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.gwan,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.gwan {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.money,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > span.money {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > i,
[data-theme="dark"] .modal-content > .modal-function > .createSettings > .split > .spliter > .split-money-result > .split-money > i {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) button.add-transaction,
[data-theme="dark"] button.add-transaction {
    background-color: var(--bg-tertiary);
    color: var(--primary-500);
}

:deep([data-theme="dark"]) button.add-transaction:hover,
[data-theme="dark"] button.add-transaction:hover {
    background-color: var(--primary-600);
    color: var(--text-primary);
}

</style>

<script>
import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

import './style.css'

export default {
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

    watch: {
        async filterStartDate(){
            await this.getNotAddedTransactionList()
        },

        async filterEndDate(){
            await this.getNotAddedTransactionList()
        }
    },  
    
    async mounted(){
        window.addEventListener('keydown', this.closeModal)
        await this.getNotAddedTransactionList()
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
                this.$emit("refresh")
                this.addTransactionModalStatus = false
            }
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

            this.closeModal({key:"Escape"})
        }
        
    }
}
</script>
