<template>
    <div class="tab-root none-select">
        <!--
            머리는 한 줄로 줄인다. 이 화면에서 봐야 하는 것은 과목 목록이지 제목이 아니다.
        -->
        <div class="head">
            <h1 class="page-title">계정과목</h1>
            <p class="page-desc">장부에서 고를 항 · 목 · 세목을 짭니다. 이름을 누르면 그 자리에서 고칩니다.</p>
            <div class="search-bar">
                <i class="bi bi-search" aria-hidden="true"></i>
                <label class="sr-only" for="assets-search">계정과목 검색</label>
                <input id="assets-search" type="search" v-model="query" class="search-input" placeholder="이름으로 찾기">
            </div>
        </div>

        <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
        <p v-if="errorMessage" class="notice notice-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{{ errorMessage }}</span>
        </p>

        <template v-if="loaded">
            <div class="assets-grid">
                <section class="panel" aria-labelledby="hang-mok-title">
                    <!-- 칸 이름 · 개수 · 손댈 단추를 한 줄에 모은다 -->
                    <div class="panel-bar">
                        <h2 id="hang-mok-title">항 · 목</h2>
                        <span class="count num">{{ HANGS.length }}항 · {{ activeMokCount }}목</span>

                        <div class="bar-acts">
                            <!-- 잠근 목은 평소엔 안 보인다. 풀려면 여기서 꺼내 본다 -->
                            <button
                                v-if="lockedCount > 0"
                                type="button"
                                class="bar-btn"
                                :class="{ on: showLocked }"
                                :aria-pressed="showLocked ? 'true' : 'false'"
                                :title="showLocked ? '잠근 목 감추기' : '잠근 목 꺼내 보기'"
                            @click="showLocked = !showLocked"
                            >
                                <i class="bi bi-lock-fill" aria-hidden="true"></i>
                                잠근 목 <span class="num">{{ lockedCount }}</span>
                            </button>
                            <button type="button" class="bar-btn" :title="allOpen ? '모두 접기' : '모두 펼치기'" @click="toggleAll">
                                <i :class="['bi', allOpen ? 'bi-chevron-contract' : 'bi-chevron-expand']" aria-hidden="true"></i>
                                {{ allOpen ? '모두 접기' : '모두 펼치기' }}
                            </button>
                            <button v-if="canEdit && !query" type="button" class="bar-btn primary" @click="createHang">
                                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                                항 더하기
                            </button>
                        </div>
                    </div>

                    <ul class="tree">
                        <template v-for="hang in visibleHangs" :key="hang.id">
                            <li class="row row-hang">
                                <!-- 목이 서른 넘게 펼쳐져 있으면 한 항을 보려고 한참 굴려야 한다 -->
                                <button
                                    type="button"
                                    class="fold"
                                    :aria-expanded="isOpen(hang.id) ? 'true' : 'false'"
                                    :aria-label="`${hang.label} ${isOpen(hang.id) ? '접기' : '펼치기'}`"
                                    @click="toggleFold(hang.id)"
                                >
                                    <i :class="['bi', isOpen(hang.id) ? 'bi-caret-down-fill' : 'bi-caret-right-fill']" aria-hidden="true"></i>
                                </button>
                                <span class="priority num">{{ zeroPad(hang.priority, 2) }}</span>
                                <InlineEditor
                                    v-if="canEdit"
                                    :value="hang.label"
                                    class="name name-hang"
                                    @change="rename('Hang', hang, $event)"
                                />
                                <span v-else class="name name-hang">{{ hang.label }}</span>
                                <span class="mok-count num">{{ moksOf(hang.id).length }}</span>

                                <div class="row-acts" v-if="canEdit && !query">
                                    <button type="button" class="icon-btn"
                                        :aria-label="`${hang.label}에 목 더하기`" title="목 더하기"
                                        @click="addMokTo(hang.id)">
                                        <i class="bi bi-plus-lg" aria-hidden="true"></i>
                                    </button>
                                    <button type="button" class="icon-btn" :disabled="isFirst(HANGS, hang)"
                                        :aria-label="`${hang.label} 위로`" title="위로"
                                        @click="move('Hang', HANGS, hang, -1)">
                                        <i class="bi bi-arrow-up" aria-hidden="true"></i>
                                    </button>
                                    <button type="button" class="icon-btn" :disabled="isLast(HANGS, hang)"
                                        :aria-label="`${hang.label} 아래로`" title="아래로"
                                        @click="move('Hang', HANGS, hang, 1)">
                                        <i class="bi bi-arrow-down" aria-hidden="true"></i>
                                    </button>
                                    <button type="button" class="icon-btn danger"
                                        :aria-label="`${hang.label} 항 지우기`" title="지우기"
                                        @click="removeHang(hang)">
                                        <i class="bi bi-trash3" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </li>

                            <li v-for="mok in (isOpen(hang.id) ? moksOf(hang.id) : [])" :key="mok.id"
                                class="row row-mok" :class="{ 'is-locked': mok.lock }">
                                <span class="priority num">{{ zeroPad(mok.priority, 3) }}</span>
                                <!-- 잠근 목은 이름도 못 고친다. 풀고 나서 고쳐야 한다 -->
                                <i v-if="mok.lock" class="bi bi-lock-fill lock-mark" aria-hidden="true"></i>
                                <InlineEditor
                                    v-if="canEdit && !mok.lock"
                                    :value="mok.label"
                                    class="name"
                                    @change="rename('Mok', mok, $event)"
                                />
                                <span v-else class="name">{{ mok.label }}<span v-if="mok.lock" class="sr-only"> (잠김)</span></span>

                                <div class="row-acts" v-if="canEdit && !query">
                                    <button type="button" class="icon-btn"
                                        :class="{ 'is-on': mok.lock }"
                                        :aria-pressed="mok.lock ? 'true' : 'false'"
                                        :aria-label="`${mok.label} ${mok.lock ? '잠금 풀기' : '잠그기'}`"
                                        :title="mok.lock ? '잠금 풀기' : '잠그기 — 더는 쓰지 않는 목을 숨긴다'"
                                        @click="toggleLock(mok)">
                                        <i :class="['bi', mok.lock ? 'bi-lock-fill' : 'bi-unlock']" aria-hidden="true"></i>
                                    </button>
                                    <template v-if="!mok.lock">
                                        <button type="button" class="icon-btn" :disabled="isFirst(moksOf(hang.id), mok)"
                                            :aria-label="`${mok.label} 위로`" title="위로"
                                            @click="move('Mok', moksOf(hang.id), mok, -1)">
                                            <i class="bi bi-arrow-up" aria-hidden="true"></i>
                                        </button>
                                        <button type="button" class="icon-btn" :disabled="isLast(moksOf(hang.id), mok)"
                                            :aria-label="`${mok.label} 아래로`" title="아래로"
                                            @click="move('Mok', moksOf(hang.id), mok, 1)">
                                            <i class="bi bi-arrow-down" aria-hidden="true"></i>
                                        </button>
                                        <button type="button" class="icon-btn danger"
                                            :aria-label="`${mok.label} 목 지우기`" title="지우기"
                                            @click="removeMok(mok)">
                                            <i class="bi bi-trash3" aria-hidden="true"></i>
                                        </button>
                                    </template>
                                </div>
                            </li>

                            <li v-if="isOpen(hang.id) && moksOf(hang.id).length === 0" :key="`none-${hang.id}`" class="row row-none">
                                아직 목이 없습니다
                            </li>
                        </template>

                        <li v-if="visibleHangs.length === 0" class="empty">
                            {{ query ? '찾는 이름이 없습니다.' : '아직 항이 없습니다. 오른쪽 위 + 항을 눌러 주세요.' }}
                        </li>
                    </ul>
                </section>

                <section class="panel" aria-labelledby="saemok-title">
                    <div class="panel-bar">
                        <h2 id="saemok-title">세목</h2>
                        <span class="count num">{{ SAEMOKS.length }}개</span>

                        <div class="bar-acts">
                            <button v-if="canEdit && !query" type="button" class="bar-btn primary" @click="createSaemok">
                                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                                세목 더하기
                            </button>
                        </div>
                    </div>

                    <p class="panel-note">모든 목이 함께 씁니다.</p>

                    <ul class="tree">
                        <li v-for="saemok in visibleSaemoks" :key="saemok.id" class="row row-saemok">
                            <span class="priority num">{{ zeroPad(saemok.priority, 4) }}</span>
                            <InlineEditor
                                v-if="canEdit && !saemok.is_none_field"
                                :value="saemok.label"
                                class="name"
                                @change="rename('Saemok', saemok, $event)"
                            />
                            <span v-else class="name">
                                {{ saemok.label }}
                                <span v-if="saemok.is_none_field" class="badge">기본</span>
                            </span>

                            <div class="row-acts" v-if="canEdit && !query && !saemok.is_none_field">
                                <button type="button" class="icon-btn" :disabled="isFirst(movableSaemoks, saemok)"
                                    :aria-label="`${saemok.label} 위로`" title="위로"
                                    @click="move('Saemok', movableSaemoks, saemok, -1)">
                                    <i class="bi bi-arrow-up" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="icon-btn" :disabled="isLast(movableSaemoks, saemok)"
                                    :aria-label="`${saemok.label} 아래로`" title="아래로"
                                    @click="move('Saemok', movableSaemoks, saemok, 1)">
                                    <i class="bi bi-arrow-down" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="icon-btn danger"
                                    :aria-label="`${saemok.label} 세목 지우기`" title="지우기"
                                    @click="removeSaemok(saemok)">
                                    <i class="bi bi-trash3" aria-hidden="true"></i>
                                </button>
                            </div>
                        </li>

                        <li v-if="visibleSaemoks.length === 0" class="empty">
                            {{ query ? '찾는 이름이 없습니다.' : '아직 세목이 없습니다.' }}
                        </li>
                    </ul>
                </section>
            </div>

            <p v-if="query" class="hint search-note">
                <i class="bi bi-info-circle" aria-hidden="true"></i>
                찾는 중에는 차례를 바꾸거나 더할 수 없습니다. 검색을 지우면 다시 됩니다.
            </p>
        </template>

        <p v-else class="empty" role="status">계정과목을 불러오는 중입니다…</p>
    </div>
