
const TRANSLATIONS = {
    zh: {
        page_title: "团子画板：组织灵感，一目了然",
        brand_name: "团子画板",
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
        settings_precise: "精准映射",
        settings_hide_grid: "隐藏网格点",
        help_tooltip: "帮助/快捷键",
        settings_alt_as_ctrl: "Alt 兼任 Ctrl",
        btn_export: "导出",
        settings_hand_drawn: "手写风格",
        empty_prompt: "输入想法，开启你的画布 ✨",
        toast_cleared: "画布已清空",
        toast_imported: "画布已导入",
        toast_undo: "撤销",
        toast_export_prev: "导出刚刚的备份 ✨",
        toast_import_success: "导入成功 ✨",
        help_delete: "删除选中",
        help_home: "回归中心",
        help_undo: "撤销 / 重做",
        help_pan_zoom: "平移 / 缩放",
        help_center: "回归视图中心",
        help_save: "保存画板文件",
        help_center_align: "分布对齐",
        help_clone: "克隆选中节点",
        help_select: "多选 / 框选",
        help_delete: "删除选中",
        help_nudge: "微调位置",
        btn_export_link: "链接",
        btn_export_file: "文件",
        btn_export_svg: "矢量图",
        btn_export_png: "图片",
        help_group: "编组 / 解组",
        help_link: "连线 / 断线",
        help_align: "方向对齐",
        help_color: "切换颜色",
        about_title: "关于",
        feedback: "反馈",
        about_desc: "简单、优雅的概念关系可视化工具。\n\n组织灵感，一目了然。",
        star_on_github: "在 GitHub 上点星支持",
        blog_link: "开发博客",
        buy_coffee: "请喝咖啡",
        alert_file_err: "文件格式错误，请上传 .dango 文件",
        settings_copy_mode: "复制代替下载",
        toast_copy_success: "图片已复制到剪贴板 ✨",
        toast_copy_fail: "浏览器限制，复制失败",
        help_spotlight: "聚光灯",
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
        settings_precise: "Precise Mapping",
        settings_hide_grid: "Hide Grid Dots",
        help_tooltip: "Help / Shortcut",
        settings_alt_as_ctrl: "Alt as Ctrl modifier",
        btn_export: "Export",
        settings_hand_drawn: "Hand-drawn Style",
        empty_prompt: "Type ideas here to start ✨",
        toast_cleared: "Canvas cleared",
        toast_imported: "Canvas imported",
        toast_undo: "Undo",
        toast_export_prev: "Export Backup ✨",
        toast_import_success: "Imported successfully ✨",
        help_delete: "Delete Selected",
        help_home: "Back to Center",
        help_undo: "Undo / Redo",
        help_pan_zoom: "Pan / Zoom",
        help_center: "Reset View",
        help_save: "Save Dango File",
        help_center_align: "Align Distribution",
        help_clone: "Clone Selection",
        help_select: "Multi-select",
        help_delete: "Delete Selected",
        help_nudge: "Nudge Position",
        btn_export_link: "LINK",
        btn_export_file: "FILE",
        btn_export_svg: "SVG",
        btn_export_png: "PNG",
        help_group: "Group / Ungroup",
        help_link: "Link / Unlink",
        help_align: "Align Direction",
        help_color: "Change Color",
        about_title: "About",
        feedback: "Feedback",
        about_desc: "Drop a nugget, get organized.",
        star_on_github: "Star on GitHub",
        blog_link: "Dev Blog",
        buy_coffee: "Buy me a coffee",
        alert_file_err: "Invalid format, please upload .dango file",
        settings_copy_mode: "Copy PNG to clipboard (No download)",
        toast_copy_success: "High-res image copied to clipboard ✨",
        toast_copy_fail: "Copy failed by browser limit",
        help_spotlight: "Spotlight",
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
// 2. 关于弹窗逻辑
const aboutOverlay = document.getElementById('about-overlay');
const btnTriggerAbout = document.getElementById('trigger-about');
const btnCloseAbout = document.getElementById('btn-close-about');

// 打开关于
btnTriggerAbout.onclick = (e) => {
    e.stopPropagation();
    
    // 1. 关闭帮助菜单的显示状态
    els.helpModal.classList.remove('show');
    els.btnHelp.classList.remove('active');
    
    // 2. ✨ 核心修复：让按钮失去焦点
    // 这会打破 CSS 的 #ui-layer:focus-within 规则，
    // 导致左上角的大面板自动缩回成一个小胶囊
    btnTriggerAbout.blur(); 
    
    // 3. 打开关于弹窗
    aboutOverlay.classList.add('show');
};

// 关闭关于
function closeAbout() {
    aboutOverlay.classList.remove('show');
}
btnCloseAbout.onclick = closeAbout;
aboutOverlay.onclick = (e) => {
    // 点击遮罩层关闭
    if (e.target === aboutOverlay) closeAbout();
};

// 按 ESC 关闭所有弹窗
window.addEventListener('keydown', e => {
    // ... 原有代码 ...
    if (e.code === 'Escape') {
        // 依次关闭：关于 -> 设置/帮助 -> 选中
        if (aboutOverlay.classList.contains('show')) {
            closeAbout();
        } else if (els.helpModal.classList.contains('show') || modalSettings.classList.contains('show')) {
            els.helpModal.classList.remove('show');
            els.btnHelp.classList.remove('active');
            modalSettings.classList.remove('show');
            btnSettings.classList.remove('active');
        } else {
            state.selection.clear();
            render();
        }
    }
});

function createNodesFromInput() {
    const text = els.input.value;
    if (!text.trim()) return;

    pushHistory();

    const centerX = (window.innerWidth / 2 - state.view.x) / state.view.scale;
    const centerY = (window.innerHeight / 2 - state.view.y) / state.view.scale;
    const spacingX = 140;
    const spacingY = 80;

    function parsePhrases(input) {
        const regex = /"([^"]*)"|'([^']*)'|“([^”]*)”|‘([^’]*)’|([^\s,，\n]+)/g;
        const result = [];
        let match;
        while ((match = regex.exec(input)) !== null) {
            const phrase = match[1] || match[2] || match[3] || match[4] || match[5];
            if (phrase && phrase.trim()) result.push(phrase.trim());
        }
        return result;
    }

    let nodesToCreate = [];

    if (state.settings.preciseLayout) {
        const lines = text.split('\n');
        lines.forEach((line, rowIndex) => {
            const phrases = parsePhrases(line);
            phrases.forEach((phrase, colIndex) => {
                nodesToCreate.push({ text: phrase, row: rowIndex, col: colIndex });
            });
        });

        if (nodesToCreate.length === 0) return;
        const maxRow = Math.max(...nodesToCreate.map(n => n.row));
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
        const phrases = parsePhrases(text); 
        const colCount = Math.min(phrases.length, 5);
        const rowCount = Math.ceil(phrases.length / 5);
        const startX = centerX - ((colCount - 1) * spacingX) / 2 - 50;
        const startY = centerY - ((rowCount - 1) * spacingY) / 2 - 20;

        phrases.forEach((str, index) => {
            state.nodes.push({
                id: uid(), text: str,
                x: startX + (index % 5) * spacingX, y: startY + Math.floor(index / 5) * spacingY,
                w: 0, h: 0, color: 'c-white'
            });
        });
    }

    els.input.value = '';
    render();
}


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
    handDrawn: localStorage.getItem('cc-hand-drawn') === 'true',
    copyMode: localStorage.getItem('cc-copy-mode') === 'true' 
};
const checkCopyMode = document.getElementById('check-copy-mode');
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
    checkCopyMode.checked = state.settings.copyMode;
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

