import React from 'react';
import { BookHeart, StickyNote } from 'lucide-react';

export function JournalNotesPage() {
  return (
    <div className="min-h-full pb-32 animate-in fade-in duration-700 pt-12 px-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif text-gray-900 dark:text-gray-100 tracking-tight">
          Journal & Notes
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          A quiet space to reflect, write, and remember.
        </p>
      </div>

      <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-8 border border-white/50 dark:border-gray-800/50 text-center space-y-4 shadow-sm">
        <BookHeart className="w-12 h-12 text-theme-400 mx-auto opacity-50" />
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Personal Journal</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Write freely. Your daily reflections will be kept private and safe.
        </p>
      </div>

      <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-8 border border-white/50 dark:border-gray-800/50 text-center space-y-4 shadow-sm">
        <StickyNote className="w-12 h-12 text-theme-400 mx-auto opacity-50" />
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Notes & Ideas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Capture quick thoughts, checklists, and inspiration.
        </p>
      </div>
    </div>
  );
}
