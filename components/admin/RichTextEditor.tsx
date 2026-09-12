'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect, useCallback } from 'react'

export default function RichTextEditor({
  value, onChange, placeholder,
}: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-amber-600 underline' } }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { 'data-placeholder': placeholder ?? 'Write a description...' },
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt('Enter URL')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition cursor-pointer ${active ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-200'}`

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 px-2 py-1.5 bg-gray-50">
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={btnClass(!!editor?.isActive('bold'))}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={btnClass(!!editor?.isActive('italic'))}>
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={btnClass(!!editor?.isActive('bulletList'))}>
          • List
        </button>
        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={btnClass(!!editor?.isActive('orderedList'))}>
          1. List
        </button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={btnClass(!!editor?.isActive('blockquote'))}>
          " Quote
        </button>
        <button type="button" onClick={setLink} className={btnClass(!!editor?.isActive('link'))}>
          🔗 Link
        </button>
        {editor?.isActive('link') && (
          <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className="px-2 py-1 text-xs rounded text-red-500 hover:bg-red-50 cursor-pointer">
            Remove link
          </button>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}