checkCopyMode.onchange = (e) => {
    state.settings.copyMode = e.target.checked;
    localStorage.setItem('cc-copy-mode', e.target.checked);
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
    spotlight: document.getElementById('spotlight-layer'),
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

    const defsContent = `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 8 5 L 0 10" stroke="${getComputedStyle(document.body).getPropertyValue('--link-color').trim()}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></marker></defs>`;
    els.connectionsLayer.innerHTML = defsContent;

    state.links.forEach(l => {
        const n1 = state.nodes.find(n => n.id === l.sourceId);
        const n2 = state.nodes.find(n => n.id === l.targetId);
        
        // ✨ 确保节点尺寸已计算，否则无法计算交点
        if (n1 && n2 && n1.w && n1.h && n2.w && n2.h) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            
            // ✨✨✨ 核心修改：计算边框交点 ✨✨✨
            const startPoint = getEdgeIntersection(n2, n1); // 从 n2 指向 n1 的交点
            const endPoint = getEdgeIntersection(n1, n2);   // 从 n1 指向 n2 的交点

            line.setAttribute('x1', startPoint.x);
            line.setAttribute('y1', startPoint.y);
            line.setAttribute('x2', endPoint.x);
            line.setAttribute('y2', endPoint.y);
            line.classList.add('link');

            if (l.direction === 'target') {
                line.setAttribute('marker-end', 'url(#arrowhead)');
            } else if (l.direction === 'source') {
                // 注意：当箭头反向时，线条的起点（marker-start）是 endPoint
                line.setAttribute('marker-start', 'url(#arrowhead)');
            }
            
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

function parseMarkdown(text) {
    let escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const lines = escapedText.split('\n');
    const htmlLines = lines.map(line => {
        let processedLine = line;

        processedLine = processedLine.replace(
            /^\[([ xX])\] (.*)/,
            (match, checked, content) => {
                const isChecked = checked.toLowerCase() === 'x';
                // ✨ 关键改动：添加一个 .todo-checkbox-wrapper 作为点击目标
                return `<span class="todo-item ${isChecked ? 'checked' : ''}" data-checked="${isChecked}">
                          <span class="todo-checkbox-wrapper">
                            <input type="checkbox" ${isChecked ? 'checked' : ''} disabled>
                          </span>
                          <label>${content}</label>
                        </span>`;
            }
        );

        if (!processedLine.includes('class="todo-item"')) {
            processedLine = processedLine.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
            processedLine = processedLine.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)|_(.*?)_/g, '<em>$1$2</em>');
        }
        
        return processedLine;
    });

    return htmlLines.join('<br>');
}

function renderNode(el, node) {
    el.setAttribute('role', 'button');
    el.style.transform = `translate(${node.x}px, ${node.y}px)`;
    
    // 如果当前节点正在编辑，跳过内容更新，只更新状态
    if (el.classList.contains('editing') || el === document.activeElement) {
        const isSelected = state.selection.has(node.id);
        const isEditing = '';
        const classes = ['node', node.color || 'c-white', isEditing ? 'editing' : '', isSelected ? 'selected' : ''].filter(Boolean);
        el.className = classes.join(' ');
        return;
    }

    // --- 新的渲染逻辑 ---

    const isLink = isUrl(node.text);
    const hasMarkdown = /^\s*- \[.\]|\*\*|__|(?<!\*)\*(?!\*)/.test(node.text);

    // 根据内容决定是否左对齐和允许多行
    // if (node.text.includes('\n') || hasMarkdown) {
    //     el.classList.add('has-multiline');
    // } else {
    //     el.classList.remove('has-multiline');
    // }

    if (isLink) {
        // --- 链接节点的渲染逻辑 (保持不变) ---
        el.classList.add('is-link');
        el.classList.remove('has-multiline'); // 链接强制单行

        let textEl = el.querySelector('.node-text');
        if (!textEl) {
            el.innerHTML = '';
            textEl = document.createElement('div');
            textEl.className = 'node-text';
            el.appendChild(textEl);
        }
        if (textEl.innerText !== node.text) textEl.innerText = node.text;

        let btnEl = el.querySelector('.link-btn');
        if (!btnEl) {
            btnEl = document.createElement('div');
            btnEl.className = 'link-btn';
            btnEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
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
        // --- 普通文本/Markdown 节点的渲染逻辑 ---
        el.classList.remove('is-link');
        
        // ✨ 关键改动：使用 innerHTML 和 parseMarkdown
        const newHtml = parseMarkdown(node.text);
        if (el.innerHTML !== newHtml) {
            el.innerHTML = newHtml;
        }
    }

    // --- 通用样式处理 (保持不变) ---
    const isSelected = state.selection.has(node.id);
    const classes = ['node'];
    if (isLink) classes.push('is-link');
    classes.push(node.color || 'c-white');
    if (isSelected) classes.push('selected');
    // if (el.classList.contains('has-multiline')) classes.push('has-multiline');
    el.className = classes.join(' ');

    if (!node.w || !node.h || el.offsetWidth !== node.w) {
        node.w = el.offsetWidth; node.h = el.offsetHeight;
    }
}

els.nodesLayer.addEventListener('click', e => {
    // ✨ 核心修改：寻找 .todo-checkbox-wrapper
    const checkboxWrapper = e.target.closest('.todo-checkbox-wrapper');
    if (!checkboxWrapper) {
        return; // 如果点击的不是 wrapper 或其内部，直接退出
    }

    e.stopPropagation(); // 阻止冒泡，这仍然非常重要

    const nodeEl = checkboxWrapper.closest('.node');
    if (!nodeEl) return;

    const nodeId = nodeEl.dataset.id;
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // ✨ 核心修改：通过 wrapper 找到它的父级 todo-item 来确定索引
    const todoItem = checkboxWrapper.closest('.todo-item');
    const allTodosInNode = Array.from(nodeEl.querySelectorAll('.todo-item'));
    const clickedIndex = allTodosInNode.indexOf(todoItem);

    if (clickedIndex === -1) return;

    pushHistory();

    const lines = node.text.split('\n');
    let todoCounter = -1;
    const newLines = lines.map(line => {
        if (/^\[([ xX])\]/.test(line.trim())) {
            todoCounter++;
            if (todoCounter === clickedIndex) {
                return line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace(/\[[xX]\]/, '[ ]');
            }
        }
        return line;
    });
    
    node.text = newLines.join('\n');
    render();
});


function renderGroup(el, group) {
    el.style.transform = `translate(${group.x}px, ${group.y}px)`;
    el.style.width = `${group.w}px`; el.style.height = `${group.h}px`;
    el.className = `group ${state.selection.has(group.id) ? 'selected' : ''}`;
}
function getNodeCenter(n) { return { x: n.x + (n.w || 0) / 2, y: n.y + (n.h || 0) / 2 }; }

function getEdgeIntersection(sourceNode, targetNode) {
    const sx = sourceNode.x + sourceNode.w / 2;
    const sy = sourceNode.y + sourceNode.h / 2;
    const tx = targetNode.x + targetNode.w / 2;
    const ty = targetNode.y + targetNode.h / 2;
    
    const dx = tx - sx;
    const dy = ty - sy;
    
    const w = targetNode.w / 2;
    const h = targetNode.h / 2;
    
    // 这是一个非常高效的近似算法，避免了复杂的三角函数
    const slopeY = Math.abs(dy / dx);
    const slopeX = Math.abs(dx / dy);
    
    let endX, endY;

    if (slopeY < h / w) {
        // 交点在左右两侧
        if (dx > 0) {
            endX = tx - w;
            endY = ty - slopeY * w;
        } else {
            endX = tx + w;
            endY = ty + slopeY * w;
        }
    } else {
        // 交点在上下两侧
        if (dy > 0) {
            endY = ty - h;
            endX = tx - slopeX * h;
        } else {
            endY = ty + h;
            endX = tx + slopeX * h;
        }
    }
    
    return { x: endX, y: endY };
}
// --- 节日 Logo 逻辑 ---
function updateSeasonalLogo() {
    const now = new Date();
    const month = now.getMonth() + 1; // 0-11 改为 1-12
    const date = now.getDate();
    const logoBox = document.getElementById('ui-logo-box');

    let emoji = "✨"; // 默认：星星

    // 1. 2026 春节
    if ((month === 2 && date >= 16) || (month === 2 && date <= 23)) {
        emoji = "🧧";
    }
    // 2. 情人节 (2月14)
    else if (month === 2 && date === 14) {
        emoji = "💖";
    }
    // 3. 万圣节 (10月25 - 10月31)
    else if (month === 10 && date >= 25) {
        emoji = "🎃";
    }
    // 4. 圣诞节 (12月20 - 12月26)
    else if (month === 12 && date >= 20 && date <= 31) {
        emoji = "🎄";
    }
    // 5. 元旦 (12月31 - 1月1)
    else if ((month === 1 && date <= 3)) {
        emoji = "🎉";
    }
    logoBox.innerText = emoji;
}

updateSeasonalLogo();
// --- Interactions ---
document.getElementById('btn-add').onclick = createNodesFromInput;

// --- 新增：拖拽导入功能 ---

// 阻止浏览器默认打开文件的行为
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    els.container.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

// 拖拽进入/经过时显示视觉提示
els.container.addEventListener('dragover', () => {
    els.container.classList.add('drag-over');
});

// 拖拽离开或结束时隐藏提示
['dragleave', 'drop'].forEach(eventName => {
    els.container.addEventListener(eventName, () => {
        els.container.classList.remove('drag-over');
    });
});

// 处理放下文件
els.container.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    processDangoFile(file);
});

