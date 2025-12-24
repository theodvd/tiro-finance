import { useState, useEffect, useCallback } from 'react';

export type DecisionStatus = 'new' | 'ignored' | 'treated';

interface DecisionStatusEntry {
  status: DecisionStatus;
  updated_at: string;
}

interface DecisionStatusMap {
  [decisionId: string]: DecisionStatusEntry;
}

const STORAGE_KEY = 'decision_status_v1';

function loadFromStorage(): DecisionStatusMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading decision status from localStorage:', error);
  }
  return {};
}

function saveToStorage(data: DecisionStatusMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving decision status to localStorage:', error);
  }
}

export function useDecisionStatus() {
  const [statusMap, setStatusMap] = useState<DecisionStatusMap>(loadFromStorage);

  // Sync with localStorage on changes
  useEffect(() => {
    saveToStorage(statusMap);
  }, [statusMap]);

  const getStatus = useCallback((decisionId: string): DecisionStatus => {
    return statusMap[decisionId]?.status || 'new';
  }, [statusMap]);

  const setStatus = useCallback((decisionId: string, status: DecisionStatus) => {
    setStatusMap(prev => ({
      ...prev,
      [decisionId]: {
        status,
        updated_at: new Date().toISOString(),
      },
    }));
  }, []);

  const markAsTreated = useCallback((decisionId: string) => {
    setStatus(decisionId, 'treated');
  }, [setStatus]);

  const markAsIgnored = useCallback((decisionId: string) => {
    setStatus(decisionId, 'ignored');
  }, [setStatus]);

  const resetStatus = useCallback((decisionId: string) => {
    setStatusMap(prev => {
      const newMap = { ...prev };
      delete newMap[decisionId];
      return newMap;
    });
  }, []);

  const resetAll = useCallback(() => {
    setStatusMap({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    statusMap,
    getStatus,
    setStatus,
    markAsTreated,
    markAsIgnored,
    resetStatus,
    resetAll,
  };
}
