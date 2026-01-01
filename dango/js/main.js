
const TRANSLATIONS = {
    zh: {
        page_title: "Dango 画板：组织灵感，一目了然",
        brand_name: "Dango 画板",
        lang_toggle: "EN",
        lang_tooltip: "切换至英文",
        input_placeholder: "输入想法... (空格/逗号/换行分隔)",
        btn_add: "✨ 生成节点 ✨",
        btn_export: "导出",
        btn_import: "导入",
        confirm_clear: "确定?",
        help_undo: "撤销 / 重做",
        help_pan: "平移画布",
        help_zoom: "缩放",
        help_edit: "编辑 / 多选",
        help_copy: "复制 / 粘贴",
        help_group: "编组 / 解组",
        help_link: "连线",
        help_align: "对齐",
        help_color: "切换颜色",
        alert_file_err: "文件格式错误",
        settings_tooltip: "设置",
        settings_precise: "精准映射 (按行布局)",
        settings_hide_grid: "隐藏网格点",
        help_tooltip: "帮助/快捷键",
        settings_alt_as_ctrl: "Alt 兼任 Ctrl",
        btn_export: "导出",
        settings_hand_drawn: "手写风格 (需加载字体)",
        empty_prompt: "输入想法，开启你的画布 ✨",
        toast_cleared: "画布已清空",
        toast_imported: "画布已导入",
        toast_undo: "撤销",
        toast_export_prev: "导出刚刚的备份 ✨",
        toast_import_success: "导入成功 ✨",
        help_delete: "删除选中",
        help_home: "回归中心",
    },
    en: {
        page_title: "Dango: Drop a nugget, get organized",
        brand_name: "Dango",
        lang_toggle: "中",
        lang_tooltip: "Switch to Chinese",
        input_placeholder: "Enter ideas... (Space/Comma/Newline)",
        btn_add: "✨ Create Nodes ✨",
        btn_export: "Export",
        btn_import: "Import",
        confirm_clear: "Sure?",
        help_undo: "Undo / Redo",
        help_pan: "Pan Canvas",
        help_zoom: "Zoom",
        help_edit: "Edit / Multi-select",
        help_copy: "Copy / Paste",
        help_group: "Group / Ungroup",
        help_link: "Link Nodes",
        help_align: "Align",
        help_color: "Change Color",
        alert_file_err: "Invalid file format",
        settings_tooltip: "Settings",
        settings_precise: "Precise Mapping (Line-based)",
        settings_hide_grid: "Hide Grid Dots",
        help_tooltip: "Help / Shortcut",
        settings_alt_as_ctrl: "Alt as Ctrl modifier",
        btn_export: "Export",
        settings_hand_drawn: "Hand-drawn Style (Load fonts)",
        empty_prompt: "Type ideas here to start ✨",
        toast_cleared: "Canvas cleared",
        toast_imported: "Canvas imported",
        toast_undo: "Undo",
        toast_export_prev: "Export Backup ✨",
        toast_import_success: "Imported successfully ✨",
        help_delete: "Delete Selected",
        help_home: "Back to Center",
    }
};

// 简单的纯链接判断 (以 http, https 或 www 开头，且不含空格)
function isUrl(str) {
    return /^(https?:\/\/|www\.)\S+$/i.test(str.trim());
}
// --- 修改初始化逻辑 ---
const LS_LANG_KEY = 'cc-lang';
// 优先从本地缓存读取，其次检测浏览器语言（只支持中英，其余默认英）
let currentLang = localStorage.getItem(LS_LANG_KEY) ||
    (navigator.language.startsWith('zh') ? 'zh' : 'en');

function updateI18n() {
    const texts = TRANSLATIONS[currentLang];

    // 1. 修改浏览器标签页标题
    document.title = texts.page_title;

    // 2. 更新所有文本内容 (data-i18n)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.innerText = texts[key];
    });

    // 3. 更新所有悬浮说明 (data-i18n-title)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (texts[key]) el.title = texts[key];
    });

    // 4. 更新所有占位符 (data-i18n-placeholder)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[key]) el.placeholder = texts[key];
    });

    // 5. 特殊处理：语言切换按钮本身的文字
    document.getElementById('btn-lang').innerText = texts['lang_toggle'];

    // 6. 特殊处理：清空按钮状态回复
    if (!clearConfirm) {
        document.getElementById('btn-clear').innerText = "🗑️";
    }
    // 导出按钮
    const mainBtn = document.querySelector('#export-container [data-i18n="btn_export"]');
    if (mainBtn) mainBtn.innerText = texts.btn_export;

    localStorage.setItem(LS_LANG_KEY, currentLang);
}

document.getElementById('btn-lang').onclick = (e) => {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    updateI18n();
    e.currentTarget.blur();
};

// --- State & Config ---
const state = {
    nodes: [], groups: [], links: [],
    view: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1.2 },
    selection: new Set(),
    clipboard: []
};