</template>

<script>
import PocketBase from 'pocketbase';
import InlineEditor from './InlineEditor.vue'

const pb = new PocketBase(__POCKETBASE_API_BASE_URL__);

/** 갈래마다 컬렉션 이름과 번호 자릿수가 다르다 */
const KIND = {
    Hang: { coll: 'AssetsHang', label: '항', pad: 2 },
    Mok: { coll: 'AssetsMok', label: '목', pad: 3 },
    Saemok: { coll: 'AssetsSaemok', label: '세목', pad: 4 },
}

export default {
    props: ['loginStatus', 'canEdit', 'initDate'],

    components: { InlineEditor },

    data() {
        return {
            HANGS: [],
            MOKS: [],
            SAEMOKS: [],
            loaded: false,
            query: '',
            /** 접어 둔 항. 기본은 다 펼침 — 처음 온 사람은 무엇이 있는지부터 봐야 한다 */
            folded: new Set(),
            /** 잠근 목까지 보여 줄지. 잠그는 까닭이 '안 보이게'이므로 평소엔 감춘다 */
            showLocked: false,
            statusMessage: '',
            errorMessage: '',
        }
    },

    computed: {
        /** 찾는 말이 있으면 그것만 보여 준다. 과목이 많은 단체에서 화면을 훑지 않아도 되게 */
        visibleHangs() {
            if (!this.query.trim()) return this.HANGS
            const q = this.query.trim().toLowerCase()
            // 항 이름이 걸리거나, 그 아래 목이 걸리면 항도 함께 남긴다
            return this.HANGS.filter(h =>
                h.label.toLowerCase().includes(q)
                || this.moksOf(h.id).some(m => m.label.toLowerCase().includes(q))
            )
        },

        visibleSaemoks() {
            if (!this.query.trim()) return this.SAEMOKS
            const q = this.query.trim().toLowerCase()
            return this.SAEMOKS.filter(s => s.label.toLowerCase().includes(q))
        },

        /** 기본 세목(미지정)은 늘 맨 앞에 둔다 — 차례를 바꿀 수 있는 것만 따로 센다 */
        movableSaemoks() {
            return this.SAEMOKS.filter(s => !s.is_none_field)
        },

        allOpen() {
            return this.HANGS.every(h => this.isOpen(h.id))
        },

        lockedCount() {
            return this.MOKS.filter(m => m.lock).length
        },

        activeMokCount() {
            return this.MOKS.length - this.lockedCount
        },
    },

    watch: {
        loginStatus: {
            immediate: true,
            handler(on) { if (on) this.load() }
        }
    },

    methods: {
        zeroPad(n, len) {
            return String(n ?? 0).padStart(len, '0')
        },

        /** expand를 붙였을 때와 안 붙였을 때가 달라서 한곳에서 푼다 */
        parentId(mok) {
            return mok?.expand?.parent_hang?.id ?? mok?.parent_hang ?? null
        },

        moksOf(hangId) {
            const q = this.query.trim().toLowerCase()
            const list = this.MOKS
                .filter(m => this.parentId(m) === hangId)
                .filter(m => this.showLocked || !m.lock)
            if (!q) return list
            // 항 이름으로 걸렸으면 그 아래 목은 다 보여 준다
            const hang = this.HANGS.find(h => h.id === hangId)
            if (hang?.label.toLowerCase().includes(q)) return list
            return list.filter(m => m.label.toLowerCase().includes(q))
        },

        /** 찾는 중에는 다 펼친다 — 접힌 항 속에 결과가 숨으면 못 찾은 줄 안다 */
        isOpen(hangId) {
            return !!this.query.trim() || !this.folded.has(hangId)
        },

        toggleFold(hangId) {
            const next = new Set(this.folded)
            next.has(hangId) ? next.delete(hangId) : next.add(hangId)
            this.folded = next
        },

        toggleAll() {
            this.folded = this.allOpen ? new Set(this.HANGS.map(h => h.id)) : new Set()
        },

        /**
         * 목을 잠근다 / 푼다.
         * 더는 쓰지 않는 목을 지우면 그 목으로 적어 둔 옛 장부의 분류가 통째로 비어
         * 지난 보고서를 다시 뽑을 수 없게 된다. 잠그면 새로 고르지만 못하고 기록은 남는다.
         */
        async toggleLock(mok) {
            if (!this.canEdit) return

            const next = !mok.lock
            mok.lock = next   // 화면을 먼저 바꾼다

            try {
                await pb.collection('AssetsMok').update(mok.id, { lock: next })
                this.showStatus(next
                    ? `'${mok.label}'을(를) 잠갔습니다. 장부에서 더는 고를 수 없습니다`
                    : `'${mok.label}'의 잠금을 풀었습니다`)
            } catch (error) {
                console.error('Failed to toggle lock:', error)
                mok.lock = !next
                this.showError('잠금을 바꾸지 못했습니다.')
            }
        },

        isFirst(list, item) { return list.indexOf(item) <= 0 },
        isLast(list, item) { return list.indexOf(item) === list.length - 1 },

        showStatus(message) {
            this.statusMessage = message
            clearTimeout(this._statusTimer)
            this._statusTimer = setTimeout(() => (this.statusMessage = ''), 3000)
        },

        showError(message) {
            this.errorMessage = message
            clearTimeout(this._errorTimer)
            this._errorTimer = setTimeout(() => (this.errorMessage = ''), 6000)
        },

        // ---------- 불러오기 ----------
        async load() {
            try {
                const [hangs, moks, saemoks] = await Promise.all([
                    pb.collection('AssetsHang').getFullList({ requestKey: null }),
                    pb.collection('AssetsMok').getFullList({ expand: 'parent_hang', requestKey: null }),
                    pb.collection('AssetsSaemok').getFullList({ requestKey: null }),
                ])

                const byPriority = (a, b) => a.priority - b.priority
                this.HANGS = hangs.sort(byPriority)
                this.MOKS = moks.sort(byPriority)
                // 기본 세목은 늘 맨 앞
                this.SAEMOKS = saemoks.sort((a, b) =>
                    (b.is_none_field ? 1 : 0) - (a.is_none_field ? 1 : 0) || a.priority - b.priority)
                this.loaded = true
            } catch (error) {
                console.error('Failed to load assets:', error)
                this.showError('계정과목을 불러오지 못했습니다.')
            }
        },

        // ---------- 이름 ----------
        async rename(kind, node, nextLabel) {
            const label = (nextLabel ?? '').trim()
            if (!this.canEdit || !label || label === node.label) return

            const before = node.label
            node.label = label   // 화면을 먼저 바꾼다

            try {
                await pb.collection(KIND[kind].coll).update(node.id, { label })
                this.showStatus(`${KIND[kind].label} 이름을 바꿨습니다`)
            } catch (error) {
                console.error('Failed to rename:', error)
                node.label = before
                this.showError('이름을 바꾸지 못했습니다.')
            }
        },

        // ---------- 차례 ----------
        /**
         * 이웃과 자리를 맞바꾼다.
         * 예전에는 끌어야만 옮길 수 있어서 마우스가 없으면 손을 못 댔다.
         */
        async move(kind, list, node, step) {
            if (!this.canEdit) return

            const i = list.indexOf(node)
            const j = i + step
            if (i < 0 || j < 0 || j >= list.length) return

            const other = list[j]
            const a = node.priority
            const b = other.priority

            node.priority = b
            other.priority = a
            this.resort()

            try {
                await Promise.all([
                    pb.collection(KIND[kind].coll).update(node.id, { priority: b }),
                    pb.collection(KIND[kind].coll).update(other.id, { priority: a }),
                ])
                this.showStatus(`${node.label}을(를) ${step < 0 ? '위로' : '아래로'} 옮겼습니다`)
            } catch (error) {
                console.error('Failed to reorder:', error)
                node.priority = a
                other.priority = b
                this.resort()
                this.showError('차례를 바꾸지 못했습니다.')
            }
        },

        resort() {
            const byPriority = (a, b) => a.priority - b.priority
            this.HANGS = [...this.HANGS].sort(byPriority)
            this.MOKS = [...this.MOKS].sort(byPriority)
            this.SAEMOKS = [...this.SAEMOKS].sort((a, b) =>
                (b.is_none_field ? 1 : 0) - (a.is_none_field ? 1 : 0) || a.priority - b.priority)
        },

        // ---------- 만들기 ----------
        async createHang() {
            if (!this.canEdit) return
            try {
                const created = await pb.collection('AssetsHang').create({
                    label: '새로운 항',
                    priority: this.HANGS.length + 1,
                })
                this.HANGS.push(created)
                this.showStatus('항을 더했습니다. 이름을 눌러 고치세요')
            } catch (error) {
                console.error(error)
                this.showError('항을 더하지 못했습니다.')
            }
        },

        /** 항 줄의 + 단추. 접혀 있으면 먼저 펼쳐야 새로 생긴 목이 보인다 */
        async addMokTo(hangId) {
            if (!this.isOpen(hangId)) this.toggleFold(hangId)
            await this.createMok(hangId)
        },

        async createMok(hangId) {
            if (!this.canEdit) return
            try {
                const created = await pb.collection('AssetsMok').create({
                    label: '새로운 목',
                    priority: this.MOKS.filter(m => this.parentId(m) === hangId).length + 1,
                    parent_hang: hangId,
                })
                // create는 expand를 돌려주지 않는다 — 화면이 부모를 찾을 수 있게 손으로 붙인다
                created.expand = { parent_hang: { id: hangId } }
                this.MOKS.push(created)
                this.resort()
                this.showStatus('목을 더했습니다. 이름을 눌러 고치세요')
            } catch (error) {
                console.error(error)
                this.showError('목을 더하지 못했습니다.')
            }
        },

        async createSaemok() {
            if (!this.canEdit) return
            try {
                const created = await pb.collection('AssetsSaemok').create({
                    label: '새로운 세목',
                    priority: this.SAEMOKS.length + 1,
                    is_none_field: false,
                })
                this.SAEMOKS.push(created)
                this.showStatus('세목을 더했습니다. 이름을 눌러 고치세요')
            } catch (error) {
                console.error(error)
                this.showError('세목을 더하지 못했습니다.')
            }
        },

        // ---------- 지우기 ----------
        /*
          예전에는 항을 누르면 딸린 목까지 아무 말 없이 사라졌다
          (코드에 '실제 환경에서는 확인 모달이 필요합니다'라고만 적혀 있었다).
          무엇이 함께 없어지는지 세어 먼저 알린다.
        */
        async removeHang(hang) {
            if (!this.canEdit) return

            const children = this.MOKS.filter(m => this.parentId(m) === hang.id)
            const lines = [`'${hang.label}' 항을 지웁니다.`]
            if (children.length) lines.push(`딸린 목 ${children.length}개도 함께 지워집니다.`)
            lines.push('이미 그 과목으로 적어 둔 장부는 분류가 비게 됩니다.')
            lines.push('되돌릴 수 없습니다. 계속할까요?')
            if (!window.confirm(lines.join('\n'))) return

            try {
                await Promise.all(children.map(m => pb.collection('AssetsMok').delete(m.id)))
                await pb.collection('AssetsHang').delete(hang.id)

                this.MOKS = this.MOKS.filter(m => this.parentId(m) !== hang.id)
                this.HANGS = this.HANGS.filter(h => h.id !== hang.id)
                this.showStatus('항을 지웠습니다')
            } catch (error) {
                console.error(error)
                this.showError('항을 지우지 못했습니다.')
            }
        },

        async removeMok(mok) {
            if (!this.canEdit) return
            if (!window.confirm(
                `'${mok.label}' 목을 지웁니다.\n`
                + '이미 그 목으로 적어 둔 장부는 분류가 비게 됩니다.\n\n되돌릴 수 없습니다. 계속할까요?'
            )) return

            try {
                await pb.collection('AssetsMok').delete(mok.id)
                this.MOKS = this.MOKS.filter(m => m.id !== mok.id)
                this.showStatus('목을 지웠습니다')
            } catch (error) {
                console.error(error)
                this.showError('목을 지우지 못했습니다.')
            }
        },

        async removeSaemok(saemok) {
            if (!this.canEdit || saemok.is_none_field) return
            if (!window.confirm(
                `'${saemok.label}' 세목을 지웁니다.\n`
                + '이미 그 세목으로 적어 둔 장부는 분류가 비게 됩니다.\n\n되돌릴 수 없습니다. 계속할까요?'
            )) return

            try {
                await pb.collection('AssetsSaemok').delete(saemok.id)
                this.SAEMOKS = this.SAEMOKS.filter(s => s.id !== saemok.id)
                this.showStatus('세목을 지웠습니다')
            } catch (error) {
                console.error(error)
                this.showError('세목을 지우지 못했습니다.')
            }
        },
    }
}
</script>

