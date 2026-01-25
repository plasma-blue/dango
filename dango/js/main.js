import { initI18n, toggleLang, getCurrentLang, getTexts, updateI18n } from './modules/i18n.js';
import { initUI, showToast, applySettings, applyHandDrawnStyle } from './modules/ui.js';
import {
    state, CONFIG, history,
    pushHistory, undo as undoState, redo as redoState,
    loadData, saveData, unpackData, packData, MAX_HISTORY
} from './modules/state.js';
import { initRender, render } from './modules/render.js';
import { 
    createNodesFromInput as createNodesAction, // 使用别名以防命名冲突
    clearCanvas
} from './modules/actions.js';
import { initIO, exportJson, downloadImage, createShareLink, loadFromUrl, updateOpenFullLink } from './modules/io.js';
import { initView } from './modules/view.js';
import { initShortcuts } from './modules/shortcuts.js';
import { initInteractions, handleNodeEdit } from './modules/interactions.js';
function undo() {
    undoState(render);
}

function redo() {
    redoState(render);
}

function createNodesFromInput() {
    createNodesAction(els.input.value, els);
}


document.getElementById('btn-lang').onclick = (e) => {
    toggleLang();
    updateI18n();
    e.currentTarget.blur();
};

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


// document.getElementById('btn-export').onclick = exportJson;
document.getElementById('file-input').onchange = (e) => {
    processDangoFile(e.target.files[0]);
    e.target.value = ''; // 清空 input 方便重复导入同一文件
};


document.getElementById('btn-import-main').onclick = () => {
    document.getElementById('file-input').click();
};


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
initInteractions(els);
initShortcuts({
    render,
    undo,
    redo,
    handleNodeEdit,
    exportJson
});
// ✨ 新的 UI 初始化 ✨
initUI(els, state, {
    undo: undo,
    clearCanvas: clearCanvas,
    exportJson: exportJson,
    downloadImage: downloadImage,
    createShareLink: createShareLink,
    applyHandDrawnStyle: applyHandDrawnStyle,
    createNodesFromInput: createNodesFromInput,
});

applyHandDrawnStyle();
applySettings(state); // 这个函数现在是从 ui.js 导入的
render();
updateI18n();
