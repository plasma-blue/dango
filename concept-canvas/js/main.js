// --- State & Config ---
const state = {
    nodes: [], groups: [], links: [],
    view: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 },
    selection: new Set(),
    clipboard: [] // 内部剪贴板
};

// 2. 扩充颜色配置 (Alt+1 ~ Alt+9)
const CONFIG = {
    colors: [
        'c-white', 'c-red', 'c-yellow', 'c-green', 'c-blue',
        'c-orange', 'c-purple', 'c-pink', 'c-cyan'
    ]
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Initialization & Persistence ---
const LS_KEY = 'cc-canvas-data';
function loadData() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
        try {
            const data = JSON.parse(raw);
            state.nodes = data.nodes || [];
            state.groups = data.groups || [];
            state.links = data.links || [];
        } catch (e) { console.error('Data load failed', e); }
    }
}
function saveData() {
    localStorage.setItem(LS_KEY, JSON.stringify({
        nodes: state.nodes, groups: state.groups, links: state.links
    }));
}
loadData();

// --- Theme Logic ---
const themeBtn = document.getElementById('btn-theme');
const htmlEl = document.documentElement;
let isDark = localStorage.getItem('cc-theme') === 'dark';

function updateTheme() {
    htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeBtn.innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('cc-theme', isDark ? 'dark' : 'light');
}
updateTheme();
themeBtn.onclick = () => { isDark = !isDark; updateTheme(); };

// --- DOM Refs ---
const els = {
    container: document.getElementById('canvas-container'),
    world: document.getElementById('world'),
    nodesLayer: document.getElementById('nodes-layer'),
    groupsLayer: document.getElementById('groups-layer'),
    connectionsLayer: document.getElementById('connections-layer'),
    input: document.getElementById('input-text'),
    selectBox: document.getElementById('selection-box'),
    btnHelp: document.getElementById('btn-help'),
    helpModal: document.getElementById('help-modal'),
    uiLayer: document.getElementById('ui-layer'),
};

// --- Render System ---
function render() {
    els.world.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;

    els.connectionsLayer.innerHTML = '';
    state.links.forEach(l => {
        const n1 = state.nodes.find(n => n.id === l.sourceId);
        const n2 = state.nodes.find(n => n.id === l.targetId);
        if (n1 && n2) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const c1 = getNodeCenter(n1); const c2 = getNodeCenter(n2);
            line.setAttribute('x1', c1.x); line.setAttribute('y1', c1.y);
            line.setAttribute('x2', c2.x); line.setAttribute('y2', c2.y);
            line.classList.add('link');
            els.connectionsLayer.appendChild(line);
        }
    });

    syncDomElements(state.groups, els.groupsLayer, 'group', renderGroup);
    syncDomElements(state.nodes, els.nodesLayer, 'node', renderNode);
    saveData();
}

function syncDomElements(dataArray, parent, className, renderFn) {
    const existing = new Map();
    Array.from(parent.children).forEach(el => existing.set(el.dataset.id, el));
    const activeIds = new Set();
    dataArray.forEach(item => {
        activeIds.add(item.id);
        let el = existing.get(item.id);
        if (!el) { el = document.createElement('div'); el.className = className; el.dataset.id = item.id; parent.appendChild(el); }
        renderFn(el, item);
    });
    existing.forEach((el, id) => { if (!activeIds.has(id)) el.remove(); });
}

function renderNode(el, node) {
    el.style.transform = `translate(${node.x}px, ${node.y}px)`;
    if (el.innerText !== node.text && !el.isContentEditable) el.innerText = node.text;

    const isSelected = state.selection.has(node.id);
    const classes = ['node', node.color || 'c-white'];
    if (isSelected) classes.push('selected');
    el.className = classes.join(' ');

    if (!node.w || !node.h || el.offsetWidth !== node.w) {
        node.w = el.offsetWidth; node.h = el.offsetHeight;
    }
}