els.input.addEventListener('keydown', (e) => {
    // 识别 Ctrl + Enter (Windows) 或 Cmd + Enter (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault(); // 阻止输入框换行
        createNodesFromInput();
    }
});
function unpackData(packed) {
    const [version, pNodes, pGroups, pLinks, pSettings] = packed;
    
    // 由于 pack 时用了数字索引，解包时我们需要重新生成符合当前逻辑的 ID
    const shortToLongId = {};
    const genNewId = (shortId) => {
        const newId = uid();
        shortToLongId[shortId] = newId;
        return newId;
    };

    // 1. 恢复节点
    const nodes = pNodes.map(n => ({
        id: genNewId(n[0]),
        text: n[1],
        x: n[2], y: n[3], w: n[4], h: n[5],
        color: CONFIG.colors[n[6]] || 'c-white'
    }));

    // 2. 恢复组 (先占位 ID，后续映射成员)
    const groups = pGroups.map(g => ({
        id: genNewId(g[0]),
        x: g[1], y: g[2], w: g[3], h: g[4],
        _tempMemberIds: g[5] // 临时存储短 ID
    }));

    // 3. 映射组内成员 ID
    groups.forEach(g => {
        g.memberIds = g._tempMemberIds.map(sid => shortToLongId[sid]).filter(id => id);
        delete g._tempMemberIds;
    });

    // 4. 恢复连线
    const links = pLinks.map(l => ({
        id: uid(),
        sourceId: shortToLongId[l[0]],
        targetId: shortToLongId[l[1]]
    })).filter(l => l.sourceId && l.targetId);

    // 5. 恢复设置
    const settings = pSettings ? {
        preciseLayout: pSettings[0] === 1,
        hideGrid: pSettings[1] === 1,
        handDrawn: pSettings[2] === 1,
        copyMode: pSettings[3] === 1
    } : state.settings;

    return { nodes, groups, links, settings };
}

