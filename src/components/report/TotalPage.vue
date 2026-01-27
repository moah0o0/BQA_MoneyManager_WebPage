<template>
    <div class="PAGE" 
         v-for="(page, pageIndex) in pagedAssetsResults" 
         :key="pageIndex">
        
        <div class="PAGE_HEADER">
            <div class="page-meta">
                <span class="subtitle">{{ organizationName }}</span>
                <span class="title">수입지출결산서</span>
                <span class="description">{{ formattedStartDate }} ~ {{ formattedEndDate }}</span>
            </div>
            <div class="page-info">
                <span class="currency-unit">(단위: 원)</span>
                <span class="page-number">총 {{ pagedAssetsResults.length }}쪽 중 {{ pageIndex + 1 }}번째</span>
            </div>
        </div>
        
        <div class="PAGE_CONTENT">
            <table>
                <thead>
                    <tr>
                        <th style="width:5%">항</th>
                        <th style="width:50%">목</th> 
                        <th style="width:15%">수입금액</th>
                        <th style="width:15%">지출금액</th>
                        <th style="width:15%">차이금액</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(hang) in page.items" :key="hang.id">
                        <tr class="hang-row">
                            <td colspan="2"><AssetsLabel :asset-type="'Hang'" :asset="hang"/></td> 
                            <td>{{ formatCurrency(hang.incomeTotal) }}</td>
                            <td>{{ formatCurrency(hang.expenseTotal) }}</td>
                            <td>{{ formatCurrency(hang.differenceTotal) }}</td>
                        </tr>
                        
                        <tr class="mok-row" v-for="mok in hang.mokList" :key="mok.id">
                            <td></td>
                            <td><AssetsLabel :asset-type="'Mok'" :asset="mok"/></td>
                            <td>{{ formatCurrency(mok.income) }}</td>
                            <td>{{ formatCurrency(mok.expense) }}</td>
                            <td>{{ formatCurrency(mok.difference) }}</td>
                        </tr>
                    </template>

                    <tr class="total-row" v-if="page.includeTotal">
                        <td colspan="2">총계</td>
                        <td>{{ formatCurrency(FINANCIAL_SUMMARY.incomeTotal) }}</td>
                        <td>{{ formatCurrency(FINANCIAL_SUMMARY.expenseTotal) }}</td>
                        <td>{{ formatCurrency(FINANCIAL_SUMMARY.differenceTotal) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
    </div>
</template>


<script>
import './style.css'
import AssetsLabel from './AssetsLabel.vue';

export default {
    components: {
        AssetsLabel
    },


    props:[
        'startYearMonth', 
        'endYearMonth', 
        'organizationName', 
        'hangList', 
        'mokList', 
        'ledgerList'
    ],

    data() {
        return {
            ASSETS_RESULT: [],
            FINANCIAL_SUMMARY: {
                incomeTotal: 0,
                expenseTotal: 0,
                differenceTotal: 0
            }
        }
    },
    
    watch: {
        ledgerList: {
            immediate: true, 
            handler(newVal) {
                if (newVal) this.getAssetsResult();
            }
        }
    },

    computed:{
        formattedStartDate() {
            if (!this.startYearMonth) return '';
            const s = this.startYearMonth.toString();
            const year = s.substring(0, 4);
            const month = parseInt(s.substring(4, 6));
            return `${year}년 ${month}월`;
        },

        formattedEndDate() {
            if (!this.endYearMonth) return '';
            const s = this.endYearMonth.toString();
            const year = s.substring(0, 4);
            const month = parseInt(s.substring(4, 6));
            return `${year}년 ${month}월`;
        },

        pagedAssetsResults() {
            const MAX_ROWS_PER_PAGE = 25; 
            
            const pages = this.ASSETS_RESULT.reduce((acc, hang) => {
                const requiredRows = 1 + hang.mokList.length;
                let currentPage = acc.length > 0 ? acc[acc.length - 1] : null;

                if (!currentPage || currentPage.currentRowCount + requiredRows > MAX_ROWS_PER_PAGE) {
                    if (currentPage && currentPage.items.length > 0) {
                        currentPage.includeTotal = false;
                    }
                    
                    currentPage = {
                        items: [],
                        currentRowCount: 0,
                        includeTotal: true
                    };
                    acc.push(currentPage);
                }

                currentPage.items.push(hang);
                currentPage.currentRowCount += requiredRows;
                return acc;
            }, []);

            if (pages.length > 1) {
                pages.slice(0, -1).forEach(page => {
                    page.includeTotal = false;
                });
            }
            
            return pages.map(page => {
                const { currentRowCount, ...rest } = page;
                return rest;
            });
        }
    },

    methods: {
        formatCurrency(number) {
            if (number === undefined || number === null) return '0';
            return number.toLocaleString('ko-KR');
        },
        
        // 데이터 집계 로직
        getAssetsResult() {
            if (!this.hangList || !this.mokList || !this.ledgerList) {
                this.ASSETS_RESULT = [];
                return;
            }
            
            this.FINANCIAL_SUMMARY = { incomeTotal: 0, expenseTotal: 0, differenceTotal: 0 };

            const hangRecords = this.hangList
            const mokRecords = this.mokList
            const ledgerRecords = this.ledgerList
            
            // 1. Map 초기화
            const hangMap = new Map(hangRecords.map(h => [h.id, {
                ...h,
                incomeTotal: 0, expenseTotal: 0, mokMap: new Map()
            }]));
            
            mokRecords.forEach(m => {
                const hang = hangMap.get(m.parent_hang);
                if (hang) hang.mokMap.set(m.id, { ...m, income: 0, expense: 0 });
            });
            
            // 2. Ledger 집계
            ledgerRecords.forEach(record => {
                const { hang, mok, money = 0, gwan } = record;
                const hangData = hangMap.get(hang);
                const mokData = hangData?.mokMap.get(mok);

                if (hangData && mokData) {
                    if (gwan === '수입') {
                        mokData.income += money;
                        hangData.incomeTotal += money;
                        this.FINANCIAL_SUMMARY.incomeTotal += money;
                    } else if (gwan === '지출') {
                        mokData.expense += money;
                        hangData.expenseTotal += money;
                        this.FINANCIAL_SUMMARY.expenseTotal += money;
                    }
                }
            });
            
            this.FINANCIAL_SUMMARY.differenceTotal = this.FINANCIAL_SUMMARY.incomeTotal - this.FINANCIAL_SUMMARY.expenseTotal;

            // 3. 최종 결과 배열 생성 (수입/지출 모두 0인 항목 제외)
            let finalResult = Array.from(hangMap.values())
                .map(hang => {
                    hang.differenceTotal = hang.incomeTotal - hang.expenseTotal;

                    // 목 중 수입/지출이 모두 0인 항목 제외
                    const mokList = Array.from(hang.mokMap.values())
                        .filter(mok => mok.income !== 0 || mok.expense !== 0)
                        .map(mok => ({
                            ...mok,
                            difference: mok.income - mok.expense
                        }));

                    return { ...hang, mokList };
                })
                // 항 중 수입/지출이 모두 0인 항목 제외
                .filter(hang => hang.incomeTotal !== 0 || hang.expenseTotal !== 0);
            
            // 4. ASSETS_RESULT에 최종 순서 및 데이터 설정
            this.ASSETS_RESULT = finalResult
                .map(({ mokMap, ...rest }, index) => ({
                    ...rest,
                    globalIndex: index + 1
                }));
        }
    }
}
</script>