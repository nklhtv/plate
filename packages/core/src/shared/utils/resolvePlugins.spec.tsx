import type { PlateEditor } from '../types';

import { createPlateEditor } from '../../client';
import { createPlugin } from './createPlugin';
import {
  applyPluginOverrides,
  mergePlugins,
  resolveAndSortPlugins,
  resolvePlugins,
} from './resolvePlugins';

describe('resolvePlugins', () => {
  let editor: PlateEditor;

  beforeEach(() => {
    editor = createPlateEditor();
  });

  it('should initialize plugins with correct order based on priority', () => {
    const plugins = [
      createPlugin({ key: 'a', priority: 1 }),
      createPlugin({ key: 'b', priority: 3 }),
      createPlugin({ key: 'c', priority: 2 }),
    ];

    resolvePlugins(editor, plugins);

    expect(editor.plugins.map((p) => p.key)).toEqual(['b', 'c', 'a']);
  });

  it('should handle nested plugins', () => {
    const plugins = [
      createPlugin({
        key: 'parent',
        plugins: [
          createPlugin({ key: 'child1' }),
          createPlugin({ key: 'child2' }),
        ],
      }),
    ];

    resolvePlugins(editor, plugins);

    expect(editor.plugins.map((p) => p.key)).toContain('parent');
    expect(editor.plugins.map((p) => p.key)).toContain('child1');
    expect(editor.plugins.map((p) => p.key)).toContain('child2');
  });

  it('should not include disabled plugins', () => {
    const plugins = [
      createPlugin({ key: 'enabled' }),
      createPlugin({ enabled: false, key: 'disabled' }),
    ];

    resolvePlugins(editor, plugins);

    expect(editor.plugins.map((p) => p.key)).toContain('enabled');
    expect(editor.plugins.map((p) => p.key)).not.toContain('disabled');
  });

  it('should apply overrides correctly', () => {
    const plugins = [
      createPlugin({
        key: 'a',
        override: {
          plugins: {
            b: { type: 'overridden' },
          },
        },
        type: 'original',
      }),
      createPlugin({ key: 'b', type: 'original' }),
    ];

    resolvePlugins(editor, plugins);

    expect(editor.pluginsByKey.b.type).toBe('overridden');
  });
});

describe('resolveAndSortPlugins', () => {
  it('should resolve and sort plugins correctly', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({ key: 'a', priority: 1 }),
      createPlugin({ key: 'b', priority: 3 }),
      createPlugin({ key: 'c', priority: 2 }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toEqual(['b', 'c', 'a']);
  });

  it('should handle nested plugins', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({
        key: 'parent',
        plugins: [
          createPlugin({ key: 'child1', priority: 2 }),
          createPlugin({ key: 'child2', priority: 1 }),
        ],
      }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toEqual(['parent', 'child1', 'child2']);
  });

  it('should order plugins based on dependencies', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({ key: 'a', priority: 1 }),
      createPlugin({ dependencies: ['c'], key: 'b', priority: 3 }),
      createPlugin({ key: 'c', priority: 2 }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toEqual(['c', 'b', 'a']);
  });

  it('should handle multiple dependencies', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({ dependencies: ['b', 'c'], key: 'a', priority: 3 }),
      createPlugin({ key: 'b', priority: 2 }),
      createPlugin({ key: 'c', priority: 1 }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toEqual(['b', 'c', 'a']);
  });

  it('should handle nested dependencies', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({ dependencies: ['b'], key: 'a', priority: 3 }),
      createPlugin({ dependencies: ['c'], key: 'b', priority: 2 }),
      createPlugin({ key: 'c', priority: 1 }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toEqual(['c', 'b', 'a']);
  });

  it('should maintain priority order when no dependencies conflict', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({ key: 'a', priority: 3 }),
      createPlugin({ dependencies: ['c'], key: 'b', priority: 2 }),
      createPlugin({ key: 'c', priority: 1 }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toEqual(['a', 'c', 'b']);
  });

  it('should handle circular dependencies gracefully', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({ dependencies: ['b'], key: 'a' }),
      createPlugin({ dependencies: ['a'], key: 'b' }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    expect(result.map((p) => p.key)).toContain('a');
    expect(result.map((p) => p.key)).toContain('b');
    expect(result).toHaveLength(2);
  });

  it('should handle dependencies with nested plugins', () => {
    const editor = createPlateEditor();
    const plugins = [
      createPlugin({
        key: 'parent',
        plugins: [
          createPlugin({ dependencies: ['child2'], key: 'child1' }),
          createPlugin({ key: 'child2' }),
        ],
      }),
    ];

    const result = resolveAndSortPlugins(editor, plugins);

    const childIndices = result.map((p) => p.key).slice(1); // Exclude 'parent'
    expect(childIndices).toEqual(['child2', 'child1']);
  });
});