function renderGroup(el, group) {
    el.style.transform = `translate(${group.x}px, ${group.y}px)`;
    el.style.width = `${group.w}px`; el.style.height = `${group.h}px`;
    el.className = `group ${state.selection.has(group.id) ? 'selected' : ''}`;
}
function getNodeCenter(n) { return { x: n.x + (n.w || 0) / 2, y: n.y + (n.h || 0) / 2 }; }

// --- Interactions ---
document.getElementById('btn-add').onclick = () => {
    const text = els.input.value; if (!text.trim()) return;
    const parts = text.split(/[\s,\n]+/).filter(t => t.trim().length > 0);
    const existingTexts = new Set(state.nodes.map(n => n.text));
    const startX = -state.view.x / state.view.scale + window.innerWidth / (2 * state.view.scale);
    const startY = -state.view.y / state.view.scale + window.innerHeight / (2 * state.view.scale);
    let count = 0;
    parts.forEach((str, idx) => {
        if (!existingTexts.has(str)) {
            state.nodes.push({
                id: uid(), text: str,
                x: startX + (count % 5) * 140, y: startY + Math.floor(count / 5) * 80,
                w: 0, h: 0, color: 'c-white'
            });
            count++;
        }
    });
    els.input.value = ''; render();
};

const btnClear = document.getElementById('btn-clear');
let clearConfirm = false;
btnClear.onclick = () => {
    if (!clearConfirm) {
        clearConfirm = true; btnClear.innerText = "确定?"; btnClear.classList.add('btn-danger');
        setTimeout(() => { if (clearConfirm) { clearConfirm = false; btnClear.innerText = "🗑️"; btnClear.classList.remove('btn-danger'); } }, 3000);
    } else {
        state.nodes = []; state.groups = []; state.links = []; state.selection.clear();
        clearConfirm = false; btnClear.innerText = "🗑️"; btnClear.classList.remove('btn-danger'); render();
    }
};
// 🆕 新增：问号按钮点击逻辑
els.btnHelp.onclick = (e) => {
    // 阻止冒泡，防止触发 window 的关闭逻辑
    e.stopPropagation();
    els.helpModal.classList.toggle('show');
};
els.uiLayer.addEventListener('mouseleave', () => {
    els.helpModal.classList.remove('show');
});
els.helpModal.onclick = (e) => {
    e.stopPropagation();
};

// 🆕 新增：点击任意地方关闭帮助菜单
window.addEventListener('click', (e) => {
    // 如果点击的目标不是问号按钮内部，也不是 Modal 内部，则关闭
    if (!els.btnHelp.contains(e.target)) {
        els.helpModal.classList.remove('show');
    }
});

let dragStart = null;
let mode = null;
const keys = {};

els.container.addEventListener('mousedown', e => {
    if (e.target.isContentEditable) return;
    if (e.target.closest('.node') && e.detail === 2) return;

    // 中键 或 (左键+空格) -> 平移
    if (e.button === 1 || (e.button === 0 && keys.Space)) {
        mode = 'pan';
        dragStart = { x: e.clientX, y: e.clientY, viewX: state.view.x, viewY: state.view.y };
        document.body.classList.add('mode-pan'); // 添加抓取中样式
        return;
    }

    if (e.button === 0) {
        const nodeEl = e.target.closest('.node');
        const groupEl = e.target.closest('.group');
        const worldPos = screenToWorld(e.clientX, e.clientY);
        if (nodeEl) {
            handleSelection(nodeEl.dataset.id, e.ctrlKey || e.shiftKey);
            mode = 'move'; dragStart = { x: worldPos.x, y: worldPos.y, initialPos: getSelectionPositions() };
        } else if (groupEl) {
            handleSelection(groupEl.dataset.id, e.ctrlKey || e.shiftKey);
            mode = 'move'; dragStart = { x: worldPos.x, y: worldPos.y, initialPos: getSelectionPositions() };
        } else {
            if (!e.ctrlKey && !e.shiftKey) state.selection.clear();
            mode = 'box'; dragStart = { x: e.clientX, y: e.clientY };
            els.selectBox.style.display = 'block';
            updateSelectBox(e.clientX, e.clientY, e.clientX, e.clientY);
            render();
        }
    }
});

