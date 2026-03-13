import { useState } from 'react';
import type { FhirAnnotation } from '../hooks/use-care-plans';

interface NoteThreadProps {
  notes: FhirAnnotation[];
  onAddNote?: (content: string) => Promise<void>;
}

export function NoteThread({ notes, onAddNote }: NoteThreadProps): React.ReactElement {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !onAddNote) return;
    setSubmitting(true);
    try {
      await onAddNote(content.trim());
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {onAddNote && (
        <div className="mb-4">
          <textarea
            placeholder="Add a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white resize-y box-border placeholder:text-slate-400 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-6 m-0">No notes yet</p>
      )}

      <div className="space-y-3">
        {notes.map((note, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">
                {note.authorReference?.display ?? 'Unknown'}
              </span>
              {note.time && (
                <span className="text-xs text-slate-400">
                  {new Date(note.time).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 m-0 whitespace-pre-wrap">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