// 数据封包：将冗长的 state 转换为极致精简的数组结构
function packData() {
    // 1. 建立 ID 映射表，将长 ID 映射为短数字
    const idMap = {};
    let idCounter = 0;
    const allIds = [
        ...state.nodes.map(n => n.id),
        ...state.groups.map(g => g.id)
    ];
    allIds.forEach(id => idMap[id] = idCounter++);

    // 2. 压缩节点: [id, text, x, y, w, h, colorIdx]
    const pNodes = state.nodes.map(n => [
        idMap[n.id],
        n.text,
        Math.round(n.x),
        Math.round(n.y),
        Math.round(n.w),
        Math.round(n.h),
        CONFIG.colors.indexOf(n.color || 'c-white')
    ]);

    // 3. 压缩组: [id, x, y, w, h, [memberIds]]
    const pGroups = state.groups.map(g => [
        idMap[g.id],
        Math.round(g.x),
        Math.round(g.y),
        Math.round(g.w),
        Math.round(g.h),
        g.memberIds.map(mid => idMap[mid])
    ]);

    // 4. 压缩连线: [sourceId, targetId]
    const pLinks = state.links.map(l => [
        idMap[l.sourceId],
        idMap[l.targetId]
    ]);

    // 5. 压缩设置: 仅存储关键开关位 (使用 Bitmask 或小数组)
    const pSettings = [
        state.settings.preciseLayout ? 1 : 0,
        state.settings.hideGrid ? 1 : 0,
        state.settings.handDrawn ? 1 : 0,
        state.settings.copyMode ? 1 : 0
    ];

    // 返回最终嵌套数组：[版本号, 节点, 组, 连线, 设置]
    return [1, pNodes, pGroups, pLinks, pSettings];
}

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
    if (e.target.closest('.todo-checkbox-wrapper')) {
        return;
    }
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

window.addEventListener('mousemove', (e) => {
    // 实时更新全局 CSS 变量
    document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
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

// --- 移动端触屏支持 (Touch Events) ---

// 辅助：获取触摸点的坐标（兼容多指，取第一指）
function getTouchPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: 0, y: 0 };
}

