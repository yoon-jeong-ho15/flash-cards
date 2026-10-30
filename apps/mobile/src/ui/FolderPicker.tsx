import React from 'react';
import { Text } from 'react-native';
import { useStore } from '../platform/runtime';
import { Button, Sheet, s } from './kit';
export function FolderPicker({ value, onSelect, onClose }: { value: string | null; onSelect: (id: string | null) => void; onClose: () => void }) {
  const { folders } = useStore();
  return <Sheet title="폴더 선택" onClose={onClose}><Text style={s.muted}>덱을 보관할 폴더를 선택하세요.</Text>
    <Button title="미분류" icon={value === null ? 'check' : 'folder'} tone="secondary" onPress={() => onSelect(null)} />
    {folders.map(folder => <Button key={folder.id} title={folder.title} icon={value === folder.id ? 'check' : 'folder'} tone="secondary" onPress={() => onSelect(folder.id)} />)}
  </Sheet>;
}
