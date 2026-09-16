/*
  PDF를 쪽마다 그림으로 옮긴다.

  영수증은 카드전표처럼 PDF로 오는 일이 흔한데, 장부에 붙는 증빙은 그림이라
  사람이 손으로 캡처해 한 장씩 올리고 있었다. 여러 쪽이면 그만큼 되풀이한다.

  pdf.js는 무겁다(1MB가 넘는다). 장부를 열 때마다 들고 오면 첫 화면이 그만큼 늦어지므로,
  PDF를 실제로 고른 그 순간에만 불러온다.
*/

/** 긴 변을 이만큼으로 맞춘다. A4를 200dpi로 훑은 것과 비슷한 크기 */
const TARGET_LONG_EDGE = 1800

/** 아무리 큰 원본이라도 이 배 이상으로는 키우지 않는다 (작은 쪽이 지나치게 커지는 것을 막는다) */
const MAX_SCALE = 4

/** 종이 사진은 JPEG이 PNG보다 훨씬 작다. 글씨가 뭉개지지 않는 선 */
const JPEG_QUALITY = 0.82

let pdfjsPromise = null

/** pdf.js는 한 번만 불러 온다 */
function loadPdfjs() {
    if (!pdfjsPromise) {
        pdfjsPromise = (async () => {
            const pdfjs = await import('pdfjs-dist')
            // 일꾼(worker)을 따로 띄워야 큰 PDF를 푸는 동안 화면이 굳지 않는다
            const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
            pdfjs.GlobalWorkerOptions.workerSrc = worker.default
            return pdfjs
        })()
    }
    return pdfjsPromise
}

export function isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

/** 확장자를 뗀 이름. 쪽 번호를 붙이려고 쓴다 */
function baseName(name) {
    return name.replace(/\.[^.]+$/, '')
}

/**
 * PDF 한 개를 쪽마다 JPEG 파일로 바꾼다.
 *
 * @param {File} file
 * @param {(done: number, total: number) => void} [onProgress] 쪽을 하나 끝낼 때마다 부른다
 * @returns {Promise<File[]>} 쪽 차례대로
 */
export async function pdfToImageFiles(file, onProgress) {
    const pdfjs = await loadPdfjs()

    const buffer = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buffer }).promise

    try {
        const out = []
        const stem = baseName(file.name)

        for (let n = 1; n <= doc.numPages; n += 1) {
            const page = await doc.getPage(n)

            try {
                // 원래 크기를 먼저 재고, 긴 변이 목표에 닿도록 배율을 잡는다
                const base = page.getViewport({ scale: 1 })
                const scale = Math.min(MAX_SCALE, TARGET_LONG_EDGE / Math.max(base.width, base.height))
                const viewport = page.getViewport({ scale })

                const canvas = document.createElement('canvas')
                canvas.width = Math.round(viewport.width)
                canvas.height = Math.round(viewport.height)

                const ctx = canvas.getContext('2d')

                // PDF 쪽은 바탕이 비어 있을 수 있다. JPEG은 투명을 모르므로 흰 종이를 먼저 깐다
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                await page.render({ canvasContext: ctx, viewport }).promise

                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob(
                        b => (b ? resolve(b) : reject(new Error('쪽을 그림으로 바꾸지 못했습니다'))),
                        'image/jpeg',
                        JPEG_QUALITY,
                    )
                })

                // 쪽 번호를 자릿수 맞춰 붙인다 — 파일 이름으로 늘어놔도 차례가 맞는다
                const pad = String(doc.numPages).length
                const label = String(n).padStart(pad, '0')
                out.push(new File([blob], `${stem}-${label}.jpg`, { type: 'image/jpeg' }))

                // 큰 PDF에서 canvas가 쌓이면 메모리를 그대로 먹는다
                canvas.width = 0
                canvas.height = 0

                onProgress?.(n, doc.numPages)
            } finally {
                page.cleanup()
            }
        }

        return out
    } finally {
        await doc.destroy()
    }
}

/** PDF가 몇 쪽인지만 먼저 본다 — 옮기기 전에 사람에게 알려 주려고 */
export async function pdfPageCount(file) {
    const pdfjs = await loadPdfjs()
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    try {
        return doc.numPages
    } finally {
        await doc.destroy()
    }
}