// 🆕 History System (Undo/Redo)
const MAX_HISTORY = 50;
const history = { undo: [], redo: [] };

function pushHistory() {
    // 将 Set 转为 Array 存入快照
    const snapshot = JSON.stringify({
        nodes: state.nodes,
        groups: state.groups,
        links: state.links,
        selection: Array.from(state.selection) // ✨ 保存选中状态
    });

    if (history.undo.length > 0 && history.undo[history.undo.length - 1] === snapshot) return;

    history.undo.push(snapshot);
    if (history.undo.length > MAX_HISTORY) history.undo.shift();
    history.redo = [];
}

function undo() {
    if (history.undo.length === 0) return;

    // 存入当前状态到 redo
    const currentSnapshot = JSON.stringify({
        nodes: state.nodes,
        groups: state.groups,
        links: state.links,
        selection: Array.from(state.selection) // ✨
    });
    history.redo.push(currentSnapshot);

    const prev = JSON.parse(history.undo.pop());
    state.nodes = prev.nodes;
    state.groups = prev.groups;
    state.links = prev.links;

    // ✨ 恢复选中状态
    state.selection = new Set(prev.selection || []);

    render();
}

function redo() {
    if (history.redo.length === 0) return;

    const currentSnapshot = JSON.stringify({
        nodes: state.nodes,
        groups: state.groups,
        links: state.links,
        selection: Array.from(state.selection) // ✨
    });
    history.undo.push(currentSnapshot);

    const next = JSON.parse(history.redo.pop());
    state.nodes = next.nodes;
    state.groups = next.groups;
    state.links = next.links;

    // ✨ 恢复选中状态
    state.selection = new Set(next.selection || []);

    render();
}

