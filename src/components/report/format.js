/** 보고서에서 함께 쓰는 자잘한 꼴 맞추기 */

export function formatCurrency(number) {
    if (number === undefined || number === null) return '0'
    return number.toLocaleString('ko-KR')
}

/**
 * 장부의 거래일시(YYYYMMDDHHmm)를 사람이 읽는 꼴로.
 * 보고서 기간은 해를 넘길 수 있으므로 연도를 빼면 안 된다.
 */
export function splitDateTime(dateTimeNumber) {
    if (!dateTimeNumber) return { date: '', time: '' }
    const s = String(dateTimeNumber).padStart(12, '0')
    return {
        date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`,
        time: `${s.slice(8, 10)}:${s.slice(10, 12)}`,
    }
}

/** YYYYMM을 '2025년 3월'로 */
export function formatYearMonth(yearMonth) {
    if (!yearMonth) return ''
    const s = yearMonth.toString()
    return `${s.substring(0, 4)}년 ${parseInt(s.substring(4, 6))}월`
}
