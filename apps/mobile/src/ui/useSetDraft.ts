import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { hasContent } from "../core/content";
import type { Draft } from "../core/types";
import { store } from "../platform/runtime";
import { showError } from "./kit";

const fingerprint = (draft: Draft) => JSON.stringify({ ...draft, savedAt: 0 });
const hasDraftContent = (draft: Draft) =>
  draft.title.trim() || draft.description.trim() || draft.cards.some(hasContent);
const writeError = "임시 저장에 실패했습니다. 저장 공간을 확인해 주세요.";

export function useSetDraft(
  setId: string | undefined,
  folderId: string | undefined,
  createDraft: () => Draft,
) {
  const [key] = useState(() => store.draftKey(setId, folderId));
  const [draft, setDraft] = useState(createDraft);
  const [initial] = useState(() => fingerprint(draft));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [restore, setRestore] = useState<Draft | null>(null);
  const latest = useRef(draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Native events and promise callbacks need these flags before the next render.
  const lifecycle = useRef({
    active: false,
    ready: false,
    busy: false,
    stopped: false,
    discardedRestore: false,
    readId: 0,
  }).current;

  const change = (update: Partial<Draft> | ((current: Draft) => Partial<Draft>)) => {
    const previous = latest.current;
    const next = { ...previous, ...(typeof update === "function" ? update(previous) : update) };
    latest.current = next;
    if (lifecycle.discardedRestore && fingerprint(next) !== initial) {
      lifecycle.discardedRestore = false;
    }
    if (lifecycle.active) setDraft(next);
    return next;
  };

  const markReady = useCallback(() => {
    lifecycle.ready = true;
    lifecycle.readId++;
    setRestore(null);
    setReady(true);
  }, [lifecycle]);

  const read = useCallback(async () => {
    if (!lifecycle.active || lifecycle.ready) return;
    const readId = ++lifecycle.readId;
    try {
      const value = await store.readDraft(key);
      if (!lifecycle.active || readId !== lifecycle.readId) return;
      if (
        value &&
        Array.isArray(value.cards) &&
        value.cards.length &&
        hasDraftContent(value) &&
        fingerprint(value) !== initial
      ) {
        setRestore(value);
      } else {
        markReady();
      }
      setDraftError(null);
    } catch (error) {
      if (lifecycle.active && readId === lifecycle.readId) {
        setDraftError(`임시 저장본을 읽지 못했습니다. ${String(error)}`);
      }
    }
  }, [initial, key, lifecycle, markReady]);

  const write = useCallback(async () => {
    if (
      !lifecycle.ready ||
      lifecycle.stopped ||
      lifecycle.discardedRestore ||
      !hasDraftContent(latest.current)
    ) return;
    const value = { ...latest.current, savedAt: Date.now() };
    await store.writeDraft(key, value);
    if (lifecycle.active && !lifecycle.stopped) {
      setSavedAt(value.savedAt);
      setDraftError(null);
    }
  }, [key, lifecycle]);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const scheduleWrite = useCallback(() => {
    cancelTimer();
    if (!lifecycle.active || !lifecycle.ready || lifecycle.stopped || lifecycle.discardedRestore) return;
    const scheduled = setTimeout(() => {
      if (timer.current !== scheduled) return;
      timer.current = null;
      void write().catch(() => {
        if (lifecycle.active && !lifecycle.stopped) setDraftError(writeError);
      });
    }, 1000);
    timer.current = scheduled;
  }, [cancelTimer, lifecycle, write]);

  useEffect(() => {
    lifecycle.active = true;
    void read();
    const subscription = AppState.addEventListener("change", (status) => {
      if (lifecycle.active && status !== "active") void write().catch(() => {});
    });
    return () => {
      lifecycle.active = false;
      lifecycle.readId++;
      cancelTimer();
      subscription.remove();
      void write().catch(showError);
    };
  }, [cancelTimer, lifecycle, read, write]);

  useEffect(() => {
    scheduleWrite();
    return cancelTimer;
  }, [draft, ready, scheduleWrite, cancelTimer]);

  const run = async (action: () => Promise<void>) => {
    if (!lifecycle.active || lifecycle.busy || lifecycle.stopped) return;
    lifecycle.busy = true;
    setBusy(true);
    try {
      await action();
    } finally {
      lifecycle.busy = false;
      if (lifecycle.active) setBusy(false);
    }
  };

  const applyRestore = () => {
    if (!restore || !lifecycle.active || lifecycle.busy || lifecycle.ready) return false;
    change(restore);
    setSavedAt(restore.savedAt);
    markReady();
    return true;
  };

  const discardRestore = () => run(async () => {
    if (!restore || lifecycle.ready) return;
    await store.removeDraft(key);
    if (!lifecycle.active) return;
    lifecycle.discardedRestore = true;
    markReady();
  });

  const stopWrites = () => {
    // Store operations are serialized, so removal follows any write already queued.
    lifecycle.stopped = true;
    cancelTimer();
  };

  const discardAndLeave = (onClose: () => void) => run(async () => {
    stopWrites();
    try {
      await store.removeDraft(key);
    } catch (error) {
      lifecycle.stopped = false;
      scheduleWrite();
      throw error;
    }
    if (lifecycle.active) onClose();
  });

  const saveAndLeave = (flush: () => Promise<Draft>, onClose: () => void) => run(async () => {
    await flush();
    if (!lifecycle.active) return;
    await write();
    if (lifecycle.active) onClose();
  });

  const saveSet = (
    flush: () => Promise<Draft>,
    persist: (value: Draft) => Promise<string>,
    onSaved: (id: string) => void,
  ) => run(async () => {
    const value = await flush();
    if (!lifecycle.active) return;
    let id: string;
    try {
      id = await persist(value);
    } catch (error) {
      if (lifecycle.active) {
        await write().catch(() => {
          if (lifecycle.active) setDraftError(writeError);
        });
      }
      throw error;
    }
    stopWrites();
    try {
      await store.removeDraft(key);
    } catch {
      // The set is already durable; the user can discard a leftover draft later.
    }
    if (lifecycle.active) onSaved(id);
  });

  return {
    draft, change, ready, busy, savedAt, draftError, restore,
    dirty: initial !== fingerprint(draft),
    read, applyRestore, discardRestore, discardAndLeave, saveAndLeave, saveSet,
  };
}
