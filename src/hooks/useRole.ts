import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/ui/sonner';
import confetti from 'canvas-confetti';
import { ScenarioMode, ScenarioShortcuts } from '../types';
import { persistLocalProfileSnapshot, persistRoleSeedSnapshot } from '@/utils/localProfileStorage';

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

  const handleRoleSelect = useCallback(async (roleFile: string, roleId: string) => {
    try {
      const response = await fetch(`./profiles/${roleFile}`);
      const data = await response.json();
      
      if (data && data.type === 'leaftab_backup' && data.data) {
        const snapshot = {
          scenarioModes: Array.isArray(data.data.scenarioModes) ? data.data.scenarioModes : [],
          selectedScenarioId: typeof data.data.selectedScenarioId === 'string' ? data.data.selectedScenarioId : '',
          scenarioShortcuts: data.data.scenarioShortcuts || {},
        };
        if (snapshot.scenarioModes.length) {
          setScenarioModes(snapshot.scenarioModes);
        }
        if (snapshot.selectedScenarioId) {
          setSelectedScenarioId(snapshot.selectedScenarioId);
        }
        if (snapshot.scenarioShortcuts) {
          setScenarioShortcuts(snapshot.scenarioShortcuts);
          persistLocalProfileSnapshot(snapshot);
          persistRoleSeedSnapshot(snapshot);
          localDirtyRef.current = true;
        }

        localStorage.setItem('has_visited', 'true');
        setUserRole(roleId);
        localStorage.setItem('role', roleId);
        localStorage.setItem('role_profile_file', roleFile);
        
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
        
        const duration = 1500;
        const animationEnd = Date.now() + duration;
        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          confetti({
            particleCount: 5,
            angle: 270,
            spread: 55, 
            origin: { x: Math.random(), y: -0.1 },
            zIndex: 9999,
            gravity: 1.2,
            startVelocity: 30,
            ticks: 200,
            colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
          });
        }, 50);
      }
    } catch (error) {
      console.error('Failed to load role profile:', error);
      toast.error(t('settings.importFailed'));
    }
  }, [user, setUserRole, setScenarioModes, setSelectedScenarioId, setScenarioShortcuts, localDirtyRef, API_URL, t]);

  return { roleSelectorOpen, setRoleSelectorOpen, handleRoleSelect };
}
