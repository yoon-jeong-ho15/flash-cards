import React from "react";
import { useStore } from "../platform/runtime";
import { Button, Sheet } from "./kit";
export function FolderPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const { folders } = useStore();
  return (
    <Sheet title="폴더 선택" onClose={onClose}>
      <Button
        title="미분류"
        icon={value === null ? "check" : "folder"}
        tone="secondary"
        onPress={() => onSelect(null)}
      />
      {folders.map((folder) => (
        <Button
          key={folder.id}
          title={folder.title}
          icon={value === folder.id ? "check" : "folder"}
          tone="secondary"
          onPress={() => onSelect(folder.id)}
        />
      ))}
    </Sheet>
  );
}
