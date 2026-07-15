import React, { useEffect, useState } from 'react';
import { Settings, Flower, Sunrise, CloudRain, Sun } from 'lucide-react';
import { Habit, PlannerTask, Reminder } from '../types';
import { API } from '../lib/api';
import clsx from 'clsx';
import { format } from 'date-fns';

export function Dashboard() {
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState<{ quote: string; sentiment: string } | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning, Princess.');
    else if (hour < 18) setGreeting('Good afternoon, Princess.');
    else setGreeting('Good evening, Princess.');

    const loadData = async () => {
      try {
        const [h, t, r, q] = await Promise.all([
          API.getHabits(),
          API.getPlannerTasks(format(new Date(), 'yyyy-MM-dd')),
          API.getReminders(),
          API.getGeminiQuote('peaceful')
        ]);
        setHabits(h);
        setTasks(t);
        setReminders(r.filter(rm => rm.isActive));
        setQuote(q);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    loadData();
  }, []);

  const todayStr = format(new Date(), 'EEEE, MMMM do');
  const upcomingReminders = reminders.slice(0, 2);
  const topTasks = tasks.filter(t => !t.isCompleted).slice(0, 3);

  return (
    <div className="min-h-full pb-32 animate-in fade-in duration-700">
      
      {/* ─── Greeting Card ────────────────────────────────────── */}
      <div className="pt-12 px-6 pb-8 text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-theme-100 dark:bg-theme-900/30 flex items-center justify-center border-2 border-theme-200 dark:border-theme-800 shadow-inner">
            <Sunrise className="w-10 h-10 text-theme-500 animate-pulse-slow" />
          </div>
        </div>
        
        <h1 className="text-3xl font-serif text-gray-900 dark:text-gray-100 tracking-tight">
          {greeting}
        </h1>
        <p className="text-theme-600 dark:text-theme-400 font-medium">
          {todayStr}
        </p>
        
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto italic">
          "Today is another beautiful opportunity to grow."
        </p>
      </div>

      {/* ─── Quote of the Day ──────────────────────────────────── */}
      {quote && (
        <div className="px-6 mb-8">
          <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-800/50 shadow-sm text-center space-y-2">
            <p className="text-gray-800 dark:text-gray-200 font-serif leading-relaxed">
              "{quote.quote}"
            </p>
            <p className="text-theme-500 text-xs font-medium uppercase tracking-widest">
              {quote.sentiment}
            </p>
          </div>
        </div>
      )}

      {/* ─── Today's Focus ─────────────────────────────────────── */}
      <div className="px-6 space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 px-2">
            Today's Focus
          </h2>
          
          <div className="space-y-3">
            {topTasks.length === 0 ? (
              <div className="bg-white/40 dark:bg-black/20 rounded-2xl p-6 text-center border border-dashed border-gray-300 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Your day is clear.</p>
              </div>
            ) : (
              topTasks.map(task => (
                <div key={task.id} className="flex items-center gap-4 bg-white/60 dark:bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/50 dark:border-gray-800/50 shadow-sm">
                  <div className="w-5 h-5 rounded-full border-2 border-theme-300 dark:border-theme-700" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium flex-1">{task.title}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Smart Reminders ─────────────────────────────────── */}
        {upcomingReminders.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 px-2">
              Upcoming
            </h2>
            <div className="space-y-3">
              {upcomingReminders.map(rem => (
                <div key={rem.id} className="flex items-center gap-4 bg-theme-50/50 dark:bg-theme-900/10 backdrop-blur-md p-4 rounded-2xl border border-theme-100 dark:border-theme-900/30">
                  <div className="bg-theme-100 dark:bg-theme-900/40 p-2 rounded-xl text-theme-600 dark:text-theme-400 font-medium text-sm">
                    {rem.time}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">{rem.title}</p>
                    <p className="text-theme-500 dark:text-theme-400 text-xs capitalize">{rem.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Habit Garden ────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 px-2">
            Habit Garden
          </h2>
          <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/50 dark:border-gray-800/50 text-center">
            {habits.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Plant a new habit to grow your garden.</p>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {habits.map(habit => {
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const isCompleted = habit.completedDates.includes(todayStr);
                  return (
                    <div key={habit.id} className="flex flex-col items-center gap-2">
                      <button className={clsx(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                        isCompleted 
                          ? "bg-theme-100 dark:bg-theme-900/40 scale-110 shadow-md border-2 border-theme-300 dark:border-theme-700" 
                          : "bg-gray-100 dark:bg-gray-800/50 opacity-50 grayscale"
                      )}>
                        <Flower className={clsx("w-6 h-6", isCompleted ? "text-theme-500" : "text-gray-400")} />
                      </button>
                      <span className="text-[10px] text-gray-500 uppercase font-medium">{habit.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
