import React, { useState, useEffect } from 'react';
import { BookHeart, StickyNote, Plus, Trash2, X } from 'lucide-react';
import { API } from '../lib/api';
import { JournalEntry, Note } from '../types';
import { format } from 'date-fns';
import clsx from 'clsx';

export function JournalNotesPage() {
  const [activeTab, setActiveTab] = useState<'journal' | 'notes'>('journal');
  
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [isWriting, setIsWriting] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [j, n] = await Promise.all([API.getJournalEntries(), API.getNotes()]);
      setJournals(j);
      setNotes(n);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!draftContent.trim()) return;

    if (activeTab === 'journal') {
      await API.createJournalEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        content: draftContent,
        prompt: 'What made you smile today?'
      });
    } else {
      await API.createNote({
        title: draftTitle || 'Untitled Note',
        content: draftContent,
        folder: 'Personal'
      });
    }

    setIsWriting(false);
    setDraftContent('');
    setDraftTitle('');
    loadData();
  };

  const handleDelete = async (id: string, type: 'journal' | 'note') => {
    if (type === 'journal') await API.deleteJournalEntry(id);
    else await API.deleteNote(id);
    loadData();
  };

  return (
    <div className="min-h-full pb-32 animate-in fade-in duration-700 pt-12 px-6 space-y-6">
      
      {/* ─── Header & Tabs ────────────────────────────────────────── */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-serif text-gray-900 dark:text-gray-100 tracking-tight">
          Sanctuary
        </h1>
        
        <div className="flex justify-center gap-2 bg-white/30 dark:bg-black/30 backdrop-blur-md p-1 rounded-full w-max mx-auto border border-white/50 dark:border-gray-800">
          <button 
            onClick={() => setActiveTab('journal')}
            className={clsx("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === 'journal' ? "bg-theme-100 dark:bg-theme-900/60 text-theme-700 dark:text-theme-300 shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")}
          >
            Journal
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={clsx("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === 'notes' ? "bg-theme-100 dark:bg-theme-900/60 text-theme-700 dark:text-theme-300 shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")}
          >
            Notes
          </button>
        </div>
      </div>

      {/* ─── Content Area ─────────────────────────────────────────── */}
      {!isWriting ? (
        <div className="space-y-4">
          <button 
            onClick={() => setIsWriting(true)}
            className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-md border border-dashed border-theme-300 dark:border-theme-800 rounded-3xl p-6 text-center hover:bg-theme-50 dark:hover:bg-theme-900/20 transition-colors group cursor-pointer"
          >
            <Plus className="w-8 h-8 mx-auto text-theme-400 group-hover:scale-110 transition-transform mb-2" />
            <p className="text-theme-600 dark:text-theme-400 font-medium text-sm">
              {activeTab === 'journal' ? "Write today's reflection" : "Create a new note"}
            </p>
          </button>

          <div className="space-y-4">
            {activeTab === 'journal' && journals.map(entry => (
              <div key={entry.id} className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/50 dark:border-gray-800/50 relative group shadow-sm">
                <button onClick={() => handleDelete(entry.id, 'journal')} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
                <div className="flex items-center gap-2 mb-3 text-theme-500 dark:text-theme-400">
                  <BookHeart className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{entry.date}</span>
                </div>
                {entry.prompt && (
                  <p className="text-sm font-serif italic text-gray-500 dark:text-gray-400 mb-2">{entry.prompt}</p>
                )}
                <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{entry.content}</p>
              </div>
            ))}

            {activeTab === 'notes' && notes.map(note => (
              <div key={note.id} className="bg-theme-50/50 dark:bg-theme-900/10 backdrop-blur-xl rounded-3xl p-6 border border-theme-100 dark:border-theme-800/50 relative group shadow-sm">
                <button onClick={() => handleDelete(note.id, 'note')} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
                <div className="flex items-center gap-2 mb-2 text-theme-600 dark:text-theme-400">
                  <StickyNote className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{note.folder}</span>
                </div>
                <h3 className="text-lg font-serif text-gray-900 dark:text-gray-100 mb-2">{note.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ─── Writing Editor ─────────────────────────────────────── */
        <div className="bg-white/80 dark:bg-black/60 backdrop-blur-2xl rounded-3xl p-6 border border-white dark:border-gray-800 shadow-xl animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">
              {activeTab === 'journal' ? "Today's Reflection" : "New Note"}
            </h2>
            <button onClick={() => setIsWriting(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeTab === 'notes' && (
            <input 
              type="text"
              placeholder="Note Title..."
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 text-lg font-medium text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400"
            />
          )}

          <textarea 
            placeholder={activeTab === 'journal' ? "What's on your mind? Take a deep breath and let it out..." : "Start typing your ideas..."}
            value={draftContent}
            onChange={e => setDraftContent(e.target.value)}
            className="w-full h-64 bg-transparent resize-none text-gray-700 dark:text-gray-300 leading-relaxed focus:outline-none placeholder-gray-400"
            autoFocus
          />

          <div className="flex justify-end mt-4">
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-theme-500 text-white font-medium rounded-full hover:bg-theme-600 transition-colors shadow-md"
            >
              Save to Sanctuary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
