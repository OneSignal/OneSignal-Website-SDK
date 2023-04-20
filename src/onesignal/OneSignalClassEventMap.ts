import { UserJwtExpiredEvent } from "../page/models/UserJwtExpiredEvent";

/**
 * This is a map of public API OneSignal class-level events to their respective event handlers.
 */
export default interface OneSignalClassEventMap {
  'jwtExpired': (event: UserJwtExpiredEvent) => void;
}
