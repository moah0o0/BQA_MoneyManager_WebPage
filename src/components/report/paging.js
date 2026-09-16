/*
  종이 한 장에 몇 줄이 들어가는지를 미리 적어 두지 않는다.

  전에는 "한 쪽에 25줄"처럼 숫자를 박아 두었다. 그래서 목이 몇 개 없는 달에는
  종이 아래가 텅 비고, 목이 스무 개 넘는 항이 하나라도 있으면 그 항이 통째로
  다음 쪽으로 밀렸다가 종이 밖으로 넘쳤다. 장부내용이 길어 줄바꿈되면
  줄 높이 자체가 달라지니, 어떤 숫자를 적어도 언젠가는 틀린다.

  그래서 숫자를 적는 대신 보이지 않는 자리에 모든 줄을 한 번 그려 놓고,
  그 높이를 자로 재서 나눈다. 글꼴이 바뀌든 글이 길든 결과가 맞는다.

  쓰는 쪽에서 갖춰야 할 것:
    - reportRows : 줄 하나하나를 적은 배열 (computed)
    - ref="stage"      : 자로 쓸 보이지 않는 .PAGE
    - ref="stageTable" : 그 안에서 모든 줄을 담고 있는 table
  줄에 붙일 수 있는 표시:
    - keepWithNext : 다음 줄과 떨어지면 안 된다 (항 머리만 남기지 않기)
    - groupHead / groupEnd : 묶음의 처음과 끝. 묶음이 쪽을 넘어가면
      pageContinuationRow()로 '(이어서)' 머리를 다시 얹는다
*/

/** A4 세로 비율. .PAGE의 aspect-ratio와 같은 값이어야 한다 */
const A4_RATIO = 1.414

/** 재는 값과 실제 인쇄 사이의 오차를 흡수할 여유 (px) */
const SAFETY_PX = 6

export default {
    data() {
        return {
            /** 잰 결과. 쪽마다 줄 배열 하나 */
            measuredPages: [],
        }
    },

    computed: {
        /**
         * 화면에 그릴 쪽들.
         * 아직 재지 못했으면 한 장에 몰아서라도 내용은 보여 준다 — 빈 보고서보다 낫다.
         */
        pages() {
            if (this.measuredPages.length) return this.measuredPages
            return this.reportRows.length ? [this.reportRows] : []
        },
    },

    watch: {
        reportRows() {
            this.schedulePageMeasure()
        },
    },

    mounted() {
        this.schedulePageMeasure()

        // 글꼴(Pretendard)은 뒤늦게 도착한다. 그 전에 잰 높이는 대체 글꼴 기준이라
        // 글꼴이 바뀌는 순간 줄 높이가 달라진다 — 다 온 뒤에 한 번 더 잰다
        document.fonts?.ready.then(() => this.schedulePageMeasure())

        this.onViewportResize = () => this.schedulePageMeasure()
        window.addEventListener('resize', this.onViewportResize)
    },

    beforeUnmount() {
        window.removeEventListener('resize', this.onViewportResize)
        clearTimeout(this.pageMeasureTimer)
    },

    methods: {
        schedulePageMeasure() {
            clearTimeout(this.pageMeasureTimer)
            // 창 크기를 끌고 있는 동안 매 픽셀마다 다시 재지 않는다
            this.pageMeasureTimer = setTimeout(() => {
                this.$nextTick(() => this.measurePages())
            }, 60)
        },

        measurePages() {
            const stage = this.$refs.stage
            const table = this.$refs.stageTable
            const rows = this.reportRows

            if (!stage || !table || !rows.length) {
                this.measuredPages = []
                return
            }

            const body = table.tBodies[0]
            const trs = body ? Array.from(body.rows) : []
            // 아직 다 그려지지 않았으면 다음에 다시 잰다
            if (trs.length !== rows.length) return

            const stageBox = stage.getBoundingClientRect()
            if (!stageBox.width) return

            // 종이 높이는 너비에서 나온다 — .PAGE의 aspect-ratio가 곧 A4 비율이다
            const paperHeight = stageBox.width * A4_RATIO
            const padBottom = parseFloat(getComputedStyle(stage).paddingBottom) || 0

            // 머리글과 표 제목줄이 먹는 만큼을 빼면 줄이 들어설 자리가 남는다.
            // 사이 여백까지 한꺼번에 재려고 '표 몸통이 시작하는 자리'를 쓴다.
            const bodyTop = body.getBoundingClientRect().top - stageBox.top
            const limit = paperHeight - padBottom - bodyTop - SAFETY_PX
            if (limit <= 0) return

            const heights = trs.map(tr => tr.getBoundingClientRect().height)
            this.measuredPages = this.packRows(rows, heights, limit)
        },

        /** 잰 높이대로 줄을 쪽에 담는다 */
        packRows(rows, heights, limit) {
            const pages = []
            let current = []
            let used = 0
            let group = null
            let groupHeight = 0

            const flush = () => {
                if (current.length) pages.push(current)
                current = []
                used = 0
            }

            rows.forEach((row, index) => {
                const height = heights[index]

                // 항 머리만 종이 끝에 덩그러니 남기지 않는다 — 다음 줄까지 들어갈 자리가 있어야 시작한다
                const need = row.keepWithNext ? height + (heights[index + 1] || 0) : height

                // 첫 줄은 아무리 커도 일단 놓는다. 안 그러면 갈 곳이 없다
                if (current.length && used + need > limit) {
                    flush()

                    // 묶음이 쪽을 넘어가면 무슨 항인지 다시 알려 준다
                    if (group && !row.groupHead && this.pageContinuationRow) {
                        const continued = this.pageContinuationRow(group)
                        if (continued) {
                            current.push(continued)
                            used += groupHeight
                        }
                    }
                }

                current.push(row)
                used += height

                if (row.groupHead) {
                    group = row
                    groupHeight = height
                } else if (row.groupEnd) {
                    group = null
                    groupHeight = 0
                }
            })

            flush()
            return pages
        },
    },
}