els.container.addEventListener('mousemove', e => {
    if (!mode) return;
    if (mode === 'pan') {
        state.view.x = dragStart.viewX + (e.clientX - dragStart.x);
        state.view.y = dragStart.viewY + (e.clientY - dragStart.y);
        render();
    } else if (mode === 'move') {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const dx = worldPos.x - dragStart.x;
        const dy = worldPos.y - dragStart.y;
        state.selection.forEach(id => {
            const init = dragStart.initialPos[id];
            if (init) {
                const item = findItem(id);
                if (item) {
                    item.x = init.x + dx; item.y = init.y + dy;
                    if (init.type === 'group') {
                        item.memberIds.forEach(mid => {
                            const member = state.nodes.find(n => n.id === mid);
                            if (member && !dragStart.initialPos[mid]) {
                                const mInit = dragStart.initialPos[`member_${mid}`];
                                if (mInit) { member.x = mInit.x + dx; member.y = mInit.y + dy; }
                            }
                        });
                    }
                }
            }
        });
        render();
    } else if (mode === 'box') {
        updateSelectBox(dragStart.x, dragStart.y, e.clientX, e.clientY);
    }
});

els.container.addEventListener('mouseup', e => {
    if (mode === 'box') {
        const rect = getStandardRect(dragStart.x, dragStart.y, e.clientX, e.clientY);
        const worldRect = {
            x: (rect.x - state.view.x) / state.view.scale, y: (rect.y - state.view.y) / state.view.scale,
            w: rect.w / state.view.scale, h: rect.h / state.view.scale
        };
        [...state.nodes, ...state.groups].forEach(item => { if (isIntersect(worldRect, item)) state.selection.add(item.id); });
        els.selectBox.style.display = 'none';
        render();
    }
    mode = null; dragStart = null;
    document.body.classList.remove('mode-pan'); // 移除抓取中样式
});

// 5. 修复触控板平移逻辑：区分 Zoom 和 Pan
els.container.addEventListener('wheel', e => {
    e.preventDefault();
    // 浏览器标准：Ctrl + Wheel = Zoom，触控板双指捏合也会触发 Ctrl+Wheel
    if (e.ctrlKey) {
        const factor = 1 + ((e.deltaY > 0 ? -1 : 1) * 0.1);
        const worldX = (e.clientX - state.view.x) / state.view.scale;
        const worldY = (e.clientY - state.view.y) / state.view.scale;
        state.view.scale = Math.max(0.1, Math.min(5, state.view.scale * factor));
        state.view.x = e.clientX - worldX * state.view.scale;
        state.view.y = e.clientY - worldY * state.view.scale;
    } else {
        // 纯 Wheel = Pan (鼠标滚轮或触控板双指移动)
        state.view.x -= e.deltaX;
        state.view.y -= e.deltaY;
    }
    render();
}, { passive: false });

els.container.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('.node');
    if (nodeEl) {
        const node = state.nodes.find(n => n.id === nodeEl.dataset.id);
        if (node) {
            nodeEl.contentEditable = true; nodeEl.classList.add('editing'); nodeEl.focus();
            const range = document.createRange(); range.selectNodeContents(nodeEl);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            const finishEdit = () => {
                nodeEl.contentEditable = false; nodeEl.classList.remove('editing');
                node.text = nodeEl.innerText;
                node.w = nodeEl.offsetWidth; node.h = nodeEl.offsetHeight;
                render();
            };
            nodeEl.onblur = finishEdit;
            nodeEl.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); nodeEl.blur(); } ev.stopPropagation(); };
        }
    }
});

