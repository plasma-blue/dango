import { 
    uid, isUrl, screenToWorld, getNodeCenter, getEdgeIntersection, 
    getStandardRect, isIntersect, getTimestamp, escapeHtml, downloadBlob 
} from './modules/utils.js';
import { initI18n, toggleLang, getCurrentLang, getTexts, updateI18n } from './modules/i18n.js';
import { initUI, showToast, applySettings } from './modules/ui.js';
import {
    state, CONFIG, history,
    pushHistory, undo as undoState, redo as redoState,
    loadData, saveData, unpackData, packData, MAX_HISTORY
} from './modules/state.js';
import { initRender, render } from './modules/render.js';

function undo() {
    undoState(render);
}

function redo() {
    redoState(render);
}

// 按 ESC 关闭所有弹窗
window.addEventListener('keydown', e => {
    // ... 原有代码 ...
    if (e.code === 'Escape') {
        if (state.selection.size > 0) {
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





document.getElementById('btn-lang').onclick = (e) => {
    toggleLang();
    updateI18n();
    e.currentTarget.blur();
};


function isModifier(e) {
    // 如果开启了选项，Alt 也可以作为辅助键
    return e.ctrlKey || e.metaKey || (state.settings.altAsCtrl && e.altKey);
}


// --- 节点多路动画系统 ---
let nodeAnimationId = null;

function animateNodesTo(targets, duration = 300) {
    if (nodeAnimationId) cancelAnimationFrame(nodeAnimationId);
    
    const startTime = performance.now();
    const startPositions = new Map();
    
    targets.forEach(({ id }) => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            startPositions.set(id, { x: node.x, y: node.y });
        }
    });

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // OutCubic 效果更轻盈

        targets.forEach(({ id, x, y }) => {
            const node = state.nodes.find(n => n.id === id);
            const start = startPositions.get(id);
            if (node && start) {
                node.x = start.x + (x - start.x) * ease;
                node.y = start.y + (y - start.y) * ease;
            }
        });

        render();

        if (progress < 1) {
            nodeAnimationId = requestAnimationFrame(step);
        } else {
            nodeAnimationId = null;
            saveData();
        }
    }
    nodeAnimationId = requestAnimationFrame(step);
}

function smartAlignSelection() {
    const selectedNodes = state.nodes.filter(n => state.selection.has(n.id));
    if (selectedNodes.length < 2) return;

    pushHistory();

    const rowThreshold = 60; // 这里的高度差认为是同一行
    const standardGapX = 40; // 节点间的标准间距
    const standardGapY = 40; 

    // 1. 识别行：按 Y 坐标排序并聚类
    const sortedByY = [...selectedNodes].sort((a, b) => a.y - b.y);
    const rows = [];
    if (sortedByY.length > 0) {
        let currentRow = [sortedByY[0]];
        for (let i = 1; i < sortedByY.length; i++) {
            if (sortedByY[i].y - sortedByY[i - 1].y < rowThreshold) {
                currentRow.push(sortedByY[i]);
            } else {
                rows.push(currentRow);
                currentRow = [sortedByY[i]];
            }
        }
        rows.push(currentRow);
    }

    // 2. 计算每一行的目标位置
    const targets = [];
    let currentY = rows[0][0].y; // 以后续计算的平均值修正

    // 计算整体重心，用于最后偏移校正
    const originalCenter = {
        x: selectedNodes.reduce((sum, n) => sum + n.x + n.w/2, 0) / selectedNodes.length,
        y: selectedNodes.reduce((sum, n) => sum + n.y + n.h/2, 0) / selectedNodes.length
    };

    rows.forEach((row) => {
        // 行内居中对齐：计算该行所有节点的平均 Y
        const avgY = row.reduce((sum, n) => sum + n.y, 0) / row.length;
        
        // 行内按 X 排序
        const sortedInRow = row.sort((a, b) => a.x - b.x);
        
        // 计算行内总宽度，用于分配位置
        let currentX = sortedInRow[0].x; 
        
        sortedInRow.forEach((node, index) => {
            targets.push({
                id: node.id,
                x: currentX,
                y: avgY
            });
            // 累加：当前节点宽度 + 间距
            currentX += (node.w || 80) + standardGapX;
        });
    });

    // 3. 整体修正：保持重心不变，避免对齐后“飞走”
    const targetCenter = {
        x: targets.reduce((sum, n) => sum + n.x + (selectedNodes.find(sn=>sn.id===n.id).w||80)/2, 0) / targets.length,
        y: targets.reduce((sum, n) => sum + n.y + (selectedNodes.find(sn=>sn.id===n.id).h||40)/2, 0) / targets.length
    };
    
    const offsetX = originalCenter.x - targetCenter.x;
    const offsetY = originalCenter.y - targetCenter.y;

    targets.forEach(t => {
        t.x += offsetX;
        t.y += offsetY;
    });

    // 4. 执行动画
    animateNodesTo(targets);
}

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


els.helpModal.onclick = (e) => {
    e.stopPropagation();
};

// Close Help when closing UI or clicking outside
els.uiLayer.addEventListener('mouseleave', () => {
    els.helpModal.classList.remove('show');
    els.btnHelp.classList.remove('active');
});
els.helpModal.onclick = (e) => e.stopPropagation();

let dragStart = null;
let mode = null;
const keys = {};

// Record state BEFORE manipulation starts
let stateBeforeDrag = null;
let isPrepareToClone = false;
let targetAlreadySelectedAtStart = false; // 记录点击前的选中状态

let targetIdAtMouseDown = null; 
let hasMovedDuringDrag = false;

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
        const worldPos = screenToWorld(e.clientX, e.clientY, state.view);

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
        const worldPos = screenToWorld(e.clientX, e.clientY, state.view);
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
        pinchCenter = screenToWorld(center.x, center.y, state.view); 
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
        
        const worldPos = screenToWorld(pos.x, pos.y, state.view);
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
        const worldPos = screenToWorld(pos.x, pos.y, state.view);
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
        if (e.key === '.') { // 对应 Alt + .
            e.preventDefault();
            smartAlignSelection();
            return;
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
    const worldPos = screenToWorld(centerX, centerY, state.view);

    const oldScale = state.view.scale;
    state.view.scale = Math.max(0.1, Math.min(5, oldScale * factor));
    
    // 补偿位移，实现以中心缩放
    state.view.x = centerX - worldPos.x * state.view.scale;
    state.view.y = centerY - worldPos.y * state.view.scale;
    
    render();
}

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

// --- Logic Actions ---

function clearCanvas() {
    // 💾 捕捉快照
    const snapshot = { nodes: [...state.nodes], groups: [...state.groups], links: [...state.links] };
    pushHistory();
    state.nodes = []; state.groups = []; state.links = []; state.selection.clear();
    render();
    // 🍞 弹出带“救命稻草”的 Toast
    showToast(getTexts().toast_cleared, snapshot);
}

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
        showToast(getTexts().alert_file_err);
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
            showToast(getTexts().toast_import_success, oldSnapshot);
        }
        catch (err) {
            console.error(err);
            showToast(getTexts().alert_file_err);
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
                    showToast(getTexts().toast_copy_success);
                } catch (err) {
                    console.error(err);
                    showToast(getTexts().toast_copy_fail);
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


function createShareLink() {
    const packed = packData();
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
    
    // 获取基础路径 (去除 hash)
    const baseUrl = window.location.origin + window.location.pathname;
    
    if (state.settings.copyAsEmbed) {
        // 生成嵌入代码模式
        const embedUrl = `${baseUrl}?embed=true#${compressed}`;
        const iframeCode = `<iframe src="${embedUrl}" style="width: 100%; height: 500px; border: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" allow="clipboard-write"></iframe>`;
        
        navigator.clipboard.writeText(iframeCode).then(() => {
            showToast(getTexts().toast_copy_embed_success);
        });
    } else {
        // 普通链接模式
        const url = baseUrl + '#' + compressed;
        navigator.clipboard.writeText(url).then(() => {
            showToast(getTexts().toast_copy_success);
        });
    }
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


function applyHandDrawnStyle() {
    if (state.settings.handDrawn) {
        loadHandDrawnFonts();
        document.body.classList.add('hand-drawn-style');
    } else {
        document.body.classList.remove('hand-drawn-style');
    }
}

// main.js
// main.js -> loadFromUrl()

function loadFromUrl() {
    const hash = window.location.hash.substring(1);
    if (!hash) return false;

    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(hash);
        if (!decompressed) return false;

        const dataRaw = JSON.parse(decompressed);
        const data = Array.isArray(dataRaw) ? unpackData(dataRaw) : dataRaw;

        // ✨ --- 核心修改 --- ✨

        // 1. 无论画布是否为空，都先创建快照。
        const oldSnapshot = {
            nodes: [...state.nodes],
            groups: [...state.groups],
            links: [...state.links],
            selection: Array.from(state.selection)
        };

        // 2. 将这个快照的字符串形式推入历史记录。
        //    这样 "撤销" 就能回到导入前的状态。
        pushHistory(JSON.stringify(oldSnapshot));

        // 3. 更新 state
        state.nodes = data.nodes || [];
        state.groups = data.groups || [];
        state.links = data.links || [];
        state.selection.clear(); // 导入新数据后，清空旧的选中状态
        if (data.settings) {
            Object.assign(state.settings, data.settings);
        }

        render();
        applyHandDrawnStyle();
        applySettings(state);

        if (!state.isEmbed) {
            showToast(getTexts().toast_imported, oldSnapshot);
            window.history.replaceState(null, null, window.location.pathname);
        }

        return true;
    } catch (e) {
        console.error("Import failed:", e);
        return false;
    }
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

function updateOpenFullLink() {
    if (!isEmbed) return;
    const btn = document.getElementById('btn-open-full');
    
    // 每次渲染或数据变化时，更新链接
    const packed = packData();
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
    
    // 指向不带 ?embed=true 的主地址
    const baseUrl = window.location.origin + window.location.pathname;
    btn.href = baseUrl + '#' + compressed;
}


initI18n();

// 在页面初始化（比如 window.onload 或 main.js 底部）调用
if (!loadFromUrl()) {
    loadData(); // 如果 URL 没数据，再尝试从本地存储加载
}

initRender(els, state, {
    saveData: saveData,
    updateOpenFullLink: updateOpenFullLink,
});

// ✨ 新的 UI 初始化 ✨
initUI(els, state, {
    undo: undo,
    clearCanvas: clearCanvas,
    exportJson: exportJson,
    downloadImage: downloadImage,
    createShareLink: createShareLink,
    applyHandDrawnStyle: applyHandDrawnStyle,
});

applyHandDrawnStyle();
applySettings(state); // 这个函数现在是从 ui.js 导入的
render();
updateI18n();