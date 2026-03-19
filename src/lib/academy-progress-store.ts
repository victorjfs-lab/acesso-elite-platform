const STORAGE_KEY = "course-platform-progress-v1";

type ProgressState = {
  completed: Record<string, Record<string, string[]>>;
  started: Record<string, Record<string, Record<string, string>>>;
};

function readState(): ProgressState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        completed: {},
        started: {},
      };
    }

    const parsed = JSON.parse(raw) as ProgressState;
    if (!parsed || typeof parsed !== "object") {
      return {
        completed: {},
        started: {},
      };
    }

    return {
      completed: parsed.completed ?? {},
      started: parsed.started ?? {},
    };
  } catch {
    return {
      completed: {},
      started: {},
    };
  }
}

function writeState(state: ProgressState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCompletedLessonIds(identityKey: string, courseId: string) {
  const state = readState();
  return state.completed[identityKey]?.[courseId] ?? [];
}

export function getStartedLessonMap(identityKey: string, courseId: string) {
  const state = readState();
  return state.started[identityKey]?.[courseId] ?? {};
}

export function markLessonAsCompleted(
  identityKey: string,
  courseId: string,
  lessonId: string,
) {
  const state = readState();
  const current = state.completed[identityKey]?.[courseId] ?? [];

  if (current.includes(lessonId)) {
    return current;
  }

  const next = [...current, lessonId];
  writeState({
    ...state,
    completed: {
      ...state.completed,
      [identityKey]: {
        ...(state.completed[identityKey] ?? {}),
        [courseId]: next,
      },
    },
  });

  return next;
}

export function getLessonStartedAt(
  identityKey: string,
  courseId: string,
  lessonId: string,
) {
  return getStartedLessonMap(identityKey, courseId)[lessonId] ?? null;
}

export function setLessonStartedAt(
  identityKey: string,
  courseId: string,
  lessonId: string,
  startedAt: string,
) {
  const state = readState();
  const current = state.started[identityKey]?.[courseId]?.[lessonId] ?? null;

  if (current === startedAt) {
    return startedAt;
  }

  writeState({
    ...state,
    started: {
      ...state.started,
      [identityKey]: {
        ...(state.started[identityKey] ?? {}),
        [courseId]: {
          ...(state.started[identityKey]?.[courseId] ?? {}),
          [lessonId]: startedAt,
        },
      },
    },
  });

  return startedAt;
}

export function ensureLessonStarted(
  identityKey: string,
  courseId: string,
  lessonId: string,
) {
  const state = readState();
  const existing = state.started[identityKey]?.[courseId]?.[lessonId] ?? null;

  if (existing) {
    return existing;
  }

  const startedAt = new Date().toISOString();
  return setLessonStartedAt(identityKey, courseId, lessonId, startedAt);
}
