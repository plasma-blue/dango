// modules/view.js
import { screenToWorld } from './utils.js';

let renderRef = null;
let stateRef = null;
let viewAnimationId = null;

export function initView(state, render) {
    stateRef = state;
    renderRef = render;
}

// 停止当前所有视口动画
export function cancelViewAnimation() {
    if (viewAnimationId) {
        cancelAnimationFrame(viewAnimationId);
        viewAnimationId = null;
    }
}

// 通用缩放函数
export function changeZoom(factor, mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2) {
    cancelViewAnimation();
    
    const worldPos = screenToWorld(mouseX, mouseY, stateRef.view);
    const oldScale = stateRef.view.scale;
    stateRef.view.scale = Math.max(0.1, Math.min(5, oldScale * factor));
    
    stateRef.view.x = mouseX - worldPos.x * stateRef.view.scale;
    stateRef.view.y = mouseY - worldPos.y * stateRef.view.scale;
    renderRef();
}

export function resetViewToCenter(animated = true) {
    const targetX = window.innerWidth / 2;
    const targetY = window.innerHeight / 2;
    const targetScale = 1.2;

    if (animated) {
        animateView(targetX, targetY, targetScale);
    } else {
        stateRef.view.x = targetX;
        stateRef.view.y = targetY;
        stateRef.view.scale = targetScale;
        renderRef();
    }
}

export function animateView(targetX, targetY, targetScale, duration = 400) {
    cancelViewAnimation();
    const startX = stateRef.view.x;
    const startY = stateRef.view.y;
    const startScale = stateRef.view.scale;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(2, -10 * progress);
        
        stateRef.view.x = startX + (targetX - startX) * ease;
        stateRef.view.y = startY + (targetY - startY) * ease;
        stateRef.view.scale = startScale + (targetScale - startScale) * ease;
        renderRef();

        if (progress < 1) {
            viewAnimationId = requestAnimationFrame(step);
        } else {
            viewAnimationId = null;
        }
    }
    viewAnimationId = requestAnimationFrame(step);
}