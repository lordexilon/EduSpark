// components/RichTextEditor.tsx
// Editor de texto enriquecido compatible con React 19
// Usa contentEditable en lugar de react-quill para evitar problemas de compatibilidad

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onUploadImage?: (file: File) => Promise<string>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escribe el contenido aquí...',
  className = '',
  onUploadImage,
}) => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Deshabilitar extensiones que agregaremos manualmente con configuración personalizada
        link: false,
        underline: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md cursor-pointer',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-3',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const nextHtml = value || '';

    if (currentHtml === nextHtml) return;
    if (!nextHtml && currentHtml === '<p></p>') return;

    const selection = editor.state.selection;
    editor.commands.setContent(nextHtml, { emitUpdate: false });
    if (selection) {
      const { from, to } = selection;
      editor.commands.setTextSelection({ from, to });
    }
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('URL de la imagen');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleToolbarImage = useCallback(() => {
    if (onUploadImage) {
      imageInputRef.current?.click();
      return;
    }
    addImage();
  }, [onUploadImage, addImage]);

  const handleImageFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!onUploadImage) {
        alert('No se configuró el soporte para subir imágenes desde el equipo.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen.');
        event.target.value = '';
        return;
      }

      try {
        setIsUploadingImage(true);
        const url = await onUploadImage(file);
        if (url) {
          editor?.chain().focus().setImage({ src: url }).run();
        }
      } catch (error: any) {
        console.error('[RichTextEditor] Error subiendo imagen:', error);
        alert(error?.message || 'No se pudo subir la imagen.');
      } finally {
        setIsUploadingImage(false);
        event.target.value = '';
      }
    },
    [onUploadImage, editor]
  );

  if (!editor) {
    return null;
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />
      <div className="toolbar border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1 rounded-t-md">
        {/* Texto */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          title="Negrita"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          title="Cursiva"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          title="Subrayado"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          title="Tachado"
        >
          <s>S</s>
        </button>

        <div className="divider" />

        {/* Encabezados */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          title="Encabezado 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          title="Encabezado 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          title="Encabezado 3"
        >
          H3
        </button>

        <div className="divider" />

        {/* Listas */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          title="Lista con viñetas"
        >
          • Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          title="Lista numerada"
        >
          1. Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
          title="Cita"
        >
          "
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="toolbar-btn"
          title="Línea horizontal"
        >
          ─
        </button>

        <div className="divider" />

        {/* Alineación */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
          title="Alinear izquierda"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
          title="Centrar"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
          title="Alinear derecha"
        >
          ➡
        </button>

        <div className="divider" />

        {/* Link e Imagen */}
        <button
          type="button"
          onClick={setLink}
          className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          title="Insertar enlace"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={handleToolbarImage}
          className={`toolbar-btn ${isUploadingImage ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={onUploadImage ? 'Subir imagen desde tu equipo' : 'Insertar imagen por URL'}
          disabled={isUploadingImage}
        >
          {isUploadingImage ? '⏳' : '🖼️'}
        </button>

        <div className="divider" />

        {/* Controles de tamaño de imagen */}
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('image')) {
              editor
                .chain()
                .focus()
                .updateAttributes('image', {
                  style: 'width: 25%; height: auto;',
                })
                .run();
            } else {
              alert('Por favor, selecciona una imagen primero haciendo clic sobre ella.');
            }
          }}
          className="toolbar-btn text-xs"
          title="Imagen pequeña (25%) - Selecciona una imagen primero"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('image')) {
              editor
                .chain()
                .focus()
                .updateAttributes('image', {
                  style: 'width: 50%; height: auto;',
                })
                .run();
            } else {
              alert('Por favor, selecciona una imagen primero haciendo clic sobre ella.');
            }
          }}
          className="toolbar-btn text-xs"
          title="Imagen mediana (50%) - Selecciona una imagen primero"
        >
          M
        </button>
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('image')) {
              editor
                .chain()
                .focus()
                .updateAttributes('image', {
                  style: 'width: 75%; height: auto;',
                })
                .run();
            } else {
              alert('Por favor, selecciona una imagen primero haciendo clic sobre ella.');
            }
          }}
          className="toolbar-btn text-xs"
          title="Imagen grande (75%) - Selecciona una imagen primero"
        >
          L
        </button>
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('image')) {
              editor
                .chain()
                .focus()
                .updateAttributes('image', {
                  style: 'width: 100%; height: auto;',
                })
                .run();
            } else {
              alert('Por favor, selecciona una imagen primero haciendo clic sobre ella.');
            }
          }}
          className="toolbar-btn text-xs"
          title="Imagen completa (100%) - Selecciona una imagen primero"
        >
          XL
        </button>

        <div className="divider" />

        {/* Color */}
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="toolbar-btn w-8 h-8 p-0 border-0 cursor-pointer"
          title="Color de texto"
        />

        <div className="divider" />

        {/* Deshacer/Rehacer */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="toolbar-btn"
          title="Deshacer"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="toolbar-btn"
          title="Rehacer"
        >
          ↷
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
      {!editor.getText() && <div className="editor-placeholder">{placeholder}</div>}
    </div>
  );
};
