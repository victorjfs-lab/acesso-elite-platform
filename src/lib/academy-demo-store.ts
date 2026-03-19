import { demoSeedState } from "@/data/academyMock";

const STORAGE_KEY = "course-platform-demo-state";

export type DemoState = typeof demoSeedState;

function cloneSeedState(): DemoState {
  return JSON.parse(JSON.stringify(demoSeedState)) as DemoState;
}

export function readDemoState(): DemoState {
  if (typeof window === "undefined") {
    return cloneSeedState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const initial = cloneSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as DemoState;
    return {
      ...cloneSeedState(),
      ...parsed,
    };
  } catch {
    const fallback = cloneSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

export function writeDemoState(state: DemoState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateDemoState(updater: (current: DemoState) => DemoState) {
  const nextState = updater(readDemoState());
  writeDemoState(nextState);
  return nextState;
}
