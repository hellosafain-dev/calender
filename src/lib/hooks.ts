import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from './api.js';
import { Memory, Reminder } from '../types.js';

// --- Queries ---

export function useMemories() {
  return useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn: () => API.getMemories(),
    // Refetch in background to keep UI fresh
    refetchInterval: 120000, 
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useReminders() {
  return useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: () => API.getReminders(),
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useSettings() {
  return useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => API.getSettings(),
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// --- Optimistic Mutations ---

export function useAddMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: any) => API.createMemory(payload),
    onMutate: async (newMemoryData) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['memories'] });
      
      // Snapshot previous value
      const previousMemories = queryClient.getQueryData(['memories']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['memories'], (old: Memory[] | undefined) => {
        const optimisticMemory: Memory = {
          id: `temp-${Date.now()}`,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
          isDraft: false,
          tags: [],
          photos: [],
          ...newMemoryData
        };
        return [optimisticMemory, ...(old || [])];
      });
      
      // Return context with snapshotted value
      return { previousMemories };
    },
    onError: (err, newMemoryData, context) => {
      // Rollback to previous value on error
      if (context?.previousMemories) {
        queryClient.setQueryData(['memories'], context.previousMemories);
      }
    },
    onSettled: () => {
      // Sync with server once mutation settles
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => API.updateMemory(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['memories'] });
      const previousMemories = queryClient.getQueryData(['memories']);
      
      queryClient.setQueryData(['memories'], (old: Memory[] | undefined) => {
        if (!old) return old;
        return old.map(m => m.id === id ? { ...m, ...payload } : m);
      });
      
      return { previousMemories };
    },
    onError: (err, variables, context) => {
      if (context?.previousMemories) {
        queryClient.setQueryData(['memories'], context.previousMemories);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    }
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => API.deleteMemory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['memories'] });
      const previousMemories = queryClient.getQueryData(['memories']);
      
      queryClient.setQueryData(['memories'], (old: Memory[] | undefined) => {
        if (!old) return old;
        return old.filter(m => m.id !== id);
      });
      
      return { previousMemories };
    },
    onError: (err, id, context) => {
      if (context?.previousMemories) {
        queryClient.setQueryData(['memories'], context.previousMemories);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    }
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => API.toggleFavorite(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['memories'] });
      const previousMemories = queryClient.getQueryData(['memories']);
      
      queryClient.setQueryData(['memories'], (old: Memory[] | undefined) => {
        if (!old) return old;
        return old.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m);
      });
      
      return { previousMemories };
    },
    onError: (err, id, context) => {
      if (context?.previousMemories) {
        queryClient.setQueryData(['memories'], context.previousMemories);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    }
  });
}

// Reminders Mutations
export function useAddReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: any) => API.createReminder(payload),
    onMutate: async (newReminder) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previousReminders = queryClient.getQueryData(['reminders']);
      
      queryClient.setQueryData(['reminders'], (old: Reminder[] | undefined) => {
        const optimisticReminder: Reminder = {
          id: `temp-${Date.now()}`,
          isActive: true,
          createdAt: new Date().toISOString(),
          ...newReminder
        };
        return [...(old || []), optimisticReminder];
      });
      
      return { previousReminders };
    },
    onError: (err, newReminder, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => API.updateReminder(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previousReminders = queryClient.getQueryData(['reminders']);
      
      queryClient.setQueryData(['reminders'], (old: Reminder[] | undefined) => {
        if (!old) return old;
        return old.map(r => r.id === id ? { ...r, ...payload } : r);
      });
      
      return { previousReminders };
    },
    onError: (err, variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => API.deleteReminder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previousReminders = queryClient.getQueryData(['reminders']);
      
      queryClient.setQueryData(['reminders'], (old: Reminder[] | undefined) => {
        if (!old) return old;
        return old.filter(r => r.id !== id);
      });
      
      return { previousReminders };
    },
    onError: (err, id, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: any) => API.updateSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previousSettings = queryClient.getQueryData(['settings']);
      
      queryClient.setQueryData(['settings'], (old: any) => ({
        ...old,
        ...payload
      }));
      
      return { previousSettings };
    },
    onError: (err, variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
}
