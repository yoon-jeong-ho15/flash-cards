import React, { useState } from 'react';
import { store, useStore } from '../platform/runtime';
import { Button, Field, Sheet, showError } from './kit';
export function FolderForm({ id, onClose, onSaved }: { id?: string; onClose: () => void; onSaved: (id: string) => void }) {
  const original = useStore().folders.find(f => f.id === id);
  const [title, setTitle] = useState(original?.title || '');
  const [description, setDescription] = useState(original?.description || '');
  const [busy, setBusy] = useState(false);
  return <Sheet title={id ? '폴더 수정' : '새 폴더'} onClose={onClose}>
    <Field label="폴더 제목" value={title} onChangeText={setTitle} autoFocus maxLength={200} />
    <Field label="설명" value={description} onChangeText={setDescription} multiline />
    <Button title="저장" busy={busy} onPress={() => { setBusy(true); void store.saveFolder(id, title, description).then(onSaved).catch(showError).finally(() => setBusy(false)); }} />
  </Sheet>;
}