let lastTapTime = 0;
let lastTapTarget = null;
let initialPinchDist = 0;
let initialPinchScale = 1;
let pinchCenter = { x: 0, y: 0 }; // 缩放中心点

// 辅助：计算两指距离
function getPinchDist(e) {
    return Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
    );
}

// 辅助：计算两指中心点
function getPinchCenter(e) {
    return {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
    };
}

// 1. 面板触摸逻辑 (保持不变)
els.uiLayer.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    els.uiLayer.classList.add('mobile-active');
}, { passive: true });


// 2. 画布层触摸逻辑 (核心修改)
els.container.addEventListener('touchstart', e => {
    // 修复问题 1：点击画布，强制关闭 UI 面板，并让输入框失焦
    els.uiLayer.classList.remove('mobile-active');
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }

    // --- 双指缩放 (Pinch) 检测 ---
    if (e.touches.length === 2) {
        e.preventDefault(); // 阻止浏览器默认缩放
        mode = 'pinch';
        initialPinchDist = getPinchDist(e);
        initialPinchScale = state.view.scale;
        // 记录缩放中心，用于优化缩放体验（可选，简易版可省略）
        const center = getPinchCenter(e);
        pinchCenter = screenToWorld(center.x, center.y); 
        return;
    }

    // 阻止默认行为（防止滚动、原生缩放等），除非点的是UI元素
    if (e.target.tagName === 'TEXTAREA' || e.target.closest('.header-btn')) return;
    
    // 如果不在编辑状态，阻止默认行为以保证拖拽流畅
    if (!e.target.isContentEditable) {
        e.preventDefault();
    }

    // --- 模拟双击 (Double Tap) 检测 ---
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    const nodeEl = e.target.closest('.node');
    
    // 如果两次点击间隔 < 300ms 且目标相同，视为双击
    if (tapLength < 300 && tapLength > 0 && nodeEl && lastTapTarget === nodeEl) {
        handleNodeEdit(nodeEl); // 修复问题 3：调用双击编辑
        lastTapTarget = null;
        lastTapTime = 0;
        return;
    }
    lastTapTarget = nodeEl;
    lastTapTime = currentTime;

    // --- 单指操作逻辑 ---
    const pos = getTouchPos(e);
    const groupEl = e.target.closest('.group');
    
    if (nodeEl || groupEl) {
        const id = (nodeEl || groupEl).dataset.id;
        
        // 如果没选中，选中它；如果已选中，保持选中状态以便拖拽
        if (!state.selection.has(id)) {
            state.selection.clear();
            state.selection.add(id);
            render();
        }

        mode = 'move';
        hasMovedDuringDrag = false;
        // 记录状态用于撤销
        stateBeforeDrag = JSON.stringify({ 
            nodes: state.nodes, 
            groups: state.groups, 
            links: state.links, 
            selection: Array.from(state.selection) 
        });
        
        const worldPos = screenToWorld(pos.x, pos.y);
        dragStart = { x: worldPos.x, y: worldPos.y, initialPos: getSelectionPositions() };

    } else {
        // 修复问题 4：点击空白处，取消选中
        state.selection.clear();
        render();

        mode = 'pan';
        dragStart = { x: pos.x, y: pos.y, viewX: state.view.x, viewY: state.view.y };
    }
}, { passive: false });