const CONFIG = {
    colors: [
        'c-white', 'c-red', 'c-yellow', 'c-green', 'c-blue',
        'c-orange', 'c-purple', 'c-pink', 'c-cyan'
    ]
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Initialization ---
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

// Icons for theme
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

function updateTheme() {
    htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeBtn.innerHTML = isDark ? ICON_SUN : ICON_MOON;
    localStorage.setItem('cc-theme', isDark ? 'dark' : 'light');
}
updateTheme();
themeBtn.onclick = (e) => {
    isDark = !isDark;
    updateTheme();
    e.currentTarget.blur();
};

state.settings = {
    preciseLayout: localStorage.getItem('cc-precise-layout') === 'true',
    hideGrid: localStorage.getItem('cc-hide-grid') === 'true',
    altAsCtrl: localStorage.getItem('cc-alt-as-ctrl') === 'true',
    handDrawn: localStorage.getItem('cc-hand-drawn') === 'true'
};

// 齿轮按钮点击
const btnSettings = document.getElementById('btn-settings');
const modalSettings = document.getElementById('settings-modal');
const checkPrecise = document.getElementById('check-precise');
const checkHideGrid = document.getElementById('check-hide-grid');
const checkAltAsCtrl = document.getElementById('check-alt-as-ctrl');
const checkHandDrawn = document.getElementById('check-hand-drawn');

function applySettings() {
    checkPrecise.checked = state.settings.preciseLayout;
    checkHideGrid.checked = state.settings.hideGrid;
    checkAltAsCtrl.checked = state.settings.altAsCtrl;
    checkHandDrawn.checked = state.settings.handDrawn;
    // 根据状态给 body 添加或移除类
    document.body.classList.toggle('hide-grid', state.settings.hideGrid);
}

checkPrecise.onchange = (e) => {
    state.settings.preciseLayout = e.target.checked;
    localStorage.setItem('cc-precise-layout', e.target.checked);
};

checkHideGrid.onchange = (e) => {
    state.settings.hideGrid = e.target.checked;
    localStorage.setItem('cc-hide-grid', e.target.checked);
    document.body.classList.toggle('hide-grid', state.settings.hideGrid);
};

checkAltAsCtrl.onchange = (e) => {
    state.settings.altAsCtrl = e.target.checked;
    localStorage.setItem('cc-alt-as-ctrl', e.target.checked);
};

function isModifier(e) {
    // 如果开启了选项，Alt 也可以作为辅助键
    return e.ctrlKey || e.metaKey || (state.settings.altAsCtrl && e.altKey);
}

btnSettings.onclick = (e) => {
    e.stopPropagation(); // 阻止冒泡，防止触发 window.onclick

    const isShowing = modalSettings.classList.contains('show');
    if (isShowing) {
        modalSettings.classList.remove('show');
        btnSettings.classList.remove('active');
    } else {
        // 打开设置时，关闭帮助面板，避免重叠
        els.helpModal.classList.remove('show');
        els.btnHelp.classList.remove('active');

        modalSettings.classList.add('show');
        btnSettings.classList.add('active');
    }
};


// 点击外部关闭设置
window.addEventListener('click', (e) => {
    if (!btnSettings.contains(e.target)) {
        modalSettings.classList.remove('show');
        btnSettings.classList.remove('active');
    }
});

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
    if (state.nodes.length === 0) {
        document.body.classList.add('is-empty');
    } else {
        document.body.classList.remove('is-empty');
    }
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
    
    // --- 链接识别逻辑 ---
    if (isUrl(node.text)) {
        el.classList.add('is-link');
        
        // 1. 查找或创建文本容器
        let textEl = el.querySelector('.node-text');
        if (!textEl) {
            el.innerHTML = ''; // 清空可能存在的纯文本
            textEl = document.createElement('div');
            textEl.className = 'node-text';
            el.appendChild(textEl);
        }
        if (textEl.innerText !== node.text) textEl.innerText = node.text;

        // 2. 查找或创建跳转按钮
        let btnEl = el.querySelector('.link-btn');
        if (!btnEl) {
            btnEl = document.createElement('div');
            btnEl.className = 'link-btn';
            btnEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>'; // 使用 SVG 图标更精致
            // btnEl.title = "Open Link";
            
            // 阻止冒泡：防止点击按钮时触发节点选择或拖拽
            btnEl.onmousedown = (e) => e.stopPropagation();
            btnEl.onclick = (e) => {
                e.stopPropagation();
                let url = node.text.trim();
                if (!url.startsWith('http')) url = 'https://' + url;
                window.open(url, '_blank');
            };
            el.appendChild(btnEl);
        }

    } else {
        // --- 普通文本逻辑 ---
        el.classList.remove('is-link');
        // 如果之前是链接结构，现在变回文本了，或者本来就是文本
        // 为了安全，如果里面有 .node-text 结构，先清理
        if (el.querySelector('.node-text')) el.innerHTML = '';
        
        if (el.innerText !== node.text && !el.isContentEditable) el.innerText = node.text;
    }

    // --- 通用样式处理 ---
    const isSelected = state.selection.has(node.id);
    const classes = ['node'];
    if (isUrl(node.text)) classes.push('is-link'); // 确保 class 存在
    classes.push(node.color || 'c-white');
    if (isSelected) classes.push('selected');
    
    // 注意：el.className 赋值会覆盖上面的 add/remove，所以我们要合并
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
    const text = els.input.value;
    if (!text.trim()) return;

    pushHistory();

    const centerX = (window.innerWidth / 2 - state.view.x) / state.view.scale;
    const centerY = (window.innerHeight / 2 - state.view.y) / state.view.scale;
    const spacingX = 140;
    const spacingY = 80;

    // const existingTexts = new Set(state.nodes.map(n => n.text));
    function parsePhrases(input) {
        // 正则解释：
        // "([^"]*)" -> 匹配双引号内容
        // '([^']*)' -> 匹配单引号内容
        // ([^\s,，\n]+) -> 匹配非空格/逗号/换行的普通字符
        const regex = /"([^"]*)"|'([^']*)'|“([^”]*)”|‘([^’]*)’|([^\s,，\n]+)/g;
        const result = [];
        let match;
        while ((match = regex.exec(input)) !== null) {
            // match[1] 是双引号捕获，match[2] 是单引号，match[3] 是普通词
            const phrase = match[1] || match[2] || match[3] || match[4] || match[5];
            if (phrase && phrase.trim()) result.push(phrase.trim());
        }
        return result;
    }
    let nodesToCreate = [];

    if (state.settings.preciseLayout) {
        // --- 精准映射逻辑 (回车换行) ---
        const lines = text.split('\n');
        lines.forEach((line, rowIndex) => {
            const phrases = parsePhrases(line); // 对每一行进行短语解析
            phrases.forEach((phrase, colIndex) => {
                // if (!existingTexts.has(phrase)) {
                nodesToCreate.push({ text: phrase, row: rowIndex, col: colIndex });
                // }
            });
        });

        if (nodesToCreate.length === 0) return;

        // 计算矩阵包围盒以便居中
        const maxRow = Math.max(...nodesToCreate.map(n => n.row));
        const rows = [...new Set(nodesToCreate.map(n => n.row))].sort((a, b) => a - b);

        // 我们需要找出每一行实际有多少个词来辅助居中（这里简化处理，按整体最大列宽居中）
        const maxCol = Math.max(...nodesToCreate.map(n => n.col));

        const startX = centerX - (maxCol * spacingX) / 2 - 50;
        const startY = centerY - (maxRow * spacingY) / 2 - 20;

        nodesToCreate.forEach(n => {
            state.nodes.push({
                id: uid(), text: n.text,
                x: startX + n.col * spacingX, y: startY + n.row * spacingY,
                w: 0, h: 0, color: 'c-white'
            });
        });
    } else {
        // --- 原有的自动流式逻辑 (5列) ---
        const phrases = parsePhrases(text); // 全局解析
        const filteredParts = phrases // .filter(p => !existingTexts.has(p));

        const colCount = Math.min(filteredParts.length, 5);
        const rowCount = Math.ceil(filteredParts.length / 5);
        const startX = centerX - ((colCount - 1) * spacingX) / 2 - 50;
        const startY = centerY - ((rowCount - 1) * spacingY) / 2 - 20;

        filteredParts.forEach((str, index) => {
            state.nodes.push({
                id: uid(), text: str,
                x: startX + (index % 5) * spacingX, y: startY + Math.floor(index / 5) * spacingY,
                w: 0, h: 0, color: 'c-white'
            });
        });
    }

    els.input.value = '';
    render();
};

