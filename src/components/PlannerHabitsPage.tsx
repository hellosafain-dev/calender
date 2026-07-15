import React, { useState, useEffect } from 'react';
import { Target, ListTodo, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { API } from '../lib/api';
import { Goal, PlannerTask } from '../types';
import { format } from 'date-fns';
import clsx from 'clsx';

export function PlannerHabitsPage() {
  const [activeTab, setActiveTab] = useState<'planner' | 'goals'>('planner');
  
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPeriod, setNewTaskPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, g] = await Promise.all([
        API.getPlannerTasks(format(new Date(), 'yyyy-MM-dd')), 
        API.getGoals()
      ]);
      setTasks(t);
      setGoals(g);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle.trim()) return;
    await API.createPlannerTask({
      title: newTaskTitle,
      period: newTaskPeriod,
      orderIndex: tasks.length,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setNewTaskTitle('');
    setIsAddingTask(false);
    loadData();
  };

  const handleSaveGoal = async () => {
    if (!newGoalTitle.trim()) return;
    await API.createGoal({
      title: newGoalTitle,
      category: 'personal',
      progress: 0,
    });
    setNewGoalTitle('');
    setIsAddingGoal(false);
    loadData();
  };

  const toggleTaskCompletion = async (task: PlannerTask) => {
    const updated = { ...task, isCompleted: !task.isCompleted };
    setTasks(tasks.map(t => t.id === task.id ? updated : t)); // Optimistic UI
    await API.updatePlannerTask(task.id, updated);
  };

  const toggleGoalCompletion = async (goal: Goal) => {
    const updated = { ...goal, isCompleted: !goal.isCompleted };
    setGoals(goals.map(g => g.id === goal.id ? updated : g)); // Optimistic UI
    await API.updateGoal(goal.id, updated);
  };

  const handleDeleteTask = async (id: string) => {
    await API.deletePlannerTask(id);
    loadData();
  };

  const handleDeleteGoal = async (id: string) => {
    await API.deleteGoal(id);
    loadData();
  };

  return (
    <div className="min-h-full pb-32 animate-in fade-in duration-700 pt-12 px-6 space-y-6">
      
      {/* ─── Header & Tabs ────────────────────────────────────────── */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-serif text-gray-900 dark:text-gray-100 tracking-tight">
          Focus
        </h1>
        
        <div className="flex justify-center gap-2 bg-white/30 dark:bg-black/30 backdrop-blur-md p-1 rounded-full w-max mx-auto border border-white/50 dark:border-gray-800">
          <button 
            onClick={() => setActiveTab('planner')}
            className={clsx("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === 'planner' ? "bg-theme-100 dark:bg-theme-900/60 text-theme-700 dark:text-theme-300 shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")}
          >
            Daily Planner
          </button>
          <button 
            onClick={() => setActiveTab('goals')}
            className={clsx("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === 'goals' ? "bg-theme-100 dark:bg-theme-900/60 text-theme-700 dark:text-theme-300 shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")}
          >
            Goals
          </button>
        </div>
      </div>

      {/* ─── Content Area ─────────────────────────────────────────── */}
      <div className="space-y-4">
        
        {activeTab === 'planner' && (
          <div className="space-y-6">
            {['morning', 'afternoon', 'evening'].map(period => (
              <div key={period}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-2">
                  {period}
                </h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.period === period).map(task => (
                    <div key={task.id} className="flex items-center gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-gray-800/50 group shadow-sm transition-all hover:bg-white/60 dark:hover:bg-black/40">
                      <button onClick={() => toggleTaskCompletion(task)}>
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-theme-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-theme-400 transition-colors" />
                        )}
                      </button>
                      <span className={clsx("flex-1 text-sm font-medium transition-colors", task.isCompleted ? "text-gray-400 line-through" : "text-gray-800 dark:text-gray-200")}>
                        {task.title}
                      </span>
                      <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  
                  {isAddingTask && newTaskPeriod === period ? (
                    <div className="flex gap-2 items-center bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl p-2 border border-theme-300">
                      <input 
                        type="text" 
                        autoFocus
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveTask()}
                        placeholder="What do you want to accomplish?"
                        className="flex-1 bg-transparent px-2 text-sm focus:outline-none text-gray-800 dark:text-gray-200"
                      />
                      <button onClick={handleSaveTask} className="px-3 py-1 bg-theme-500 text-white rounded-xl text-xs font-bold">Save</button>
                      <button onClick={() => setIsAddingTask(false)} className="px-3 py-1 text-gray-500 text-xs font-bold">Cancel</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setIsAddingTask(true); setNewTaskPeriod(period as any); }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:text-theme-500 hover:border-theme-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add task</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-4">
             {goals.map(goal => (
                <div key={goal.id} className="bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-5 border border-white/50 dark:border-gray-800/50 relative group shadow-sm">
                  <div className="flex items-center gap-3">
                     <button onClick={() => toggleGoalCompletion(goal)}>
                        {goal.isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-theme-500" />
                        ) : (
                          <Target className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-theme-400 transition-colors" />
                        )}
                      </button>
                      <div className="flex-1">
                         <h3 className={clsx("text-lg font-serif transition-colors", goal.isCompleted ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100")}>{goal.title}</h3>
                         <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 mt-2">
                            <div className="bg-theme-500 h-1.5 rounded-full" style={{ width: goal.isCompleted ? '100%' : `${goal.progress}%` }}></div>
                         </div>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                  </div>
                </div>
              ))}
              
              {isAddingGoal ? (
                 <div className="flex flex-col gap-3 bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-3xl p-5 border border-theme-300 shadow-md animate-in slide-in-from-bottom-2">
                    <input 
                      type="text" 
                      autoFocus
                      value={newGoalTitle}
                      onChange={e => setNewGoalTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                      placeholder="Name a new long-term goal..."
                      className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 pb-2 text-lg font-medium text-gray-900 dark:text-gray-100 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setIsAddingGoal(false)} className="px-4 py-2 text-gray-500 font-medium text-sm">Cancel</button>
                      <button onClick={handleSaveGoal} className="px-6 py-2 bg-theme-500 text-white rounded-full font-medium shadow-md">Set Goal</button>
                    </div>
                 </div>
              ) : (
                <button 
                  onClick={() => setIsAddingGoal(true)}
                  className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-md border border-dashed border-theme-300 dark:border-theme-800 rounded-3xl p-6 text-center hover:bg-theme-50 dark:hover:bg-theme-900/20 transition-colors group cursor-pointer"
                >
                  <Plus className="w-8 h-8 mx-auto text-theme-400 group-hover:scale-110 transition-transform mb-2" />
                  <p className="text-theme-600 dark:text-theme-400 font-medium text-sm">
                    Plant a new Goal
                  </p>
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