<style scoped>
.tab-root {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
}

.none-select {
    user-select: none;
    -webkit-user-select: none;
}

/*
    머리 한 줄. 제목 · 설명 · 찾기를 한 줄에 놓는다.
    이 화면에서 봐야 하는 것은 목록이므로 머리가 세로로 자리를 먹으면 안 된다.
*/
.head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--spacing-2) var(--spacing-3);
}

.head .page-title {
    margin: 0;
    font-size: var(--text-xl);
}

.head .page-desc {
    margin: 0;
    flex: 1;
    min-width: 200px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
}

.search-bar {
    position: relative;
    width: 220px;
    max-width: 100%;
}

.search-input {
    width: 100%;
    min-height: 32px;
    padding: 0 var(--spacing-3) 0 30px;
    border: 1px solid var(--border-color-strong);
    border-radius: var(--border-radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--text-sm);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
}

[data-theme="dark"] .search-input:focus {
    box-shadow: 0 0 0 3px var(--primary-950);
}

.search-bar .bi-search {
    position: absolute;
    left: var(--spacing-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: var(--text-xs);
    pointer-events: none;
}

/*
    항·목과 세목을 나란히 둔다. 세목은 겹창 안에 있어서 열기 전엔 보이지 않았다.
    두 칸은 화면 높이에 맞추고 안에서 굴린다 — 그냥 쌓으면 페이지가 세 화면 길이가 된다.
    세목은 짧은 낱말 목록이라 좁아도 된다. 남는 너비는 항·목에 준다.
*/
.assets-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
    gap: var(--spacing-3);
    height: calc(100vh - 168px);
    min-height: 420px;
}

.panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    background: var(--bg-primary);
}

/* 칸 이름 · 개수 · 단추를 한 줄에 모은다 */
.panel-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-shrink: 0;
    min-height: 40px;
    padding: 0 var(--spacing-2) 0 var(--spacing-3);
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.panel-bar h2 {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    white-space: nowrap;
}

.panel-bar .count {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.bar-acts {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-shrink: 0;
    margin-left: auto;
}

.bar-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 26px;
    padding: 0 var(--spacing-2);
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.bar-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

/* 잠근 목을 꺼내 보는 중이라는 것은 눈에 띄어야 한다 — 평소 화면과 다른 상태다 */
.bar-btn.on {
    background: var(--warning-50);
    border-color: var(--warning-200);
    color: var(--warning-700);
}

[data-theme="dark"] .bar-btn.on {
    background: rgb(161 98 7 / 0.22);
    border-color: rgb(253 230 138 / 0.35);
    color: var(--warning-200);
}

.bar-btn.primary {
    border-color: var(--border-color-strong);
    color: var(--primary-700);
}

.bar-btn.primary:hover {
    border-color: var(--primary-600);
    background: var(--bg-active);
}

[data-theme="dark"] .bar-btn.primary {
    color: var(--primary-300);
}

.panel-note {
    flex-shrink: 0;
    margin: 0;
    padding: var(--spacing-2) var(--spacing-3) 0;
    color: var(--text-muted);
    font-size: var(--text-xs);
}

.tree {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: var(--spacing-1) 0 var(--spacing-3);
    list-style: none;
    overflow-y: auto;
    overscroll-behavior: contain;
}

/*
    줄은 촘촘하게. 서른 넘는 목을 한 화면에 담아야 전체 꼴이 눈에 들어온다.
    예전에는 36px에 여백까지 더해 열 줄밖에 안 보였다.
*/
.row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 28px;
    padding: 0 var(--spacing-2) 0 var(--spacing-3);
}

