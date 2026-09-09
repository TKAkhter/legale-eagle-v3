/**
 * RichTextEditor.tsx — lightweight rich text editor using TipTap.
 *
 * Features: Bold, Italic, Underline, Bullet list, Numbered list, Undo/Redo.
 * Outputs HTML. Can be used in forms or standalone (auto-save mode).
 *
 * Usage (form):
 *   <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Add notes..." />
 *
 * Usage (auto-save):
 *   <RichTextEditor value={notes} onChange={setNotes} onSave={handleSave} autoSave />
 */
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"
import { Box, IconButton, Divider, Tooltip, Paper } from "@mui/material"
import FormatBoldIcon         from "@mui/icons-material/FormatBold"
import FormatItalicIcon       from "@mui/icons-material/FormatItalic"
import FormatUnderlinedIcon   from "@mui/icons-material/FormatUnderlined"
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted"
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered"
import UndoIcon               from "@mui/icons-material/Undo"
import RedoIcon               from "@mui/icons-material/Redo"

interface Props {
  value?:       string
  onChange?:    (html: string) => void
  onSave?:      (html: string) => void
  placeholder?: string
  minHeight?:   number
  readOnly?:    boolean
  autoSave?:    boolean
}

export function RichTextEditor({
  value = "", onChange, onSave, placeholder = "Write something…",
  minHeight = 160, readOnly = false, autoSave = false,
}: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content:    value,
    editable:   !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
      if (autoSave && onSave) {
        clearTimeout((window as {_rteSaveTimer?: ReturnType<typeof setTimeout>})._rteSaveTimer)
        ;(window as {_rteSaveTimer?: ReturnType<typeof setTimeout>})._rteSaveTimer = setTimeout(() => onSave(html), 1500)
      }
    },
  })

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null

  const btnSx = (active: boolean) => ({
    borderRadius: 0.5,
    p: 0.5,
    bgcolor: active ? "action.selected" : "transparent",
    color:   active ? "primary.main" : "text.secondary",
    "&:hover": { bgcolor: "action.hover" },
  })

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      {/* Toolbar */}
      {!readOnly && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, px: 1, py: 0.5, borderBottom: "1px solid", borderColor: "divider", flexWrap: "wrap" }}>
          <Tooltip title="Bold (Ctrl+B)">
            <IconButton size="small" onClick={() => editor.chain().focus().toggleBold().run()} sx={btnSx(editor.isActive("bold"))}>
              <FormatBoldIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic (Ctrl+I)">
            <IconButton size="small" onClick={() => editor.chain().focus().toggleItalic().run()} sx={btnSx(editor.isActive("italic"))}>
              <FormatItalicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Underline">
            <IconButton size="small" onClick={() => editor.chain().focus().toggleStrike().run()} sx={btnSx(editor.isActive("strike"))}>
              <FormatUnderlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title="Bullet list">
            <IconButton size="small" onClick={() => editor.chain().focus().toggleBulletList().run()} sx={btnSx(editor.isActive("bulletList"))}>
              <FormatListBulletedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Numbered list">
            <IconButton size="small" onClick={() => editor.chain().focus().toggleOrderedList().run()} sx={btnSx(editor.isActive("orderedList"))}>
              <FormatListNumberedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title="Undo">
            <IconButton size="small" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} sx={btnSx(false)}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton size="small" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} sx={btnSx(false)}>
              <RedoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Editor area */}
      <Box
        sx={{
          minHeight,
          px: 2, py: 1.5,
          "& .ProseMirror": {
            outline: "none",
            minHeight,
            lineHeight: 1.7,
            fontSize: 14,
            "& p.is-editor-empty:first-of-type::before": {
              content: `"${placeholder}"`,
              color: "text.disabled",
              float: "left",
              pointerEvents: "none",
              height: 0,
            },
            "& ul, & ol": { pl: 2.5 },
            "& li": { mb: 0.5 },
            "& strong": { fontWeight: 700 },
            "& em": { fontStyle: "italic" },
            "& s": { textDecoration: "line-through" },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  )
}
