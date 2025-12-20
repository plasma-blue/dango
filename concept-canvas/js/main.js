// --- State & Config ---
const state = {
    nodes: [], groups: [], links: [],
    view: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 },
    selection: new Set(), clipboard: []
};
const CONFIG = { colors: ['c-white', 'c-red', 'c-yellow', 'c-green', 'c-blue'] };
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

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
    selectBox: document.getElementById('selection-box')
};

// --- Render System ---
function render() {
    els.world.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;

    // Links
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

    // 动态添加/移除 selected 类
    const isSelected = state.selection.has(node.id);
    const classes = ['node', node.color || 'c-white'];
    if (isSelected) classes.push('selected');
    el.className = classes.join(' ');

    if (!node.w || !node.h) requestAnimationFrame(() => { node.w = el.offsetWidth; node.h = el.offsetHeight; });
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
                color: 'c-white'
            });
            count++;
        }
    });
    els.input.value = ''; render();
};

let dragStart = null;
let mode = null;
const keys = {};

els.container.addEventListener('mousedown', e => {
    if (e.target.isContentEditable) return;
    if (e.target.closest('.node') && e.detail === 2) return;
    if (e.button === 1 || (e.button === 0 && keys.Space)) {
        mode = 'pan'; dragStart = { x: e.clientX, y: e.clientY, viewX: state.view.x, viewY: state.view.y };
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
});

els.container.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = 1 + ((e.deltaY > 0 ? -1 : 1) * 0.1);
    const worldX = (e.clientX - state.view.x) / state.view.scale;
    const worldY = (e.clientY - state.view.y) / state.view.scale;
    state.view.scale = Math.max(0.1, Math.min(5, state.view.scale * factor));
    state.view.x = e.clientX - worldX * state.view.scale;
    state.view.y = e.clientY - worldY * state.view.scale;
    render();
}, { passive: false });

els.container.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('.node');
    if (nodeEl) {
        const node = state.nodes.find(n => n.id === nodeEl.dataset.id);
        if (node) {
            nodeEl.contentEditable = true;
            nodeEl.classList.add('editing');
            nodeEl.focus();
            const range = document.createRange(); range.selectNodeContents(nodeEl);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            const finishEdit = () => {
                nodeEl.contentEditable = false; nodeEl.classList.remove('editing');
                node.text = nodeEl.innerText;
                node.w = nodeEl.offsetWidth; node.h = nodeEl.offsetHeight;
                render();
            };
            nodeEl.onblur = finishEdit;
            nodeEl.onkeydown = (ev) => {
                if (ev.key === 'Enter') { ev.preventDefault(); nodeEl.blur(); }
                ev.stopPropagation();
            };
        }
    }
});

window.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    keys[e.code] = true;

    if (e.code === 'Space') e.preventDefault();
    if (e.ctrlKey && e.code === 'KeyG' && !e.shiftKey) { e.preventDefault(); createGroup(); }
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') { e.preventDefault(); dissolveGroup(); }
    if (e.ctrlKey && e.code === 'KeyL') { e.preventDefault(); toggleLink(); }
    if (e.code === 'Delete') deleteSelection();
    if (e.ctrlKey && e.code === 'KeyD') { e.preventDefault(); duplicateSelection(); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); nudgeSelection(e.code); }
    if (e.altKey && ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        e.preventDefault();
        colorSelection(CONFIG.colors[parseInt(e.key) - 1]);
    }
    if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault(); exportJson();
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

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
    const r2w = r2.w || 100; const r2h = r2.h || 40;
    return !(r2.x > r1.x + r1.w || r2.x + r2w < r1.x || r2.y > r1.y + r1.h || r2.y + r2h < r1.y);
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
        if (item) {
            item.x += dx; item.y += dy;
            if (!item.text && item.memberIds) item.memberIds.forEach(mid => { const m = state.nodes.find(n => n.id === mid); if (m) { m.x += dx; m.y += dy; } });
        }
    });
    render();
}
function colorSelection(colorClass) { state.nodes.forEach(n => { if (state.selection.has(n.id)) n.color = colorClass; }); render(); }

// Persistence with Timestamp
function getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function exportJson() {
    const data = JSON.stringify({ nodes: state.nodes, groups: state.groups, links: state.links }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept-canvas_${getTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById('btn-export').onclick = () => {
    exportJson();
};
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