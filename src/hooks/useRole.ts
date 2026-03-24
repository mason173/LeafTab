import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/ui/sonner';
import { ScenarioMode, ScenarioShortcuts } from '../types';
import { persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import {
  loadRolePresetSnapshot,
  ROLE_PRESET_VERSION_STORAGE_KEY,
} from '@/utils/rolePresetRegistry';

let confettiModulePromise: Promise<typeof import('canvas-confetti')> | null = null;

function loadConfettiModule() {
  if (!confettiModulePromise) {
    confettiModulePromise = import('canvas-confetti');
  }
  return confettiModulePromise;
}

export function useRole(
  user: string | null,
  setUserRole: (role: string | null) => void,
  setScenarioModes: (modes: ScenarioMode[]) => void,
  setSelectedScenarioId: (id: string) => void,
  setScenarioShortcuts: (shortcuts: ScenarioShortcuts) => void,
  localDirtyRef: React.MutableRefObject<boolean>,
  API_URL: string
) {
  const { t, i18n } = useTranslation();
  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);

  useEffect(() => {
    // Only show role selector if user hasn't selected a role yet
    const hasRole = localStorage.getItem('role');
    const hasVisited = localStorage.getItem('has_visited');
    
    if (!hasRole && !hasVisited) {
      setRoleSelectorOpen(true);
    } else {
      setRoleSelectorOpen(false);
    }
  }, []); // Run only once on mount

  const handleRoleSelect = useCallback(async (roleId: string) => {
    try {
      const preset = await loadRolePresetSnapshot({
        roleId,
        language: i18n.language,
      });
      if (!preset) {
        throw new Error(`Role preset not found: ${roleId}`);
      }

      const { snapshot, entry } = preset;
      if (snapshot.scenarioModes.length) {
        setScenarioModes(snapshot.scenarioModes);
      }
      if (snapshot.selectedScenarioId) {
        setSelectedScenarioId(snapshot.selectedScenarioId);
      }
      if (snapshot.scenarioShortcuts) {
        setScenarioShortcuts(snapshot.scenarioShortcuts);
        persistLocalProfileSnapshot(snapshot);
        localDirtyRef.current = true;
      }

      localStorage.setItem('has_visited', 'true');
      setUserRole(roleId);
      localStorage.setItem('role', roleId);
      localStorage.setItem(ROLE_PRESET_VERSION_STORAGE_KEY, String(entry.version));
      localStorage.removeItem('role_profile_file');

      if (user) {
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`${API_URL}/user/role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: roleId })
          }).catch(console.error);
        }
      }

      setRoleSelectorOpen(false);
      toast.success(t('settings.importSuccess'));

      void loadConfettiModule()
        .then(({ default: confetti }) => {
          const duration = 1500;
          const animationEnd = Date.now() + duration;
          const interval = window.setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
              window.clearInterval(interval);
              return;
            }
            confetti({
              particleCount: 5,
              angle: 270,
              spread: 55,
              origin: { x: Math.random(), y: -0.1 },
              zIndex: 9999,
              gravity: 1.2,
              startVelocity: 30,
              ticks: 200,
              colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
            });
          }, 50);
        })
        .catch(() => {});
    } catch (error) {
      console.error('Failed to load role profile:', error);
      toast.error(t('settings.importFailed'));
    }
  }, [API_URL, i18n.language, localDirtyRef, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, setUserRole, t, user]);

  return { roleSelectorOpen, setRoleSelectorOpen, handleRoleSelect };
}