const btnClear = document.getElementById('btn-clear');
let clearConfirm = false;
btnClear.onclick = () => {
    const texts = TRANSLATIONS[currentLang];
    if (!clearConfirm) {
        clearConfirm = true;
        btnClear.innerText = texts['confirm_clear'];
        btnClear.classList.add('btn-danger');
        setTimeout(() => {
            if (clearConfirm) {
                clearConfirm = false;
                btnClear.innerText = "🗑️";
                btnClear.classList.remove('btn-danger');
            }
        }, 3000);
    } else {
        // 💾 捕捉快照
        const snapshot = { nodes: [...state.nodes], groups: [...state.groups], links: [...state.links] };

        pushHistory();
        state.nodes = []; state.groups = []; state.links = []; state.selection.clear();

        clearConfirm = false;
        btnClear.innerText = "🗑️";
        btnClear.classList.remove('btn-danger');
        render();

        // 🍞 弹出带“救命稻草”的 Toast
        showToast(texts.toast_cleared, snapshot);
    }
};

// Help Toggle
els.btnHelp.onclick = (e) => {
    e.stopPropagation();

    const isShowing = els.helpModal.classList.contains('show');
    if (isShowing) {
        els.helpModal.classList.remove('show');
        els.btnHelp.classList.remove('active');
    } else {
        // 打开帮助时，关闭设置面板
        modalSettings.classList.remove('show');
        btnSettings.classList.remove('active');

        els.helpModal.classList.add('show');
        els.btnHelp.classList.add('active');
    }
};

// 3. ✨ 核心改进：点击面板内部时，不要关闭面板
modalSettings.onclick = (e) => {
    e.stopPropagation();
};

els.helpModal.onclick = (e) => {
    e.stopPropagation();
};

// Close Help when closing UI or clicking outside
els.uiLayer.addEventListener('mouseleave', () => {
    els.helpModal.classList.remove('show');
    els.btnHelp.classList.remove('active');
});
els.helpModal.onclick = (e) => e.stopPropagation();
window.addEventListener('click', (e) => {
    // 关闭设置
    if (!btnSettings.contains(e.target) && !modalSettings.contains(e.target)) {
        modalSettings.classList.remove('show');
        btnSettings.classList.remove('active');
    }
    // 关闭帮助
    if (!els.btnHelp.contains(e.target) && !els.helpModal.contains(e.target)) {
        els.helpModal.classList.remove('show');
        els.btnHelp.classList.remove('active');
    }
});

let dragStart = null;
let mode = null;
const keys = {};

// Record state BEFORE manipulation starts
let stateBeforeDrag = null;
let isPrepareToClone = false;
let targetAlreadySelectedAtStart = false; // 记录点击前的选中状态

