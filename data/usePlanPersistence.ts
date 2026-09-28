import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category, Habit, Task } from '../types';
import { PlanRepository } from './planRepository';
import { readLegacySnapshot, type PlanSnapshot } from './planSnapshot';

export interface PlanStateSetters {
  setCategories(value: Record<string, Category>): void;
  setTasks(value: Task[]): void;
  setHabits(value: Habit[]): void;
  setUserName(value: string): void;
}

const mirrorLegacySnapshot = (snapshot: PlanSnapshot) => {
  localStorage.setItem('planflow_categories', JSON.stringify(snapshot.categories));
  localStorage.setItem('planflow_tasks', JSON.stringify(snapshot.tasks));
  localStorage.setItem('planflow_habits', JSON.stringify(snapshot.habits));
  localStorage.setItem('planflow_username', snapshot.username);
};

export function usePlanPersistence(snapshot: PlanSnapshot, setters: PlanStateSetters) {
  const repositoryRef = useRef<PlanRepository | null>(null);
  const settersRef = useRef(setters);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  settersRef.current = setters;
  if (!repositoryRef.current) repositoryRef.current = new PlanRepository();

  const applySnapshot = useCallback((next: PlanSnapshot) => {
    const target = settersRef.current;
    target.setCategories(next.categories);
    target.setTasks(next.tasks);
    target.setHabits(next.habits);
    target.setUserName(next.username);
  }, []);

  useEffect(() => {
    let active = true;
    repositoryRef.current!.load()
      .then(loaded => {
        if (!active) return;
        applySnapshot(loaded);
        setReady(true);
      })
      .catch(reason => {
        if (!active) return;
        const fallback = readLegacySnapshot(localStorage);
        applySnapshot(fallback);
        setError(reason instanceof Error ? reason.message : '无法读取本地数据');
        setReady(true);
      });
    return () => { active = false; };
  }, [applySnapshot]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      repositoryRef.current!.save(snapshot)
        .then(() => {
          mirrorLegacySnapshot(snapshot);
          setError(null);
        })
        .catch(reason => setError(reason instanceof Error ? reason.message : '无法保存本地数据'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [ready, snapshot]);

  const importSnapshot = useCallback(async (next: PlanSnapshot) => {
    await repositoryRef.current!.save(next);
    mirrorLegacySnapshot(next);
    applySnapshot(next);
    setError(null);
  }, [applySnapshot]);

  const resetData = useCallback(async () => {
    await repositoryRef.current!.clear();
    window.location.reload();
  }, []);

  return { ready, error, importSnapshot, resetData };
}
