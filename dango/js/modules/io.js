// modules/io.js
import { state, pushHistory, packData, unpackData } from './state.js';
import { getTexts } from './i18n.js';
import { showToast, applySettings } from './ui.js';
import { getTimestamp, isUrl, escapeHtml } from './utils.js';

// 将 main.js 中的 exportJson, downloadImage, createShareLink, processDangoFile, getSvgString 移入此处
// 注意：由于 downloadImage 需要 render，我们需要在初始化时传入
let renderRef = null;

export function initIO(render) {
    renderRef = render;
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            processDangoFile(e.target.files[0]);
            e.target.value = '';
        };
    }
}

export function exportJson() {
    const data = JSON.stringify({ nodes: state.nodes, groups: state.groups, links: state.links }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dango-canvas_${getTimestamp()}.dango`;
    a.click();
    URL.revokeObjectURL(url);
}

export function processDangoFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.dango') && !file.name.endsWith('.json')) {
        showToast(getTexts().alert_file_err);
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            let oldSnapshot = null;
            if (state.nodes.length > 0) {
                oldSnapshot = { nodes: [...state.nodes], groups: [...state.groups], links: [...state.links] };
            }
            pushHistory();
            state.nodes = data.nodes || [];
            state.groups = data.groups || [];
            state.links = data.links || [];
            state.selection.clear();
            renderRef();
            showToast(getTexts().toast_import_success, oldSnapshot);
        } catch (err) {
            console.error(err);
            showToast(getTexts().alert_file_err);
        }
    };
    reader.readAsText(file);
}

export async function downloadImage() {
    const svgData = getSvgString();
    if (!svgData) return;
    const canvas = document.createElement('canvas');
    const scale = 3;
    canvas.width = svgData.width * scale;
    canvas.height = svgData.height * scale;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData.html], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = async () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        if (state.settings.copyMode) {
            canvas.toBlob(async (blob) => {
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    showToast(getTexts().toast_copy_success);
                } catch (err) { showToast(getTexts().toast_copy_fail); }
                URL.revokeObjectURL(url);
            }, 'image/png');
        } else {
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

export function createShareLink() {
    const packed = packData();
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
    const baseUrl = window.location.origin + window.location.pathname;
    const url = state.settings.copyAsEmbed 
        ? `<iframe src="${baseUrl}?embed=true#${compressed}" style="width: 100%; height: 500px; border: none; border-radius: 12px;" allow="clipboard-write"></iframe>`
        : baseUrl + '#' + compressed;
    
    navigator.clipboard.writeText(url).then(() => {
        showToast(state.settings.copyAsEmbed ? getTexts().toast_copy_embed_success : getTexts().toast_copy_success);
    });
}

export function updateOpenFullLink() {
    if (!state.isEmbed) return;
    const btn = document.getElementById('btn-open-full');
    if (!btn) return;
    const packed = packData();
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(packed));
    const baseUrl = window.location.origin + window.location.pathname;
    btn.href = baseUrl + '#' + compressed;
}

export function loadFromUrl() {
    const hash = window.location.hash.substring(1);
    if (!hash) return false;
    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(hash);
        if (!decompressed) return false;
        const dataRaw = JSON.parse(decompressed);
        const data = Array.isArray(dataRaw) ? unpackData(dataRaw) : dataRaw;
        const oldSnapshot = {
            nodes: [...state.nodes],
            groups: [...state.groups],
            links: [...state.links],
            selection: Array.from(state.selection)
        };
        pushHistory(JSON.stringify(oldSnapshot));
        state.nodes = data.nodes || [];
        state.groups = data.groups || [];
        state.links = data.links || [];
        state.selection.clear();
        if (data.settings) Object.assign(state.settings, data.settings);
        renderRef();
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