els.container.addEventListener('touchmove', e => {
    if (!mode) return;
    e.preventDefault();

    // --- 修复问题 2：双指缩放执行 ---
    if (mode === 'pinch' && e.touches.length === 2) {
        const currentDist = getPinchDist(e);
        if (currentDist > 0) {
            // 计算新的缩放比例
            const scaleFactor = currentDist / initialPinchDist;
            let newScale = initialPinchScale * scaleFactor;
            
            // 限制缩放范围
            newScale = Math.max(0.1, Math.min(5, newScale));
            
            // 应用缩放
            state.view.scale = newScale;
            
            // (高级) 围绕中心点缩放：目前简单处理，后续可优化 update view x/y
            // 简单版只改 scale，效果类似中心缩放但会偏移，对于移动端通常可接受
            
            render();
        }
        return;
    }

    // --- 单指移动逻辑 ---
    const pos = getTouchPos(e);

    if (mode === 'pan') {
        state.view.x = dragStart.viewX + (pos.x - dragStart.x);
        state.view.y = dragStart.viewY + (pos.y - dragStart.y);
        if (viewAnimationId) { cancelAnimationFrame(viewAnimationId); viewAnimationId = null; }
        render();
    } else if (mode === 'move') {
        const worldPos = screenToWorld(pos.x, pos.y);
        const dx = worldPos.x - dragStart.x;
        const dy = worldPos.y - dragStart.y;
        
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedDuringDrag = true;

        state.selection.forEach(id => {
            const init = dragStart.initialPos[id];
            if (init) {
                const item = findItem(id);
                if (item) {
                    item.x = init.x + dx; 
                    item.y = init.y + dy;
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
    }
}, { passive: false });


els.container.addEventListener('touchend', e => {
    // 处理移动后的撤销历史记录
    if (mode === 'move' && stateBeforeDrag) {
        const currentState = JSON.stringify({ 
            nodes: state.nodes, 
            groups: state.groups, 
            links: state.links, 
            selection: Array.from(state.selection) 
        });
        if (currentState !== stateBeforeDrag) {
            history.undo.push(stateBeforeDrag);
            if (history.undo.length > MAX_HISTORY) history.undo.shift();
            history.redo = [];
        }
    }
    
    // 重置所有状态
    stateBeforeDrag = null;
    mode = null;
    dragStart = null;
    initialPinchDist = 0;
});

// --- 提取出来的通用编辑函数 ---
function handleNodeEdit(nodeEl) {
    if (!nodeEl) return;
    const node = state.nodes.find(n => n.id === nodeEl.dataset.id);
    if (node) {
        if (mode === 'move' || hasMovedDuringDrag) return;

        pushHistory();

        // ✨ 关键改动：无论是链接还是 Markdown，都用原始文本替换渲染后的 HTML
        nodeEl.innerText = node.text;
        
        // 移除所有特殊样式类，回到最基础的编辑状态
        nodeEl.classList.remove('is-link', 'has-multiline');
        
        nodeEl.contentEditable = true;
        nodeEl.classList.add('editing');
        nodeEl.focus();

        const range = document.createRange();
        range.selectNodeContents(nodeEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishEdit = () => {
            nodeEl.contentEditable = false;
            nodeEl.classList.remove('editing');
            
            // ✨ 核心修复：手动清除浏览器中的文本高亮选区
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
            }

            // 从 innerText 获取最新的原始文本
            const newText = nodeEl.innerText;
            
            // 只有当文字真的变了，才更新数据并渲染
            if (node.text !== newText) {
                node.text = newText;
            }
            render(); 
        };

        nodeEl.onblur = () => {
            nodeEl.onblur = null;
            finishEdit();
        };
        
        nodeEl.onkeydown = (ev) => {
            // ✨ 允许在编辑时使用 Shift+Enter 换行
            if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                nodeEl.blur(); // 触发 onblur 来结束编辑
            }
            ev.stopPropagation();
        };
    }
}

// 鼠标双击监听保持不变，只需调用上面的函数
els.container.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('.node');
    handleNodeEdit(nodeEl);
});

window.addEventListener('keydown', e => {
    // 如果正在输入，跳过
    const isEditing = e.target.isContentEditable || e.target.tagName === 'TEXTAREA';
    
    // 1. 如果正在编辑，ESC 退出编辑而不取消选中，Enter 结束编辑
    if (isEditing) {
        if (e.code === 'Escape') {
            e.target.blur(); // 触发 blur 会保存并退出
            e.stopPropagation(); // 阻止 ESC 进一步影响 UI
            return;
        }
        if (e.code === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.target.blur();
            return;
        }
        return; // 编辑状态下不触发其他快捷键
    }

    keys[e.code] = true;

    // 2. 画布缩放拦截 (Ctrl + +/-/0)
    if (isModifier(e)) {
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            changeZoom(1.2); 
            return;
        }
        if (e.key === '-') {
            e.preventDefault();
            changeZoom(0.8);
            return;
        }
        if (e.key === '0') {
            e.preventDefault();
            resetViewToCenter(true);
            return;
        }
    }

    // 3. 回车编辑选中的节点
    if (e.code === 'Enter' && state.selection.size === 1) {
        e.preventDefault();
        const selectedId = Array.from(state.selection)[0];
        const nodeEl = document.querySelector(`.node[data-id="${selectedId}"]`);
        if (nodeEl) handleNodeEdit(nodeEl);
        return;
    }
    
    // 4. 优化 ESC 逻辑
    if (e.code === 'Escape') {
        // 关闭关于面板
        if (aboutOverlay.classList.contains('show')) {
            closeAbout();
            return;
        }
        // 关闭设置或帮助
        const isSettingsOpen = modalSettings.classList.contains('show');
        const isHelpOpen = els.helpModal.classList.contains('show');
        if (isSettingsOpen || isHelpOpen) {
            modalSettings.classList.remove('show');
            btnSettings.classList.remove('active');
            els.helpModal.classList.remove('show');
            els.btnHelp.classList.remove('active');
            els.uiLayer.classList.remove('is-active'); // 移除强制展开类
            return;
        }
        // 最后才是清除选中
        if (state.selection.size > 0) {
            state.selection.clear();
            render();
        }
    }

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

    if (e.code === 'KeyQ') {
        document.body.classList.add('spotlight-active');
    }
});

window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Space') document.body.classList.remove('mode-space');
    if (e.code === 'KeyQ') {
        document.body.classList.remove('spotlight-active');
    }
});

