import { readRoleSeedSnapshot } from './localProfileStorage';
import { loadRolePresetSnapshot } from './rolePresetRegistry';

type LoadRoleProfileDataParams = {
  roleId?: string | null;
  language: string;
  defaultProfileData: any;
};

export const loadRoleProfileDataForReset = async ({
  roleId,
  language,
  defaultProfileData,
}: LoadRoleProfileDataParams) => {
  const role = roleId || localStorage.getItem('role');
  let profileData = defaultProfileData;

  if (role) {
    try {
      const preset = await loadRolePresetSnapshot({
        roleId: role,
        language,
      });
      if (preset?.snapshot) {
        profileData = preset.snapshot;
        return { profileData, role };
      }
    } catch {}
  }

  const roleSeed = readRoleSeedSnapshot();
  if (roleSeed) {
    profileData = roleSeed;
  }

  return { profileData, role };
};
