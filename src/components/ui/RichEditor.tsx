'use client';
// リッチテキストエディタ（TipTap）— プロフィールタブなどのHTMLコンテンツ作成用
// 独自ツールバーを使用。出力はHTML、保存時のサニタイズはレンダー側で行う。

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

function TBtn({
  on,
  label,
  title,
  onClick,
}: {
  on?: boolean;
  label: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-tip={title}
      className={`re-btn ${on ? 'on' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function RichEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 're-content prose' },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // 外部値が大きく切り替わった場合（タブ切替など）だけ同期する。
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return <div className="re-wrap" style={{ minHeight: 200 }} />;
  }

  const addImage = () => {
    const url = window.prompt('画像URLを入力してください');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="re-wrap">
      <div className="re-toolbar">
        <TBtn
          title="太字"
          label={<b>B</b>}
          on={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <TBtn
          title="斜体"
          label={<i>I</i>}
          on={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <TBtn
          title="取り消し線"
          label={<s>S</s>}
          on={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <span className="re-sep" />

        <TBtn
          title="見出し"
          label="H2"
          on={editor.isActive('heading', { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <TBtn
          title="小見出し"
          label="H3"
          on={editor.isActive('heading', { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />

        <span className="re-sep" />

        <TBtn
          title="箇条書き"
          label="•≡"
          on={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <TBtn
          title="番号付きリスト"
          label="1≡"
          on={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <TBtn
          title="引用"
          label="❝"
          on={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <TBtn
          title="区切り線"
          label="—"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <span className="re-sep" />

        <TBtn
          title="画像を挿入（URL）"
          label="🖼"
          onClick={addImage}
        />

        {/* 元に戻す／やり直すはモバイルでは非表示。
            ツールバーの折り返しを防ぐため。ショートカットは引き続き利用可能。 */}
        <span className="re-sep re-hide-m" />
        <span className="re-hide-m" style={{ display: 'contents' }}>
          <TBtn
            title="元に戻す"
            label="↶"
            onClick={() => editor.chain().focus().undo().run()}
          />
          <TBtn
            title="やり直す"
            label="↷"
            onClick={() => editor.chain().focus().redo().run()}
          />
        </span>
      </div>

      <div className="re-body">
        <EditorContent editor={editor} />
        {placeholder && editor.isEmpty && (
          <div className="re-ph">{placeholder}</div>
        )}
      </div>
    </div>
  );
}
