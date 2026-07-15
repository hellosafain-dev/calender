import React, { useState, useEffect } from 'react';
import { Target, ListTodo } from 'lucide-react';

export function PlannerHabitsPage() {
  return (
    <div className="min-h-full pb-32 animate-in fade-in duration-700 pt-12 px-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif text-gray-900 dark:text-gray-100 tracking-tight">
          Planner & Goals
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Organize your days and track your long-term growth.
        </p>
      </div>

      <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-8 border border-white/50 dark:border-gray-800/50 text-center space-y-4 shadow-sm">
        <ListTodo className="w-12 h-12 text-theme-400 mx-auto opacity-50" />
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Daily Planner</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your daily schedule and tasks will appear here.
        </p>
      </div>

      <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-8 border border-white/50 dark:border-gray-800/50 text-center space-y-4 shadow-sm">
        <Target className="w-12 h-12 text-theme-400 mx-auto opacity-50" />
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Long-term Goals</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set meaningful goals and track your progress over time.
        </p>
      </div>
    </div>
  );
}
