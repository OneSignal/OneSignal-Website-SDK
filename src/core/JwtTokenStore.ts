import type { UserJwtInvalidatedEvent } from 'src/page/models/UserJwtInvalidatedEvent';
import { EventProducer } from 'src/shared/helpers/EventProducer';
import { getJwtTokens, setJwtTokens } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';

/** SDK-internal: fires when a stored token changes through put or prune. */
export type JwtUpdatedListener = (externalId: string) => void;
/** Developer-facing: fires when the SDK removes a token because the server rejected it. */
export type UserJwtInvalidatedListener = (event: UserJwtInvalidatedEvent) => void;

/**
 * Multi-user map externalId -> JWT, persisted as one JSON object. Storage is
 * unconditional; use of the tokens is gated by the identityVerification gates.
 *
 * Two listener audiences. Update listeners are SDK-internal and fire on
 * put-with-change and on prune. The public invalidated listener fires on invalidate only, and only
 * for subscribers present at that time. Logout and user switch must not call
 * invalidate; the developer would read that as "refresh your token".
 */
export class JwtTokenStore {
  private _tokens?: Map<string, string>;
  private _updateListeners = new EventProducer<JwtUpdatedListener>();
  private _invalidatedListeners = new EventProducer<UserJwtInvalidatedListener>();

  _addUpdateListener(listener: JwtUpdatedListener): void {
    this._updateListeners._subscribe(listener);
  }

  _removeUpdateListener(listener: JwtUpdatedListener): void {
    this._updateListeners._unsubscribe(listener);
  }

  _addUserJwtInvalidatedListener(listener: UserJwtInvalidatedListener): void {
    this._invalidatedListeners._subscribe(listener);
  }

  _removeUserJwtInvalidatedListener(listener: UserJwtInvalidatedListener): void {
    this._invalidatedListeners._unsubscribe(listener);
  }

  _getJwt(externalId: string): string | undefined {
    return this._load().get(externalId);
  }

  // A missing token is a no-op. Use _invalidateJwt to remove one.
  _putJwt(externalId: string, jwt: string | null | undefined): void {
    if (!jwt) return;
    const tokens = this._load();
    if (tokens.get(externalId) === jwt) return;
    tokens.set(externalId, jwt);
    this._persist(tokens);
    this._updateListeners._fire((l) => l(externalId));
  }

  _invalidateJwt(externalId: string): void {
    const tokens = this._load();
    if (!tokens.delete(externalId)) return;
    this._persist(tokens);
    // Per-listener try/catch so one throwing listener cannot break the others
    // or propagate into the operation queue and drop the failing operation.
    this._invalidatedListeners._fire((l) => {
      try {
        l({ externalId });
      } catch (e) {
        Log._warn(`JwtTokenStore: invalidated listener threw for externalId=${externalId}`, e);
      }
    });
  }

  // Drops tokens for users not in activeIds. Call on cold start to bound growth.
  _pruneToExternalIds(activeIds: Iterable<string>): void {
    const keep = new Set(activeIds);
    const tokens = this._load();
    const removed = [...tokens.keys()].filter((id) => !keep.has(id));
    if (!removed.length) return;
    removed.forEach((id) => tokens.delete(id));
    this._persist(tokens);
    removed.forEach((id) => this._updateListeners._fire((l) => l(id)));
  }

  // A Map so externalIds like "constructor" or "__proto__" cannot collide with
  // Object.prototype. Object.entries reads own keys only, so the parsed JSON is safe.
  private _load(): Map<string, string> {
    this._tokens ??= new Map(Object.entries(getJwtTokens()));
    return this._tokens;
  }

  // The in-memory map stays authoritative for this session if the write fails
  // (quota, restricted profile), so login does not reject and the token is
  // still usable until the next page load.
  private _persist(tokens: Map<string, string>): void {
    try {
      setJwtTokens(Object.fromEntries(tokens));
    } catch (e) {
      Log._warn('JwtTokenStore: failed to persist tokens', e);
    }
  }
}