els.container.addEventListener('mousedown', e => {
    if (e.target.isContentEditable) return;
    if (viewAnimationId) {
        cancelAnimationFrame(viewAnimationId);
        viewAnimationId = null;
    }
    if (e.target.closest('.node') && e.detail === 2) return;

    if (e.button === 1 || (e.button === 0 && keys.Space)) {
        mode = 'pan';
        dragStart = { x: e.clientX, y: e.clientY, viewX: state.view.x, viewY: state.view.y };
        document.body.classList.add('mode-pan');
        return;
    }

    if (e.button === 0) {
        const nodeEl = e.target.closest('.node');
        const groupEl = e.target.closest('.group');
        const worldPos = screenToWorld(e.clientX, e.clientY);

        if (nodeEl || groupEl) {
            const id = (nodeEl || groupEl).dataset.id;
            targetIdAtMouseDown = id;
            targetAlreadySelectedAtStart = state.selection.has(id);
            hasMovedDuringDrag = false; // 重置移动标记

            if (isModifier(e)) {
                // Ctrl 模式：先确保它在选择集里，方便拖动或克隆
                state.selection.add(id);
                isPrepareToClone = true;
                render();
            } else {
                // 普通模式：如果点的不是已选中的，清空并选择当前
                if (!targetAlreadySelectedAtStart) {
                    state.selection.clear();
                    state.selection.add(id);
                    render();
                }
                isPrepareToClone = false;
            }

            mode = 'move';

            // Snapshot state before dragging starts (for Undo)
            stateBeforeDrag = JSON.stringify({ nodes: state.nodes, groups: state.groups, links: state.links });

            dragStart = { x: worldPos.x, y: worldPos.y, initialPos: getSelectionPositions() };
        } else {
            if (!isModifier(e) && !e.shiftKey) state.selection.clear();
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

        // 只要移动距离超过阈值，就标记为已移动
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMovedDuringDrag = true;

            // 触发克隆逻辑
            if (isPrepareToClone) {
                cloneSelectionInPlace();
                isPrepareToClone = false; // 一次拖拽只克隆一次
            }
        }

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
    if (mode === 'move') {
        // --- 修复多次单选的关键逻辑 ---
        if (!hasMovedDuringDrag && isModifier(e) && targetAlreadySelectedAtStart) {
            // 如果是按住 Ctrl 点了一个已经选中的物体，且中途没移动
            // 说明用户是想“取消选择”这个物体
            state.selection.delete(targetIdAtMouseDown);
            render();
        }

        if (stateBeforeDrag) {
            const currentState = JSON.stringify({ nodes: state.nodes, groups: state.groups, links: state.links });
            // 如果当前状态和按下鼠标前不一样（移动了或克隆了）
            if (currentState !== stateBeforeDrag) {
                history.undo.push(stateBeforeDrag); // 将按下前的一刻存入撤销栈
                if (history.undo.length > MAX_HISTORY) history.undo.shift();
                history.redo = [];
            }
            stateBeforeDrag = null;
        }
    }

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
    mode = null;
    dragStart = null;
    isPrepareToClone = false;
    targetIdAtMouseDown = null;
    document.body.classList.remove('mode-pan');
});

els.container.addEventListener('wheel', e => {
    if (viewAnimationId) {
        cancelAnimationFrame(viewAnimationId);
        viewAnimationId = null;
    }
    e.preventDefault();
    if (isModifier(e)) {
        const factor = 1 + ((e.deltaY > 0 ? -1 : 1) * 0.1);
        const worldX = (e.clientX - state.view.x) / state.view.scale;
        const worldY = (e.clientY - state.view.y) / state.view.scale;
        state.view.scale = Math.max(0.1, Math.min(5, state.view.scale * factor));
        state.view.x = e.clientX - worldX * state.view.scale;
        state.view.y = e.clientY - worldY * state.view.scale;
    } else {
        state.view.x -= e.deltaX;
        state.view.y -= e.deltaY;
    }
    render();
}, { passive: false });

els.container.addEventListener('dblclick', e => {
    // 找到节点（注意：因为加了子元素，target 可能是 .node-text，需向上查找）
    const nodeEl = e.target.closest('.node');
    
    if (nodeEl) {
        const node = state.nodes.find(n => n.id === nodeEl.dataset.id);
        if (node) {
            pushHistory();

            // ✨ 编辑前清理：如果是链接结构，还原为纯文本，方便编辑
            if (nodeEl.classList.contains('is-link')) {
                nodeEl.innerText = node.text; // 移除 .node-text 和 .link-btn，只留纯文本
                nodeEl.classList.remove('is-link'); // 移除样式限制，让长网址完全展开
            }

            nodeEl.contentEditable = true; 
            nodeEl.classList.add('editing'); 
            nodeEl.focus();
            
            // 全选文本
            const range = document.createRange(); 
            range.selectNodeContents(nodeEl);
            const sel = window.getSelection(); 
            sel.removeAllRanges(); 
            sel.addRange(range);

            const finishEdit = () => {
                nodeEl.contentEditable = false; 
                nodeEl.classList.remove('editing');
                
                // 获取新文本
                node.text = nodeEl.innerText;
                
                // 清除高亮
                const currentSel = window.getSelection();
                if (currentSel) currentSel.removeAllRanges();

                // 强制重绘：renderNode 会判断新文本是否为 URL，并重新生成结构
                render();
            };

            nodeEl.onblur = finishEdit;
            nodeEl.onkeydown = (ev) => { 
                if (ev.key === 'Enter') { 
                    ev.preventDefault(); 
                    nodeEl.blur(); 
                } 
                ev.stopPropagation(); 
            };
        }
    }
});

window.addEventListener('keydown', e => {
    // 如果正在输入，跳过
    if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    keys[e.code] = true;

    if (e.code === 'Space') { e.preventDefault(); document.body.classList.add('mode-space'); }

    // 🆕 Undo / Redo Shortcuts
    if (isModifier(e) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
    }
    // Redo alternative (Ctrl+Y)
    if (isModifier(e) && e.code === 'KeyY') {
        e.preventDefault(); redo(); return;
    }

    // Actions that change state need pushHistory()
    if (isModifier(e) && e.code === 'KeyG' && !e.shiftKey) { e.preventDefault(); pushHistory(); createGroup(); }
    if (isModifier(e) && e.shiftKey && e.code === 'KeyG') { e.preventDefault(); pushHistory(); dissolveGroup(); }
    if (isModifier(e) && e.code === 'KeyL') { e.preventDefault(); pushHistory(); toggleLink(); }
    if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); pushHistory(); deleteSelection(); }
    if (e.code === 'Home') { e.preventDefault(); resetViewToCenter(true); }

    if (isModifier(e) && e.code === 'KeyC') { e.preventDefault(); copySelection(); }
    if (isModifier(e) && e.code === 'KeyV') { e.preventDefault(); pushHistory(); pasteClipboard(); }

    // Nudge (also changes state)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !e.altKey) {
        e.preventDefault();
        // We probably don't want to save history on every pixel nudge, but for correctness:
        // A better approach for nudge might be debouncing history save, but here we keep it simple.
        pushHistory();
        nudgeSelection(e.code);
    }

    if (e.altKey && !e.shiftKey && e.code.startsWith('Digit')) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= CONFIG.colors.length) {
            e.preventDefault();
            pushHistory();
            colorSelection(CONFIG.colors[num - 1]);
        }
    }

    if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); exportJson(); }

    if (e.altKey) {
        pushHistory(); // Alignment changes state
        switch (e.code) {
            case 'KeyA': e.preventDefault(); alignSelection('left'); break;
            case 'KeyD': e.preventDefault(); alignSelection('right'); break;
            case 'KeyW': e.preventDefault(); alignSelection('top'); break;
            case 'KeyS': e.preventDefault(); alignSelection('bottom'); break;
            case 'KeyH': e.preventDefault(); e.shiftKey ? distributeSelection('h') : alignSelection('centerX'); break;
            case 'KeyJ': e.preventDefault(); e.shiftKey ? distributeSelection('v') : alignSelection('centerY'); break;
        }
    }
});