describe('mergePlugins', () => {
  it('should merge plugins correctly', () => {
    const editor = createPlateEditor();
    editor.plugins = [];
    editor.pluginsByKey = {};

    const plugins = [
      createPlugin({ key: 'a', type: 'typeA' }),
      createPlugin({ key: 'b', type: 'typeB' }),
    ];

    mergePlugins(editor, plugins);

    expect(editor.plugins).toHaveLength(2);
    expect(editor.pluginsByKey.a.type).toBe('typeA');
    expect(editor.pluginsByKey.b.type).toBe('typeB');
  });

  it('should update existing plugins', () => {
    const editor = createPlateEditor();
    editor.plugins = [createPlugin({ key: 'a', type: 'oldType' })];
    editor.pluginsByKey = { a: editor.plugins[0] };

    const plugins = [createPlugin({ key: 'a', type: 'newType' })];

    mergePlugins(editor, plugins);

    expect(editor.plugins).toHaveLength(1);
    expect(editor.pluginsByKey.a.type).toBe('newType');
  });
});

describe('applyPluginOverrides', () => {
  it('should apply overrides correctly', () => {
    const editor = createPlateEditor();
    editor.plugins = [
      createPlugin({
        key: 'a',
        override: {
          plugins: {
            b: { type: 'overriddenB' },
          },
        },
        type: 'originalA',
      }),
      createPlugin({ key: 'b', type: 'originalB' }),
    ];
    editor.pluginsByKey = {
      a: editor.plugins[0],
      b: editor.plugins[1],
    };

    applyPluginOverrides(editor);

    expect(editor.pluginsByKey.a.type).toBe('originalA');
    expect(editor.pluginsByKey.b.type).toBe('overriddenB');
  });

  it('should handle nested overrides', () => {
    const editor = createPlateEditor() as PlateEditor;

    resolvePlugins(editor, [
      createPlugin({
        key: 'parent',
        override: {
          plugins: {
            child: { type: 'overriddenChild' },
          },
        },
        plugins: [createPlugin({ key: 'child', type: 'originalChild' })],
      }),
    ]);

    expect(editor.pluginsByKey.child.type).toBe('overriddenChild');
  });

  it('should apply multiple overrides in correct order', () => {
    const editor = createPlateEditor();
    editor.plugins = [
      createPlugin({
        key: 'a',
        override: {
          plugins: {
            c: { type: 'overriddenByA' },
          },
        },
        type: 'originalA',
      }),
      createPlugin({
        key: 'b',
        override: {
          plugins: {
            c: { type: 'overriddenByB' },
          },
        },
        type: 'originalB',
      }),
      createPlugin({ key: 'c', type: 'originalC' }),
    ];
    editor.pluginsByKey = {
      a: editor.plugins[0],
      b: editor.plugins[1],
      c: editor.plugins[2],
    };

    applyPluginOverrides(editor);

    expect(editor.pluginsByKey.c.type).toBe('overriddenByB');
  });

  it('should override components based on priority only if target plugin has a component', () => {
    const editor = createPlateEditor();
    const OriginalComponent = () => null;
    const OverrideComponent = () => null;
    const HighPriorityComponent = () => null;
    const PreservedOriginalComponent = () => null;

    editor.plugins = [
      createPlugin({
        key: 'a',
        override: {
          components: {
            b: OverrideComponent,
            c: OverrideComponent,
            d: OverrideComponent,
            e: OverrideComponent,
          },
        },
        priority: 2,
      }),
      createPlugin({
        component: OriginalComponent,
        key: 'b',
        priority: 3,
      }),
      createPlugin({
        key: 'c',
        priority: 1,
      }),
      createPlugin({
        component: OriginalComponent,
        key: 'd',
        priority: 1,
      }),
      createPlugin({
        key: 'e',
        override: {
          components: {
            b: HighPriorityComponent,
            d: HighPriorityComponent,
          },
        },
        priority: 4,
      }),
      createPlugin({
        component: PreservedOriginalComponent,
        key: 'f',
        priority: 5,
      }),
    ];
    editor.pluginsByKey = {
      a: editor.plugins[0],
      b: editor.plugins[1],
      c: editor.plugins[2],
      d: editor.plugins[3],
      e: editor.plugins[4],
      f: editor.plugins[5],
    };

    applyPluginOverrides(editor);

    // Higher priority override
    expect(editor.pluginsByKey.b.component).toBe(HighPriorityComponent);

    // No initial component, so it gets set
    expect(editor.pluginsByKey.c.component).toBe(OverrideComponent);

    // Lower priority component gets overridden
    expect(editor.pluginsByKey.d.component).toBe(HighPriorityComponent);

    // Highest priority original component is preserved
    expect(editor.pluginsByKey.f.component).toBe(PreservedOriginalComponent);
  });
});