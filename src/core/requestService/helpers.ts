import { type APIHeaders } from '../../shared/models/APIHeaders';
import Database from '../../shared/services/Database';

// TODO: Remove with web sdk refactor work
export async function getJWTHeader(): Promise<APIHeaders | undefined> {
  const jwtToken = await Database.getJWTToken();
  return !!jwtToken ? { Authorization: `Bearer ${jwtToken}` } : undefined;
}