window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Space') document.body.classList.remove('mode-space');
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
function copySelection() {
    const selNodes = state.nodes.filter(n => state.selection.has(n.id));
    const selGroups = state.groups.filter(g => state.selection.has(g.id));
    if (selNodes.length > 0 || selGroups.length > 0) {
        state.clipboard = JSON.parse(JSON.stringify({ nodes: selNodes, groups: selGroups }));
    }
}
function pasteClipboard() {
    if (!state.clipboard || (!state.clipboard.nodes.length && !state.clipboard.groups.length)) return;
    state.selection.clear();
    const mapping = {};
    state.clipboard.nodes.forEach(n => {
        const newId = uid(); mapping[n.id] = newId;
        const newNode = { ...n, id: newId, x: n.x + 20, y: n.y + 20 };
        state.nodes.push(newNode); state.selection.add(newId);
    });
    state.clipboard.groups.forEach(g => {
        const newId = uid();
        const newGroup = { ...g, id: newId, x: g.x + 20, y: g.y + 20 };
        newGroup.memberIds = g.memberIds.map(mid => mapping[mid] || mid);
        state.groups.push(newGroup); state.selection.add(newId);
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

function cloneSelectionInPlace() {
    // 1. 🔴 移除这里的 pushHistory()，交给 mouseup 统一处理

    const mapping = {};
    const newNodes = [];
    const newGroups = [];
    const newSelection = new Set();

    // 2. 复制节点
    state.nodes.forEach(n => {
        if (state.selection.has(n.id)) {
            const newId = uid();
            mapping[n.id] = newId;
            // 创建副本
            const newNode = { ...n, id: newId };
            newNodes.push(newNode);
            newSelection.add(newId); // 新节点将进入选择集

            // 重要：将新节点的初始位置同步到 dragStart，以便后续 mousemove 计算
            if (dragStart && dragStart.initialPos[n.id]) {
                dragStart.initialPos[newId] = { ...dragStart.initialPos[n.id] };
            }
        }
    });

    // 3. 复制组
    state.groups.forEach(g => {
        if (state.selection.has(g.id)) {
            const newId = uid();
            const newGroup = { ...g, id: newId };
            newGroup.memberIds = g.memberIds.map(mid => mapping[mid] || mid);
            newGroups.push(newGroup);
            newSelection.add(newId);

            if (dragStart && dragStart.initialPos[g.id]) {
                dragStart.initialPos[newId] = { ...dragStart.initialPos[g.id] };
            }
        }
    });

    // 4. 更新画布状态
    state.nodes.push(...newNodes);
    state.groups.push(...newGroups);

    // 5. ✨ 关键：切换选择集
    // 原来的节点（带线的）会留在原地，鼠标现在拖拽的是新生成的副本
    state.selection = newSelection;
}
// document.getElementById('btn-export').onclick = exportJson;
document.getElementById('file-input').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            pushHistory();
            state.nodes = data.nodes || [];
            state.groups = data.groups || [];
            state.links = data.links || [];
            state.selection.clear();
            render();
            // 🍞 纯成功的 Toast
            showToast(TRANSLATIONS[currentLang].toast_import_success);
        }
        catch (err) { alert(TRANSLATIONS[currentLang].alert_file_err); }
    };
    reader.readAsText(file); e.target.value = '';
};

