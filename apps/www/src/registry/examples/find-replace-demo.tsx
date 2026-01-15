'use client';

import * as React from 'react';

import debounce from 'lodash/debounce.js';

import { FindReplacePlugin } from '@platejs/find-replace';
import {
  Plate,
  useEditorPlugin,
  usePlateEditor,
  usePluginOption,
} from 'platejs/react';

import { Input } from '@/components/ui/input';
import { EditorKit } from '@/registry/components/editor/editor-kit';
import { findReplaceValue } from '@/registry/examples/values/find-replace-value';
import { Editor, EditorContainer } from '@/registry/ui/editor';
import { FixedToolbar } from '@/registry/ui/fixed-toolbar';
import { SearchHighlightLeaf } from '@/registry/ui/search-highlight-node';

export function FindToolbar() {
  const { editor, setOption } = useEditorPlugin(FindReplacePlugin);
  const search = usePluginOption(FindReplacePlugin, 'search');

  return (
    <FixedToolbar className="border-none py-3">
      <Input
        data-testid="ToolbarSearchHighlightInput"
        className="mx-2"
        value={search}
        onChange={(e) => {
          setOption('search', e.target.value);
          editor.api.redecorate();
        }}
        placeholder="Search the text..."
        type="search"
      />
    </FixedToolbar>
  );
}

export default function FindReplaceDemo() {
  const editor = usePlateEditor(
    {
      plugins: [
        ...EditorKit,
        FindReplacePlugin.configure({
          options: { search: 'text' },
          render: { node: SearchHighlightLeaf },
        }),
      ],
      value: findReplaceValue,
    },
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refetchDictionary = React.useCallback(
    debounce(() => {
      editor.setOption(FindReplacePlugin, "search", "bug");
      editor.api.redecorate();
    }, 1_500),
    [editor]
  );

  return (
    <Plate editor={editor} onValueChange={() => refetchDictionary()}>
      <FindToolbar />

      <EditorContainer variant="demo" className="border-t">
        <Editor />
      </EditorContainer>
    </Plate>
  );
}