window.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    keys[e.code] = true;

    // 1. 空格键改变光标 (Space Hand)
    if (e.code === 'Space') {
        e.preventDefault();
        document.body.classList.add('mode-space');
    }

    if (e.ctrlKey && e.code === 'KeyG' && !e.shiftKey) { e.preventDefault(); createGroup(); }
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') { e.preventDefault(); dissolveGroup(); }
    if (e.ctrlKey && e.code === 'KeyL') { e.preventDefault(); toggleLink(); }
    if (e.code === 'Delete') deleteSelection();

    // 3. 剪贴板逻辑 (Ctrl+C / Ctrl+V)
    if (e.ctrlKey && e.code === 'KeyC') { e.preventDefault(); copySelection(); }
    if (e.ctrlKey && e.code === 'KeyV') { e.preventDefault(); pasteClipboard(); }
    // 兼容旧习惯
    if (e.ctrlKey && e.code === 'KeyD') { e.preventDefault(); duplicateSelection(); }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !e.altKey) { e.preventDefault(); nudgeSelection(e.code); }

    // 2. 颜色快捷键 (Alt+1~9)
    if (e.altKey && !e.shiftKey && e.code.startsWith('Digit')) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= CONFIG.colors.length) {
            e.preventDefault();
            colorSelection(CONFIG.colors[num - 1]);
        }
    }

    if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); exportJson(); }

    if (e.altKey && !e.ctrlKey) {
        switch (e.code) {
            case 'KeyA': e.preventDefault(); alignSelection('left'); break;
            case 'KeyD': e.preventDefault(); alignSelection('right'); break;
            case 'KeyW': e.preventDefault(); alignSelection('top'); break;
            case 'KeyS': e.preventDefault(); alignSelection('bottom'); break;
            case 'KeyH': e.preventDefault(); e.shiftKey ? distributeSelection('h') : alignSelection('centerX'); break;
            case 'KeyV': e.preventDefault(); e.shiftKey ? distributeSelection('v') : alignSelection('centerY'); break;
        }
    }
});

window.addEventListener('keyup', e => {
    keys[e.code] = false;
    // 移除 Space 的光标
    if (e.code === 'Space') {
        document.body.classList.remove('mode-space');
    }
});

// Helpers
function screenToWorld(sx, sy) { return { x: (sx - state.view.x) / state.view.scale, y: (sy - state.view.y) / state.view.scale }; }
function handleSelection(id, multi) {
    if (!multi) { if (!state.selection.has(id)) { state.selection.clear(); state.selection.add(id); } }
    else { if (state.selection.has(id)) state.selection.delete(id); else state.selection.add(id); }
    render();
}
function getSelectionPositions() {
    const pos = {};
    state.selection.forEach(id => {
        const item = findItem(id);
        if (item) {
            pos[id] = { x: item.x, y: item.y, type: item.text ? 'node' : 'group' };
            if (!item.text && item.memberIds) {
                item.memberIds.forEach(mid => { const m = state.nodes.find(n => n.id === mid); if (m) pos[`member_${mid}`] = { x: m.x, y: m.y }; });
            }
        }
    });
    return pos;
}
function findItem(id) { return state.nodes.find(n => n.id === id) || state.groups.find(g => g.id === id); }
function updateSelectBox(x1, y1, x2, y2) {
    const r = getStandardRect(x1, y1, x2, y2);
    els.selectBox.style.left = r.x + 'px'; els.selectBox.style.top = r.y + 'px';
    els.selectBox.style.width = r.w + 'px'; els.selectBox.style.height = r.h + 'px';
}
function getStandardRect(x1, y1, x2, y2) { return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x1 - x2), h: Math.abs(y1 - y2) }; }
function isIntersect(r1, r2) {
    const r2w = r2.w || 60; const r2h = r2.h || 40;
    return !(r2.x > r1.x + r1.w || r2.x + r2w < r1.x || r2.y > r1.y + r1.h || r2.y + r2h < r1.y);
}

// --- Logic Actions ---
// 3. 剪贴板实现
function copySelection() {
    const selNodes = state.nodes.filter(n => state.selection.has(n.id));
    const selGroups = state.groups.filter(g => state.selection.has(g.id));
    // 简单的深拷贝
    if (selNodes.length > 0 || selGroups.length > 0) {
        state.clipboard = JSON.parse(JSON.stringify({ nodes: selNodes, groups: selGroups }));
    }
}

