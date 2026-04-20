import { useRef, useState } from 'react';
import type { ContextMenuState } from '@/types';
import type { SelectedShortcutState } from './types';

export function useShortcutUiState() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [shortcutEditOpen, setShortcutEditOpen] = useState(false);
  const [shortcutModalMode, setShortcutModalMode] = useState<'add' | 'edit'>('add');
  const [shortcutDeleteOpen, setShortcutDeleteOpen] = useState(false);
  const [scenarioModeOpen, setScenarioModeOpen] = useState(false);
  const [scenarioCreateOpen, setScenarioCreateOpen] = useState(false);
  const [scenarioEditOpen, setScenarioEditOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<SelectedShortcutState>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [currentEditScenarioId, setCurrentEditScenarioId] = useState('');
  const [currentInsertIndex, setCurrentInsertIndex] = useState<number | null>(null);

  return {
    contextMenu,
    setContextMenu,
    contextMenuRef,
    shortcutEditOpen,
    setShortcutEditOpen,
    shortcutModalMode,
    setShortcutModalMode,
    shortcutDeleteOpen,
    setShortcutDeleteOpen,
    scenarioModeOpen,
    setScenarioModeOpen,
    scenarioCreateOpen,
    setScenarioCreateOpen,
    scenarioEditOpen,
    setScenarioEditOpen,
    selectedShortcut,
    setSelectedShortcut,
    editingTitle,
    setEditingTitle,
    editingUrl,
    setEditingUrl,
    currentEditScenarioId,
    setCurrentEditScenarioId,
    currentInsertIndex,
    setCurrentInsertIndex,
  };
}
