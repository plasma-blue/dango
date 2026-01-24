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
import { animateNodesTo, smartAlignSelection } from './modules/animation.js';
import { 
    createNodesFromInput as createNodesAction, // 使用别名以防命名冲突
    clearCanvas, copySelection, pasteClipboard, createGroup, dissolveGroup,
    toggleLink, deleteSelection, nudgeSelection, colorSelection,
    alignSelection, distributeSelection
} from './modules/actions.js';
import { initIO, exportJson, processDangoFile, downloadImage, createShareLink } from './modules/io.js';
import { initView, changeZoom, resetViewToCenter, cancelViewAnimation } from './modules/view.js';

function undo() {
    undoState(render);
}

function redo() {
    redoState(render);
}

function createNodesFromInput() {
    createNodesAction(els.input.value, els);
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


document.getElementById('btn-lang').onclick = (e) => {
    toggleLang();
    updateI18n();
    e.currentTarget.blur();
};


function isModifier(e) {
    // 如果开启了选项，Alt 也可以作为辅助键
    return e.ctrlKey || e.metaKey || (state.settings.altAsCtrl && e.altKey);
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
    cancelViewAnimation();
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
    cancelViewAnimation(); // 修复报错点
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || (state.settings.altAsCtrl && e.altKey)) {
        const factor = 1 + ((e.deltaY > 0 ? -1 : 1) * 0.1);
        changeZoom(factor, e.clientX, e.clientY); // 使用 view.js 的统一函数
    } else {
        state.view.x -= e.deltaX;
        state.view.y -= e.deltaY;
        render();
    }
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
    cancelViewAnimation();
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
        cancelViewAnimation();
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
    processDangoFile(e.target.files[0]);
    e.target.value = ''; // 清空 input 方便重复导入同一文件
};


document.getElementById('btn-import-main').onclick = () => {
    document.getElementById('file-input').click();
};

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
initIO(render);
initView(state, render);
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