function pasteClipboard() {
    if (!state.clipboard || (!state.clipboard.nodes.length && !state.clipboard.groups.length)) return;

    state.selection.clear();
    const mapping = {}; // oldId -> newId

    // 1. 处理节点
    state.clipboard.nodes.forEach(n => {
        const newId = uid();
        mapping[n.id] = newId;
        const newNode = { ...n, id: newId, x: n.x + 20, y: n.y + 20 }; // 偏移 20px
        state.nodes.push(newNode);
        state.selection.add(newId);
    });

    // 2. 处理组 (需更新 memberIds)
    state.clipboard.groups.forEach(g => {
        const newId = uid();
        const newGroup = { ...g, id: newId, x: g.x + 20, y: g.y + 20 };
        // 如果成员也被复制了，指向新成员；否则保留指向（但通常复制组也应包含成员，这里简化处理：若成员不在剪贴板，则指向旧成员? 
        // 逻辑修正：通常选中组会自动移动成员。这里若只复制了组壳子没复制节点，会出问题。
        // 但 copySelection 仅复制选中的。若选中组，必须也选中成员才能完整复制内容。
        // 为简化：如果成员在 mapping 中，更新为新 ID；否则丢弃或保留(这里选择保留原始引用，虽然可能会有多父级问题，但作为简单工具可接受)
        newGroup.memberIds = g.memberIds.map(mid => mapping[mid] || mid);
        state.groups.push(newGroup);
        state.selection.add(newId);
    });

    render();
}

function createGroup() {
    const selectedNodes = state.nodes.filter(n => state.selection.has(n.id));
    if (selectedNodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedNodes.forEach(n => {
        minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + (n.w || 0)); maxY = Math.max(maxY, n.y + (n.h || 0));
    });
    const padding = 20;
    const group = { id: uid(), x: minX - padding, y: minY - padding, w: maxX - minX + padding * 2, h: maxY - minY + padding * 2, memberIds: selectedNodes.map(n => n.id) };
    state.groups.push(group); state.selection.clear(); state.selection.add(group.id); render();
}
function dissolveGroup() {
    const toRemove = [];
    state.selection.forEach(id => { const idx = state.groups.findIndex(g => g.id === id); if (idx !== -1) toRemove.push(idx); });
    toRemove.sort((a, b) => b - a).forEach(idx => state.groups.splice(idx, 1));
    if (toRemove.length > 0) { state.selection.clear(); render(); }
}
function toggleLink() {
    const sel = Array.from(state.selection);
    const nodes = sel.map(id => state.nodes.find(n => n.id === id)).filter(n => n);
    if (nodes.length !== 2) return;
    const [n1, n2] = nodes;
    const existingIdx = state.links.findIndex(l => (l.sourceId === n1.id && l.targetId === n2.id) || (l.sourceId === n2.id && l.targetId === n1.id));
    if (existingIdx !== -1) state.links.splice(existingIdx, 1); else state.links.push({ id: uid(), sourceId: n1.id, targetId: n2.id });
    render();
}
function deleteSelection() {
    const sel = state.selection;
    state.nodes = state.nodes.filter(n => !sel.has(n.id));
    state.groups = state.groups.filter(g => !sel.has(g.id));
    state.links = state.links.filter(l => !sel.has(l.sourceId) && !sel.has(l.targetId));
    state.groups.forEach(g => { g.memberIds = g.memberIds.filter(mid => state.nodes.find(n => n.id === mid)); });
    state.selection.clear(); render();
}
function duplicateSelection() {
    // 简单的本地立即复制 (旧功能保留)
    const newSelection = new Set(); const mapping = {};
    state.nodes.forEach(n => {
        if (state.selection.has(n.id)) {
            const newNode = { ...n, id: uid(), x: n.x + 20, y: n.y + 20 };
            state.nodes.push(newNode); newSelection.add(newNode.id); mapping[n.id] = newNode.id;
        }
    });
    state.groups.forEach(g => {
        if (state.selection.has(g.id)) {
            const newGroup = { ...g, id: uid(), x: g.x + 20, y: g.y + 20 };
            newGroup.memberIds = g.memberIds.map(mid => mapping[mid] || mid);
            state.groups.push(newGroup); newSelection.add(newGroup.id);
        }
    });
    state.selection = newSelection; render();
}
function nudgeSelection(key) {
    const step = 10; let dx = 0, dy = 0;
    if (key === 'ArrowUp') dy = -step; if (key === 'ArrowDown') dy = step;
    if (key === 'ArrowLeft') dx = -step; if (key === 'ArrowRight') dx = step;
    state.selection.forEach(id => {
        const item = findItem(id);
        if (item) setItemPos(item, item.x + dx, item.y + dy);
    });
    render();
}
function colorSelection(colorClass) { state.nodes.forEach(n => { if (state.selection.has(n.id)) n.color = colorClass; }); render(); }

