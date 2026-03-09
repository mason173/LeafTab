import { readRoleSeedSnapshot } from './localProfileStorage';

const ROLE_PROFILE_FILES: Record<string, string> = {
  general: 'leaftab_backup_general.leaftab',
  programmer: 'leaftab_backup_Programmer.leaftab',
  product_manager: 'leaftab_backup_product_manager.leaftab',
  designer: 'leaftab_backup_designer.leaftab',
  student: 'leaftab_backup_student.leaftab',
  marketer: 'leaftab_backup_marketer.leaftab',
  finance: 'leaftab_backup_finance.leaftab',
  hr: 'leaftab_backup_hr.leaftab',
  admin: 'leaftab_backup_admin.leaftab',
};

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
  const roleSeed = readRoleSeedSnapshot();
  if (roleSeed) {
    return { profileData: roleSeed, role };
  }

  let profileData = defaultProfileData;
  const storedRoleFile = localStorage.getItem('role_profile_file');
  const normalizedRole = role ? role.toLowerCase() : '';
  const roleFile = storedRoleFile || ROLE_PROFILE_FILES[normalizedRole];
  if (roleFile) {
    try {
      const localizedFile = storedRoleFile
        ? roleFile
        : (language !== 'zh' && language !== 'zh-CN'
          ? roleFile.replace('.leaftab', '_en.leaftab')
          : roleFile);
      const response = await fetch(`./profiles/${localizedFile}`);
      const data = await response.json();
      if (data && data.type === 'leaftab_backup' && data.data) {
        profileData = data.data;
      }
    } catch {}
  }

  return { profileData, role };
};