.row:hover {
    background: var(--bg-hover);
}

/* 굴려도 어느 항을 보고 있는지 알아야 한다 */
.row-hang {
    position: sticky;
    top: 0;
    z-index: 1;
    min-height: 32px;
    padding-left: var(--spacing-2);
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.row-hang:hover {
    background: var(--bg-tertiary);
}

.tree > .row-hang:first-child {
    border-top: none;
}

.fold {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: 10px;
}

.fold:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

/*
    번호는 이름 바로 왼쪽에 붙인다. 사이가 벌어지면 눈이 매 줄 건너뛰어야 한다.
    자릿수가 세로로 맞도록 고정폭 숫자를 쓴다.
*/
.priority {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.row-mok .priority,
.row-saemok .priority {
    /* 항의 접기 단추 자리만큼 들여쓴다 — 목이 항에 딸린 것이 보이게 */
    margin-left: calc(20px + var(--spacing-2));
}

.name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    color: var(--text-primary);
}

.name-hang {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-bold);
}

/* 몇 목인지는 곁다리다 — 이름을 가리지 않게 조용히 둔다 */
.mok-count {
    flex-shrink: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.mok-count::after {
    content: '목';
}

/* 손댈 것이 있다는 건 그 줄에 머물 때만 보이면 된다 — 늘 보이면 이름이 묻힌다 */
.row-acts {
    display: flex;
    gap: 0;
    flex-shrink: 0;
    margin-left: auto;
    opacity: 0;
    transition: opacity var(--transition-fast);
}

.row:hover .row-acts,
.row:focus-within .row-acts {
    opacity: 1;
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.icon-btn:hover:not(:disabled) {
    background: var(--bg-active);
    color: var(--text-primary);
}

.icon-btn.danger:hover:not(:disabled) {
    background: var(--danger-50);
    color: var(--danger-600);
}

.icon-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
}

[data-theme="dark"] .icon-btn.danger:hover:not(:disabled) {
    background: rgb(239 68 68 / 0.16);
    color: var(--danger-300);
}

.badge {
    margin-left: var(--spacing-2);
}

/* 목이 하나도 없는 항은 빈칸이 아니라 그렇다고 말해 준다 */
.row-none {
    padding-left: calc(var(--spacing-3) + 20px + var(--spacing-2));
    color: var(--text-muted);
    font-size: var(--text-xs);
}

.row-none:hover {
    background: transparent;
}

/* 잠근 목은 '지워진 것'이 아니라 '쓰지 않는 것'이다 — 흐리게 두되 읽히게 */
.row-mok.is-locked .name,
.row-mok.is-locked .priority {
    color: var(--text-muted);
}

.lock-mark {
    flex-shrink: 0;
    margin-right: -2px;
    color: var(--warning-600);
    font-size: 10px;
}

[data-theme="dark"] .lock-mark {
    color: var(--warning-200);
}

.icon-btn.is-on {
    color: var(--warning-600);
}

[data-theme="dark"] .icon-btn.is-on {
    color: var(--warning-200);
}

/* 잠근 목은 손대는 자리가 늘 보여야 한다 — 풀려면 그 단추를 찾아야 하므로 */
.row-mok.is-locked .row-acts {
    opacity: 1;
}

.empty {
    padding: var(--spacing-6) var(--spacing-3);
    color: var(--text-muted);
    font-size: var(--text-sm);
    text-align: center;
}

.search-note {
    margin: 0;
}

@media (max-width: 900px) {
    .assets-grid {
        grid-template-columns: minmax(0, 1fr);
        height: auto;
    }

    /* 좁은 화면에서는 나란히 둘 수 없으니 각자 적당한 높이로 */
    .panel {
        max-height: 70vh;
    }

    /* 손가락으로는 hover가 없다 — 늘 보이게 둔다 */
    .row-acts {
        opacity: 1;
    }

    .row {
        min-height: 36px;
    }

    .icon-btn {
        width: 32px;
        height: 32px;
        font-size: var(--text-sm);
    }
}
</style>