function setItemPos(item, newX, newY) {
    const dx = newX - item.x; const dy = newY - item.y;
    item.x = newX; item.y = newY;
    if (!item.text && item.memberIds) {
        item.memberIds.forEach(mid => { const m = state.nodes.find(n => n.id === mid); if (m) { m.x += dx; m.y += dy; } });
    }
}
function alignSelection(type) {
    const items = [...state.selection].map(id => findItem(id)).filter(i => i);
    if (items.length < 2) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(i => {
        minX = Math.min(minX, i.x); minY = Math.min(minY, i.y);
        maxX = Math.max(maxX, i.x + (i.w || 0)); maxY = Math.max(maxY, i.y + (i.h || 0));
    });
    const centerX = minX + (maxX - minX) / 2; const centerY = minY + (maxY - minY) / 2;
    items.forEach(i => {
        const w = i.w || 0; const h = i.h || 0; let nx = i.x, ny = i.y;
        if (type === 'left') nx = minX; else if (type === 'right') nx = maxX - w; else if (type === 'centerX') nx = centerX - w / 2;
        else if (type === 'top') ny = minY; else if (type === 'bottom') ny = maxY - h; else if (type === 'centerY') ny = centerY - h / 2;
        setItemPos(i, nx, ny);
    });
    render();
}
function distributeSelection(axis) {
    const items = [...state.selection].map(id => findItem(id)).filter(i => i);
    if (items.length < 3) return;
    if (axis === 'h') {
        items.sort((a, b) => a.x - b.x);
        const start = items[0].x; const end = items[items.length - 1].x + (items[items.length - 1].w || 0);
        const totalW = items.reduce((s, i) => s + (i.w || 0), 0);
        const gap = (end - start - totalW) / (items.length - 1);
        let cx = start; items.forEach(i => { setItemPos(i, cx, i.y); cx += (i.w || 0) + gap; });
    } else {
        items.sort((a, b) => a.y - b.y);
        const start = items[0].y; const end = items[items.length - 1].y + (items[items.length - 1].h || 0);
        const totalH = items.reduce((s, i) => s + (i.h || 0), 0);
        const gap = (end - start - totalH) / (items.length - 1);
        let cy = start; items.forEach(i => { setItemPos(i, i.x, cy); cy += (i.h || 0) + gap; });
    }
    render();
}

function getTimestamp() {
    const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}
function exportJson() {
    const data = JSON.stringify({ nodes: state.nodes, groups: state.groups, links: state.links }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `concept-canvas_${getTimestamp()}.json`; a.click(); URL.revokeObjectURL(url);
}

document.getElementById('btn-export').onclick = exportJson;
document.getElementById('file-input').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try { const data = JSON.parse(ev.target.result); state.nodes = data.nodes || []; state.groups = data.groups || []; state.links = data.links || []; state.selection.clear(); render(); }
        catch (err) { alert('文件格式错误'); }
    };
    reader.readAsText(file); e.target.value = '';
};

render();