function exportToSVG() {
    if (state.nodes.length === 0) return;

    // 1. 计算所有元素（节点+组）的包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const elements = [...state.nodes, ...state.groups];
    elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.w || 100));
        maxY = Math.max(maxY, el.y + (el.h || 40));
    });

    const padding = 60; // 留白
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    // 2. 获取当前主题的颜色样式
    const bodyStyle = getComputedStyle(document.body);
    const bgColor = bodyStyle.backgroundColor;
    const groupBorderColor = bodyStyle.getPropertyValue('--group-border').trim();
    const groupBgColor = bodyStyle.getPropertyValue('--group-bg').trim();
    const linkColor = bodyStyle.getPropertyValue('--link-color').trim();

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // --- 层级 1: 完整背景 ---
    svgContent += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

    // --- 层级 2: 绘制 组 (Groups) ---
    state.groups.forEach(g => {
        svgContent += `<rect x="${g.x + offsetX}" y="${g.y + offsetY}" width="${g.w}" height="${g.h}" 
            rx="20" ry="20" fill="${groupBgColor}" stroke="${groupBorderColor}" 
            stroke-width="2" stroke-dasharray="5,5" />`;
    });

    // --- 层级 3: 绘制 连线 (Links) ---
    state.links.forEach(l => {
        const n1 = state.nodes.find(n => n.id === l.sourceId);
        const n2 = state.nodes.find(n => n.id === l.targetId);
        if (n1 && n2) {
            const c1 = { x: n1.x + (n1.w || 0) / 2 + offsetX, y: n1.y + (n1.h || 0) / 2 + offsetY };
            const c2 = { x: n2.x + (n2.w || 0) / 2 + offsetX, y: n2.y + (n2.h || 0) / 2 + offsetY };
            svgContent += `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" 
                stroke="${linkColor}" stroke-width="2" opacity="0.5" />`;
        }
    });

    // --- 层级 4: 绘制 节点 (Nodes) ---
    state.nodes.forEach(n => {
        const el = document.querySelector(`.node[data-id="${n.id}"]`);
        if (!el) return;
        const style = getComputedStyle(el);
        const nodeBg = style.backgroundColor;
        const nodeStroke = style.borderColor;
        const nodeText = style.color;

        svgContent += `
            <rect x="${n.x + offsetX}" y="${n.y + offsetY}" width="${n.w}" height="${n.h}" 
                rx="12" ry="12" fill="${nodeBg}" stroke="${nodeStroke}" stroke-width="1" />
            <text x="${n.x + n.w / 2 + offsetX}" y="${n.y + n.h / 2 + offsetY}" 
                dominant-baseline="central" text-anchor="middle" 
                font-family="sans-serif" font-size="14" font-weight="500" fill="${nodeText}">${escapeHtml(n.text)}</text>
        `;
    });

    svgContent += `</svg>`;

    // 触发下载
    downloadBlob(svgContent, `concept-canvas_${getTimestamp()}.svg`, 'image/svg+xml');
}

// 辅助：转义 HTML 特殊字符防止 SVG 报错
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// 辅助：下载函数
function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}


const actionStack = document.getElementById('action-stack');
const btnExportMain = document.getElementById('btn-export-main');
let exportResetTimer = null;

// 面板重置函数
function resetActionStack() {
    actionStack.classList.remove('is-exporting');
    clearTimeout(exportResetTimer);
}

// 点击“导出”：翻转
btnExportMain.onclick = (e) => {
    e.stopPropagation();
    actionStack.classList.add('is-exporting');

    // 5秒自动重置（用户无操作时自动退回）
    clearTimeout(exportResetTimer);
    exportResetTimer = setTimeout(resetActionStack, 5000);
};

// 具体的选项逻辑
document.getElementById('opt-json').onclick = (e) => {
    e.stopPropagation();
    exportJson();
    resetActionStack(); // 点击即消失
};

document.getElementById('opt-svg').onclick = (e) => {
    e.stopPropagation();
    exportToSVG();
    resetActionStack(); // 点击即消失
};

document.getElementById('opt-link').onclick = (e) => {
    e.stopPropagation();
    createShareLink();
    resetActionStack(); // 你的直觉：LINK 点击后也立即消失
};

// 补充：点击页面其他地方也重置面板
window.addEventListener('click', () => {
    if (actionStack.classList.contains('is-exporting')) {
        resetActionStack();
    }
});

function createShareLink() {
    const data = JSON.stringify({
        nodes: state.nodes,
        groups: state.groups,
        links: state.links,
        settings: state.settings
    });

    const compressed = LZString.compressToEncodedURIComponent(data);

    // ✅ 修复本地文件路径问题
    const baseUrl = window.location.href.split('#')[0];
    const url = baseUrl + '#' + compressed;

    navigator.clipboard.writeText(url).then(() => {
        // ✅ 使用 Toast 代替 Alert
        const msg = currentLang === 'zh' ? "链接已复制到剪贴板 ✨" : "Link copied to clipboard ✨";
        showToast(msg);
    });
}
state.settings.handDrawn = localStorage.getItem('cc-hand-drawn') === 'true';

let fontsLoaded = false;