// Helpers
function changeZoom(factor) {
    // 默认以窗口中心缩放
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const worldPos = screenToWorld(centerX, centerY);

    const oldScale = state.view.scale;
    state.view.scale = Math.max(0.1, Math.min(5, oldScale * factor));
    
    // 补偿位移，实现以中心缩放
    state.view.x = centerX - worldPos.x * state.view.scale;
    state.view.y = centerY - worldPos.y * state.view.scale;
    
    render();
}

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
    
    // 为了逻辑稳定，我们不依赖选择顺序，而是固定一个为 source，一个为 target
    const [n1, n2] = nodes;

    const existingLinkIndex = state.links.findIndex(l => 
        (l.sourceId === n1.id && l.targetId === n2.id) || 
        (l.sourceId === n2.id && l.targetId === n1.id)
    );

    if (existingLinkIndex !== -1) {
        // --- 链接已存在，进入状态循环 ---
        const link = state.links[existingLinkIndex];
        
        // 确保 sourceId 和 targetId 与我们当前获取的 n1, n2 一致，方便判断
        const isReversed = link.sourceId === n2.id;

        switch (link.direction) {
            case 'none':
                // 状态 1 -> 2: 无方向 -> 指向 n2
                link.direction = isReversed ? 'source' : 'target';
                break;
            
            case 'target':
                // 状态 2 -> 3: 指向 target -> 指向 source (或反向)
                link.direction = isReversed ? 'none' : 'source'; // 这里逻辑稍微复杂
                if(isReversed) link.direction = 'none'; // 如果反了，直接回到 none
                else link.direction = 'source';
                break;
            
            case 'source':
                // 状态 3 -> 4: 指向 source -> 删除
                state.links.splice(existingLinkIndex, 1);
                break;

            default: // 兼容旧数据
                 link.direction = 'target';
                 break;
        }

    } else {
        // --- 链接不存在，创建它 (状态 0 -> 1) ---
        state.links.push({ 
            id: uid(), 
            sourceId: n1.id, 
            targetId: n2.id,
            direction: 'none' // 初始状态：无方向
        });
    }
    
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
    a.href = url; a.download = `dango-canvas_${getTimestamp()}.dango`;  a.click(); URL.revokeObjectURL(url);
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

// --- 新增：通用文件处理逻辑 ---
function processDangoFile(file) {
    if (!file) return;
    
    // 检查文件后缀（非强制，但更安全）
    if (!file.name.endsWith('.dango') && !file.name.endsWith('.json')) {
        showToast(TRANSLATIONS[currentLang].alert_file_err);
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            
            // 备份当前数据以供撤销
            let oldSnapshot = null;
            if (state.nodes.length > 0) {
                oldSnapshot = { nodes: [...state.nodes], groups: [...state.groups], links: [...state.links] };
            }
            
            pushHistory();
            
            // 加载新数据
            state.nodes = data.nodes || [];
            state.groups = data.groups || [];
            state.links = data.links || [];
            state.selection.clear();
            
            render();
            // 🍞 成功提示
            showToast(TRANSLATIONS[currentLang].toast_import_success, oldSnapshot);
        }
        catch (err) {
            console.error(err);
            showToast(TRANSLATIONS[currentLang].alert_file_err);
        }
    };
    reader.readAsText(file);
}

// document.getElementById('btn-export').onclick = exportJson;
document.getElementById('file-input').onchange = (e) => {
    processDangoFile(e.target.files[0]);
    e.target.value = ''; // 清空 input 方便重复导入同一文件
};


document.getElementById('btn-import-main').onclick = () => {
    document.getElementById('file-input').click();
};


