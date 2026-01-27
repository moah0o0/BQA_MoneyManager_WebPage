<template>
    <template v-for="(ledger, ledgerIndex) in receiptIncludeLedgerList">
        <div class="PAGE" v-for="(page, pageIndex) in paginateRecord(ledger)">
            
            <div class="PAGE_HEADER">
                <div class="page-meta">
                    <span class="subtitle">{{ organizationName }}</span>
                    <span class="title">지출결의서</span>
                    <span class="description">{{ formattedDateRange }}</span>
                </div>
                <div class="page-info">
                    <span class="currency-unit">(단위: 원)</span>
                    <span class="page-number">
                        총 {{ totalReceiptPages }}쪽 중 {{ getGlobalPageNumber(ledgerIndex, pageIndex) }}번째
                    </span>
                </div>
            </div>
            
            <div class="PAGE_CONTENT">
                
                <table class="resolution-table repeating-table">
                    <tbody>
                        <tr>
                            <th style="width:20%">거래일시</th>
                            <td style="width:80%">{{ formatDateTime(ledger.expand.transaction.datetime) }}</td>
                        </tr>
                        <tr>
                            <th>계정과목</th>
                            <td>{{ ledger.gwan }} > 
                                <AssetsLabel :asset-type="'Hang'" :asset="ledger.expand.hang"/> > 
                                <AssetsLabel :asset-type="'Mok'" :asset="ledger.expand.mok"/> > 
                                <AssetsLabel :asset-type="'Saemok'" :asset="ledger.expand.saemok"/></td>
                        </tr>
                        <tr>
                            <th>장부금액</th>
                            <td class="amount-cell">{{ formatCurrency(ledger.money) }}</td>
                        </tr>
                        <tr>
                            <th>장부내용</th>
                            <td>{{ ledger.reason || ledger.content }}</td>
                        </tr>
                        <tr>
                            <th>증빙건수</th>
                            <td>총 {{ page.total }}건(현재 {{ pageIndex + 1 }}번째)</td>
                        </tr>
                    </tbody>
                </table>

                <div class="receipt-area-container">
                    <div class="receipt-item">
                        <div class="receipt-box"> 
                            <img :src="getFileUrl(ledger, page.filename)" class="receipt-image">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </template>
</template>

<script>
import './style.css' 

import PocketBase from 'pocketbase';
const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

import AssetsLabel from './AssetsLabel.vue';

export default {
    
    props:[
        'organizationName', 
        'startYearMonth', 
        'endYearMonth',   
        'hangList', // 사용하지 않지만 Prop 목록에 유지
        'mokList',  // 사용하지 않지만 Prop 목록에 유지
        'ledgerList' // 원본 데이터
    ],


    components: {
        AssetsLabel
    },

    computed:{

        totalReceiptPages() {
            if (!this.receiptIncludeLedgerList) return 0;
            
            return this.receiptIncludeLedgerList.reduce((total, ledger) => {
                return total + (ledger.receipt ? ledger.receipt.length : 0);
            }, 0);
        },
        formattedDateRange() {
            if (!this.startYearMonth || !this.endYearMonth) return '';
            const s = String(this.startYearMonth);
            const e = String(this.endYearMonth);
            const formatMonth = (str) => Number(str.substring(4, 6));

            return `${s.substring(0, 4)}년 ${formatMonth(s)}월 ~ ${e.substring(0, 4)}년 ${formatMonth(e)}월`;
        },
        
        /**
         * 지출 Ledger 중 영수증이 첨부된 (또는 영수증이 필요하다고 명시되지 않은) 레코드만 필터링하고 정렬합니다.
         * 템플릿의 v-for 변수명(receiptIncludeLedgerList)과 일치하도록 이름 지정
         */
        receiptIncludeLedgerList() {
            if (!this.ledgerList) return [];
            
            return this.ledgerList
                // 지출이고, 영수증이 필요 없는 항목(not_need_receipt)이 아니며, 영수증 파일이 하나 이상 첨부된 레코드만 필터링합니다.
                .filter(record => 
                    record.gwan === '지출' && 
                    !record.not_need_receipt &&
                    Array.isArray(record.receipt) && 
                    record.receipt.length > 0
                )
                // 날짜 기준으로 정렬
                .sort((a, b) => {
                    const dtA = this.formatDateTime(a.expand.transaction.datetime);
                    const dtB = this.formatDateTime(b.expand.transaction.datetime);
                    return dtA.localeCompare(dtB);
                });
        },
    },

    methods: {
        formatCurrency(number) {
            if (number === undefined || number === null) return '0';
            return number.toLocaleString('ko-KR');
        },
        
        formatDateTime(dateTimeNum) {
            if (!dateTimeNum) return '';
            const s = String(dateTimeNum).padStart(12, '0');
            return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
        },
        
        getFileUrl(record, filename) {
            return pb.files.getURL(record, filename); 
        },
        

        paginateRecord(record) {
            const pages = [];

            for (const receipt of record.receipt) {
                pages.push({
                    total: record.receipt.length,
                    filename: receipt,
                });
            }

            return pages;
        },

        // 전체 페이지 번호 계산 (ledgerIndex 이전 ledger들의 영수증 개수 + pageIndex + 1)
        getGlobalPageNumber(ledgerIndex, pageIndex) {
            let count = 0;
            for (let i = 0; i < ledgerIndex; i++) {
                const ledger = this.receiptIncludeLedgerList[i];
                count += ledger.receipt ? ledger.receipt.length : 0;
            }
            return count + pageIndex + 1;
        },
    }
}
</script>