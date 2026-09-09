// test/code_node.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { renderNode } from '../dango/js/modules/render.js';
import { createNodesFromInput } from '../dango/js/modules/actions.js';
import { state, history } from '../dango/js/modules/state.js';
import { initRender, renderNode } from '../dango/js/modules/render.js';
import { CanvasNode } from '../dango/js/modules/types.js';

function createMockElement() {
    const classSet = new Set<string>();
    let innerHTML = '';
    return {
        setAttribute: () => {},
        classList: {
            contains: (cls: string) => classSet.has(cls),
            add: (cls: string) => classSet.add(cls),
            remove: (cls: string) => classSet.delete(cls)
        },
        style: {},
        dataset: {},
        className: '',
        get innerHTML() { return innerHTML; },
        set innerHTML(val: string) { innerHTML = val; },
        querySelector: () => null,
        appendChild: () => {}
    } as any;
}

describe('Code Node Parsing & Rendering Fidelity', () => {
    beforeEach(() => {
        state.nodes = [];
        state.groups = [];
        state.links = [];
        state.selection = new Set();
        history.undo = [];
        history.redo = [];
        initRender(state, {});
    });

    it('applies node-code class and renders code card even when trailing newline exists', () => {
        const mockEl = createMockElement();
        const node: CanvasNode = {
            id: 'test-code-1',
            x: 0,
            y: 0,
            text: '```bash\nhi\n```\n'
        };

        renderNode(mockEl, node);

        // Must have node-code class
        expect(mockEl.className).toContain('node-code');
        // Header and dots rendered
        expect(mockEl.innerHTML).toContain('class="code-header"');
        expect(mockEl.innerHTML).toContain('class="code-dots"');
        expect(mockEl.innerHTML).toContain('bash');
        expect(mockEl.innerHTML).toContain('class="code-content"');
        expect(mockEl.innerHTML).toContain('hi');
    });

    it('applies node-code class when code block has leading/trailing whitespaces or multiline content', () => {
        const mockEl = createMockElement();
        const node: CanvasNode = {
            id: 'test-code-2',
            x: 0,
            y: 0,
            text: '   ```javascript\nconst a = 1, b = 2;\nconsole.log(a, b);\n```   \n'
        };

        renderNode(mockEl, node);
        expect(mockEl.className).toContain('node-code');
        expect(mockEl.innerHTML).toContain('javascript');
        expect(mockEl.innerHTML).toContain('const');
    });

    it('does not treat solitary triple backticks as a valid code block', () => {
        const mockEl = createMockElement();
        const node: CanvasNode = {
            id: 'test-code-invalid',
            x: 0,
            y: 0,
            text: '```'
        };

        renderNode(mockEl, node);
        expect(mockEl.className).not.toContain('node-code');
        expect(mockEl.innerHTML).not.toContain('class="code-header"');
    });

    it('preserves multiline code block with commas and newlines as a single node in createNodesFromInput', () => {
        const codeInput = '```python\ndef greet(name, age):\n    return f"Hello {name}, age {age}"\n```';
        createNodesFromInput(codeInput);

        // Should create exactly 1 node, not multiple split nodes
        expect(state.nodes.length).toBe(1);
        expect(state.nodes[0].text).toBe(codeInput);
    });

    it('correctly splits regular comma-separated nodes while preserving embedded code blocks', () => {
        const mixedInput = 'Normal 1, ```bash\necho "hello, world"\n```, Normal 2';
        createNodesFromInput(mixedInput);

        expect(state.nodes.length).toBe(3);
        expect(state.nodes[0].text).toBe('Normal 1');
        expect(state.nodes[1].text).toBe('```bash\necho "hello, world"\n```');
        expect(state.nodes[2].text).toBe('Normal 2');
    });
});