// 2. 动态加载字体函数
function loadHandDrawnFonts() {
    if (fontsLoaded) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // 引入 Architects Daughter (英) 和 霞鹜文楷 (中)
    // 使用国内 CDN 镜像或 Google Fonts (霞鹜文楷在 Google Fonts 上叫 LXGW WenKai)
    link.href = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=LXGW+WenKai+Mono+TC&display=swap';

    document.head.appendChild(link);
    fontsLoaded = true;
    console.log("Hand-drawn fonts loading started...");
}

// 3. 绑定开关
checkHandDrawn.onchange = (e) => {
    state.settings.handDrawn = e.target.checked;
    localStorage.setItem('cc-hand-drawn', e.target.checked);
    applyHandDrawnStyle();
};

function applyHandDrawnStyle() {
    if (state.settings.handDrawn) {
        loadHandDrawnFonts();
        document.body.classList.add('hand-drawn-style');
    } else {
        document.body.classList.remove('hand-drawn-style');
    }
}

function loadFromUrl() {
    const hash = window.location.hash.substring(1);
    if (!hash) return false;

    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(hash);
        if (!decompressed) return false;
        const data = JSON.parse(decompressed);

        // 💾 捕捉旧数据快照
        let oldSnapshot = null;
        if (state.nodes.length > 0) {
            oldSnapshot = { nodes: [...state.nodes], groups: [...state.groups], links: [...state.links] };
            pushHistory();
        }

        state.nodes = data.nodes || [];
        state.groups = data.groups || [];
        state.links = data.links || [];
        if (data.settings) state.settings = { ...state.settings, ...data.settings };

        render();
        applySettings();
        applyHandDrawnStyle();

        // 🍞 弹出带“救命稻草”的 Toast
        showToast(TRANSLATIONS[currentLang].toast_imported, oldSnapshot);

        window.history.replaceState(null, null, window.location.pathname);
        return true;
    } catch (e) {
        return false;
    }
}

// 在页面初始化（比如 window.onload 或 main.js 底部）调用
if (!loadFromUrl()) {
    loadData(); // 如果 URL 没数据，再尝试从本地存储加载
}

function showToast(message, safetySnapshot = null) {
    const texts = TRANSLATIONS[currentLang];
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';

    // 基础文本
    const textNode = document.createElement('span');
    textNode.innerText = message;
    toast.appendChild(textNode);

    // 如果提供了快照，添加“救命稻草”按钮
    if (safetySnapshot) {
        const actions = document.createElement('div');
        actions.className = 'toast-actions';

        // 1. 撤销按钮
        const btnUndo = document.createElement('button');
        btnUndo.className = 'btn-toast';
        btnUndo.innerText = texts.toast_undo;
        btnUndo.onclick = () => { undo(); toast.remove(); };

        // 2. 导出备份按钮
        const btnExport = document.createElement('button');
        btnExport.className = 'btn-toast';
        btnExport.innerText = texts.toast_export_prev;
        btnExport.onclick = () => {
            const data = JSON.stringify(safetySnapshot, null, 2);
            downloadBlob(data, `safety-backup_${getTimestamp()}.json`, 'application/json');
            toast.remove();
        };

        actions.appendChild(btnUndo);
        actions.appendChild(btnExport);
        toast.appendChild(actions);
    }

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    // 有交互的 Toast 停留时间稍长 (6秒)，纯文本 3秒
    const delay = safetySnapshot ? 6000 : 3000;
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }
    }, delay);
}

function resetViewToCenter(animated = true) {
    let targetX, targetY, targetScale = 1.2;
    targetX = window.innerWidth / 2;
    targetY = window.innerHeight / 2;

    if (animated) {
        animateView(targetX, targetY, targetScale);
    } else {
        state.view.x = targetX;
        state.view.y = targetY;
        state.view.scale = targetScale;
        render();
    }
}

// --- 视图动画系统 ---
let viewAnimationId = null;

function animateView(targetX, targetY, targetScale, duration = 400) {
    // 如果之前有动画在跑，先停掉
    if (viewAnimationId) cancelAnimationFrame(viewAnimationId);

    const startX = state.view.x;
    const startY = state.view.y;
    const startScale = state.view.scale;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // 动画运行中
            const ease = 1 - Math.pow(2, -10 * progress);
            state.view.x = startX + (targetX - startX) * ease;
            state.view.y = startY + (targetY - startY) * ease;
            state.view.scale = startScale + (targetScale - startScale) * ease;
            render();
            viewAnimationId = requestAnimationFrame(step);
        } else {
            // ✨ 最后一帧：强制精准赋值，消除 0.1% 的数学误差
            state.view.x = targetX;
            state.view.y = targetY;
            state.view.scale = targetScale;
            render();
            viewAnimationId = null; // 动画彻底结束
        }
    }


    viewAnimationId = requestAnimationFrame(step);
}
// 初始应用
applyHandDrawnStyle();
applySettings();
render();
updateI18n();