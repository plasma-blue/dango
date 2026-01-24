// --- START: CREATE NEW FILE modules/animation.js ---
import { state } from './state.js';
import { render } from './render.js';
import { pushHistory, saveData } from './state.js';

let nodeAnimationId = null;

/**
 * 将指定 ID 的节点们以动画形式移动到目标位置
 * @param {Array<{id: string, x: number, y: number}>} targets - 目标节点信息
 * @param {number} duration - 动画时长 (ms)
 */
export function animateNodesTo(targets, duration = 300) {
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
        const ease = 1 - Math.pow(1 - progress, 3); // OutCubic

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

/**
 * 智能对齐选中的节点
 */
export function smartAlignSelection() {
    const selectedNodes = state.nodes.filter(n => state.selection.has(n.id));
    if (selectedNodes.length < 2) return;

    pushHistory();

    const rowThreshold = 60;
    const standardGapX = 40;

    // 1. 识别行
    const sortedByY = [...selectedNodes].sort((a, b) => a.y - b.y);
    const rows = [];
    if (sortedByY.length > 0) {
        let currentRow = [sortedByY[0]];
        for (let i = 1; i < sortedByY.length; i++) {
            if (Math.abs(sortedByY[i].y - currentRow[currentRow.length - 1].y) < rowThreshold) {
                currentRow.push(sortedByY[i]);
            } else {
                rows.push(currentRow);
                currentRow = [sortedByY[i]];
            }
        }
        rows.push(currentRow);
    }

    // 2. 计算目标位置
    const targets = [];
    const originalCenter = {
        x: selectedNodes.reduce((sum, n) => sum + n.x + n.w/2, 0) / selectedNodes.length,
        y: selectedNodes.reduce((sum, n) => sum + n.y + n.h/2, 0) / selectedNodes.length
    };

    rows.forEach((row) => {
        const avgY = row.reduce((sum, n) => sum + n.y, 0) / row.length;
        const sortedInRow = row.sort((a, b) => a.x - b.x);
        
        let currentX = 0; // 临时起点，后续会校正
        sortedInRow.forEach((node) => {
            targets.push({ id: node.id, x: currentX, y: avgY });
            currentX += (node.w || 80) + standardGapX;
        });
    });

    // 3. 保持重心不变
    const targetCenter = {
        x: targets.reduce((sum, t) => {
            const node = selectedNodes.find(sn => sn.id === t.id);
            return sum + t.x + (node.w || 80) / 2;
        }, 0) / targets.length,
        y: targets.reduce((sum, t) => {
            const node = selectedNodes.find(sn => sn.id === t.id);
            return sum + t.y + (node.h || 40) / 2;
        }, 0) / targets.length
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
// --- END: CREATE NEW FILE modules/animation.js ---