// 辅助函数：生成 SVG 字符串 (提取自之前的逻辑)
function getSvgString() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const elements = [...state.nodes, ...state.groups];
    if (elements.length === 0) return null;

    elements.forEach(el => {
        minX = Math.min(minX, el.x); minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.w || 100)); maxY = Math.max(maxY, el.y + (el.h || 40));
    });

    const padding = 80;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    const bodyStyle = getComputedStyle(document.body);
    const bgColor = bodyStyle.backgroundColor;
    const dotColor = bodyStyle.getPropertyValue('--dot-color').trim() || '#cbd5e1';
    const groupBorderColor = bodyStyle.getPropertyValue('--group-border').trim();
    const groupBgColor = bodyStyle.getPropertyValue('--group-bg').trim();
    const linkColor = bodyStyle.getPropertyValue('--link-color').trim();
    const isHandDrawn = state.settings.handDrawn;
    const fontFamily = isHandDrawn ? "'Architects Daughter', 'LXGW WenKai Mono TC', cursive" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const nodePaddingX = 20;

    let defsContent = `<style>@import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&amp;family=LXGW+WenKai+Mono+TC&amp;display=swap'); .node-text { font-family: ${fontFamily}; font-size: 14px; font-weight: 500; }</style><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="${dotColor}" /></pattern>`;
    state.nodes.forEach(n => {
        defsContent += `<clipPath id="clip-${n.id}"><rect x="${n.x + offsetX + nodePaddingX}" y="${n.y + offsetY}" width="${n.w - nodePaddingX * 2}" height="${n.h}" /></clipPath>`;
    });

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defsContent}</defs><rect width="100%" height="100%" fill="${bgColor}"/>`;
    if (!state.settings.hideGrid) svgContent += `<rect width="100%" height="100%" fill="url(#grid)"/>`;

    state.groups.forEach(g => {
        svgContent += `<rect x="${g.x + offsetX}" y="${g.y + offsetY}" width="${g.w}" height="${g.h}" rx="20" ry="20" fill="${groupBgColor}" stroke="${groupBorderColor}" stroke-width="2" stroke-dasharray="5,5" />`;
    });

    state.links.forEach(l => {
        const n1 = state.nodes.find(n => n.id === l.sourceId), n2 = state.nodes.find(n => n.id === l.targetId);
        if (n1 && n2) {
            const c1 = { x: n1.x + (n1.w || 0) / 2 + offsetX, y: n1.y + (n1.h || 0) / 2 + offsetY }, c2 = { x: n2.x + (n2.w || 0) / 2 + offsetX, y: n2.y + (n2.h || 0) / 2 + offsetY };
            svgContent += `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="${linkColor}" stroke-width="2" opacity="0.5" />`;
        }
    });

    state.nodes.forEach(n => {
        const el = document.querySelector(`.node[data-id="${n.id}"]`);
        if (!el) return;
        const style = getComputedStyle(el), nodeBg = style.backgroundColor, nodeStroke = style.borderColor, nodeTextColor = style.color, isLink = isUrl(n.text), rx = isHandDrawn ? 18 : 12;
        let textX = isLink ? n.x + offsetX + nodePaddingX : n.x + n.w / 2 + offsetX;
        let textAnchor = isLink ? "start" : "middle";

        let nodeMarkup = `<rect x="${n.x + offsetX}" y="${n.y + offsetY}" width="${n.w}" height="${n.h}" rx="${rx}" ry="${rx}" fill="${nodeBg}" stroke="${nodeStroke}" stroke-width="${isLink ? 1.5 : 1}" /><text x="${textX}" y="${n.y + n.h / 2 + offsetY}" class="node-text" clip-path="url(#clip-${n.id})" dominant-baseline="central" text-anchor="${textAnchor}" fill="${nodeTextColor}">${escapeHtml(n.text)}</text>`;
        
        if (isLink) {
            let fullUrl = n.text.trim(); if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl;
            const lineY = n.y + n.h / 2 + offsetY + 8, lineX1 = n.x + offsetX + nodePaddingX, lineX2 = n.x + offsetX + n.w - nodePaddingX;
            nodeMarkup = `<a xlink:href="${escapeHtml(fullUrl)}" target="_blank"><g>${nodeMarkup}<line x1="${lineX1}" y1="${lineY}" x2="${lineX2}" y2="${lineY}" stroke="${nodeTextColor}" stroke-width="1" opacity="0.4" /></g></a>`;
        }
        svgContent += nodeMarkup;
    });

    return { html: svgContent + `</svg>`, width, height };
}

// 核心功能：统一导出图片函数
async function downloadImage() {
    const svgData = getSvgString();
    if (!svgData) return;

    // 1. 创建 Canvas
    const canvas = document.createElement('canvas');
    const scale = 3; // 强制 3x 高清
    canvas.width = svgData.width * scale;
    canvas.height = svgData.height * scale;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    const svgBlob = new Blob([svgData.html], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = async () => {
        // 绘制高清图
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        if (state.settings.copyMode) {
            // 模式 A: 复制到剪贴板
            canvas.toBlob(async (blob) => {
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    showToast(TRANSLATIONS[currentLang].toast_copy_success);
                } catch (err) {
                    console.error(err);
                    showToast(TRANSLATIONS[currentLang].toast_copy_fail);
                }
                URL.revokeObjectURL(url);
            }, 'image/png');
        } else {
            // 模式 B: 下载文件
            canvas.toBlob((blob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `dango_${getTimestamp()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        }
    };
    img.src = url;
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

document.getElementById('opt-png').onclick = (e) => {
    e.stopPropagation();
    downloadImage(); // 默认 PNG
    resetActionStack();
};

// document.getElementById('opt-svg').onclick = (e) => {
//     e.stopPropagation();
//     downloadImage('svg'); // 选中的 SVG
//     resetActionStack();
// };

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
    const packed = packData();
    // 现在压缩的是极致精简的数组，JSON 字符串长度会缩减 60%-80%
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
    
    const baseUrl = window.location.href.split('#')[0];
    const url = baseUrl + '#' + compressed;

    navigator.clipboard.writeText(url).then(() => {
        showToast(currentLang === 'zh' ? "链接已复制到剪贴板 ✨" : "Link copied to clipboard ✨");
    });
}

state.settings.handDrawn = localStorage.getItem('cc-hand-drawn') === 'true';

let fontsLoaded = false;

// 2. 动态加载字体函数
function loadHandDrawnFonts() {
    if (fontsLoaded || document.getElementById('hand-drawn-fonts')) return;

    const link = document.createElement('link');
    link.id = 'hand-drawn-fonts'; // 增加 ID 防止重复插入
    link.rel = 'stylesheet';
    // 💡 优化：在 URL 后面增加 &display=block 减少闪烁（虽然 swap 也不错，但 block 在打字时更稳定）
    link.href = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=LXGW+WenKai+Mono+TC&display=block';

    document.head.appendChild(link);
    fontsLoaded = true;
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
        
        const dataRaw = JSON.parse(decompressed);
        // 判断是否是新版数组封包结构
        const data = Array.isArray(dataRaw) ? unpackData(dataRaw) : dataRaw;

        // ... 后续加载逻辑不变 (pushHistory, render, showToast) ...
        // 💾 捕捉旧数据快照
        let oldSnapshot = null;
        if (state.nodes.length > 0) {
            oldSnapshot = { nodes: [...state.nodes], groups: [...state.groups], links: [...state.links] };
            pushHistory();
        }

        state.nodes = data.nodes;
        state.groups = data.groups;
        state.links = data.links;
        if (data.settings) state.settings = { ...state.settings, ...data.settings };

        render();
        applySettings();
        applyHandDrawnStyle();

        showToast(TRANSLATIONS[currentLang].toast_imported, oldSnapshot);
        window.history.replaceState(null, null, window.location.pathname);
        return true;
    } catch (e) {
        console.error("Import failed:", e);
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
            downloadBlob(data, `safety-backup_${getTimestamp()}.dango`, 'application/json');
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