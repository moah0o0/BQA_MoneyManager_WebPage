<template>
    <div class="tab-root none-select">
        <div class="page-head">
            <div>
                <h1 class="page-title">계정과목</h1>
                <p class="page-desc">장부에서 고를 항 · 목 · 세목을 짭니다. 이름을 누르면 그 자리에서 고칩니다.</p>
            </div>
            <div class="acts">
                <div class="search-bar">
                    <i class="bi bi-search" aria-hidden="true"></i>
                    <label class="sr-only" for="assets-search">계정과목 검색</label>
                    <input id="assets-search" type="search" v-model="query" class="search-input" placeholder="이름으로 찾기">
                </div>
            </div>
        </div>

        <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
        <p v-if="errorMessage" class="notice notice-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>{{ errorMessage }}</span>
        </p>

        <template v-if="loaded">
            <!--
                한 화면에 다 놓는다.
                세목은 겹창 안에 있어서 열어 보기 전에는 무엇이 있는지 알 수 없었고,
                항 · 목은 가로로 밀어 봐야 해서 전체 꼴이 한눈에 들어오지 않았다.
            -->
            <div class="assets-grid">
                <section class="panel" aria-labelledby="hang-mok-title">
                    <header>
                        <h2 id="hang-mok-title">항 · 목</h2>
                        <span class="count num">{{ HANGS.length }}항 · {{ MOKS.length }}목</span>
                    </header>

                    <ul class="tree">
                        <template v-for="hang in visibleHangs" :key="hang.id">
                            <li class="row row-hang">
                                <span class="priority num">{{ zeroPad(hang.priority, 2) }}</span>
                                <InlineEditor
                                    v-if="canEdit"
                                    :value="hang.label"
                                    class="name name-hang"
                                    @change="rename('Hang', hang, $event)"
                                />
                                <span v-else class="name name-hang">{{ hang.label }}</span>

                                <div class="row-acts" v-if="canEdit && !query">
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

                            <li v-for="mok in moksOf(hang.id)" :key="mok.id" class="row row-mok">
                                <span class="indent" aria-hidden="true"></span>
                                <span class="priority num">{{ zeroPad(mok.priority, 3) }}</span>
                                <InlineEditor
                                    v-if="canEdit"
                                    :value="mok.label"
                                    class="name"
                                    @change="rename('Mok', mok, $event)"
                                />
                                <span v-else class="name">{{ mok.label }}</span>

                                <div class="row-acts" v-if="canEdit && !query">
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
                                </div>
                            </li>

                            <li v-if="canEdit && !query" :key="`add-${hang.id}`" class="row row-add">
                                <span class="indent" aria-hidden="true"></span>
                                <button type="button" class="add-btn" @click="createMok(hang.id)">
                                    <i class="bi bi-plus-lg" aria-hidden="true"></i> 목 더하기
                                </button>
                            </li>
                        </template>

                        <li v-if="visibleHangs.length === 0" class="empty">
                            {{ query ? '찾는 이름이 없습니다.' : '아직 항이 없습니다. 하나 더해 주세요.' }}
                        </li>

                        <li v-if="canEdit && !query" class="row row-add row-add-top">
                            <button type="button" class="add-btn" @click="createHang">
                                <i class="bi bi-plus-lg" aria-hidden="true"></i> 항 더하기
                            </button>
                        </li>
                    </ul>
                </section>

                <section class="panel" aria-labelledby="saemok-title">
                    <header>
                        <h2 id="saemok-title">세목</h2>
                        <span class="count num">{{ SAEMOKS.length }}개</span>
                    </header>
                    <p class="hint">모든 목이 함께 씁니다.</p>

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

                        <li v-if="canEdit && !query" class="row row-add">
                            <button type="button" class="add-btn" @click="createSaemok">
                                <i class="bi bi-plus-lg" aria-hidden="true"></i> 세목 더하기
                            </button>
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
                || this.MOKS.some(m => this.parentId(m) === h.id && m.label.toLowerCase().includes(q))
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
            const list = this.MOKS.filter(m => this.parentId(m) === hangId)
            if (!q) return list
            // 항 이름으로 걸렸으면 그 아래 목은 다 보여 준다
            const hang = this.HANGS.find(h => h.id === hangId)
            if (hang?.label.toLowerCase().includes(q)) return list
            return list.filter(m => m.label.toLowerCase().includes(q))
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
    gap: var(--spacing-4);
}

.none-select {
    user-select: none;
    -webkit-user-select: none;
}

.search-bar {
    position: relative;
    width: 240px;
    max-width: 100%;
}

.search-input {
    width: 100%;
    min-height: 34px;
    padding: 0 var(--spacing-3) 0 32px;
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

/* 항·목과 세목을 나란히 둔다. 세목은 겹창 안에 있어서 열기 전엔 보이지 않았다 */
.assets-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: var(--spacing-4);
    align-items: start;
}

.panel > header {
    align-items: baseline;
}

.panel .count {
    font-size: var(--text-xs);
    color: var(--text-muted);
}

.tree {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 36px;
    padding: var(--spacing-1) var(--spacing-1);
    border-radius: var(--border-radius-sm);
}

.row:hover {
    background: var(--bg-secondary);
}

.row-hang {
    margin-top: var(--spacing-2);
    border-top: 1px solid var(--border-color);
    padding-top: var(--spacing-2);
}

.tree > .row-hang:first-child {
    margin-top: 0;
    border-top: none;
}

.indent {
    display: inline-block;
    flex-shrink: 0;
    width: var(--spacing-5);
}

.priority {
    flex-shrink: 0;
    min-width: 34px;
    font-size: var(--text-xs);
    color: var(--text-muted);
}

/* 이름은 글자만큼만 차지한다 — 줄 끝까지 늘리면 손을 얹었을 때 강조가 줄 전체로 퍼진다 */
.name {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    color: var(--text-primary);
}

.name-hang {
    font-size: var(--text-base);
    font-weight: var(--font-weight-bold);
}

/* 손댈 것이 있다는 건 그 줄에 머물 때만 보이면 된다 — 늘 보이면 이름이 묻힌다 */
.row-acts {
    display: flex;
    gap: 1px;
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
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-xs);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.icon-btn:hover:not(:disabled) {
    background: var(--bg-hover);
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

.row-add:hover {
    background: transparent;
}

.row-add-top {
    margin-top: var(--spacing-2);
    border-top: 1px solid var(--border-color);
    padding-top: var(--spacing-3);
}

.add-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    min-height: 28px;
    padding: 0 var(--spacing-3);
    border: 1px dashed var(--border-color-strong);
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    transition: border-color var(--transition-fast), color var(--transition-fast);
}

.add-btn:hover {
    border-color: var(--primary-600);
    color: var(--primary-700);
}

[data-theme="dark"] .add-btn:hover {
    color: var(--primary-300);
}

.badge {
    margin-left: var(--spacing-2);
}

.search-note {
    margin: 0;
}

@media (max-width: 900px) {
    .assets-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    /* 손가락으로는 hover가 없다 — 늘 보이게 둔다 */
    .row-acts {
        opacity: 1;
    }

    .icon-btn {
        width: 34px;
        height: 34px;
    }
}
</style>
