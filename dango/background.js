// background.js

// 1. 兼容 V2 (Firefox) 和 V3 (Chrome/Edge) 的 API 对象
// Firefox 使用 'browser'，Chrome/Edge 使用 'chrome'
const api = (typeof browser !== 'undefined') ? browser : chrome;

// 2. 兼容点击事件监听
// V3 使用 api.action，V2 使用 api.browserAction
const action = api.action || api.browserAction;

action.onClicked.addListener(() => {
    const indexUrl = api.runtime.getURL("index.html");

    api.tabs.query({ url: indexUrl }, (tabs) => {
        if (tabs.length > 0) {
            // 已打开则跳转
            const tab = tabs[0];
            api.tabs.update(tab.id, { active: true });
            api.windows.update(tab.windowId, { focused: true });
        } else {
            // 未打开则新建
            api.tabs.create({ url: "index.html" });
        }
    });
});