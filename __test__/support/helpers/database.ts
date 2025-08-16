import { db } from 'src/shared/database/client';

export const setIsPushEnabled = async (isPushEnabled: boolean) => {
  await db.put('Options', { key: 'isPushEnabled', value: isPushEnabled });
};
