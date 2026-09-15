import { EventProducer } from 'src/shared/helpers/EventProducer';
import { getJwtTokens, setJwtTokens } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';

export type UserJwtInvalidatedEvent = { externalId: string };

/** SDK-internal: fires when a stored token changes through put or prune. */
export type JwtUpdatedListener = (externalId: string) => void;
/** Developer-facing: fires when the SDK removes a token because the server rejected it. */
export type UserJwtInvalidatedListener = (event: UserJwtInvalidatedEvent) => void;

/**
 * Multi-user map externalId -> JWT, persisted as one JSON object. Storage is
 * unconditional; use of the tokens is gated by IdentityVerificationService.
 *
 * Two listener audiences. Internal listeners fire on put-with-change and on
 * prune. The public invalidated listener fires on invalidate only, and only
 * for subscribers present at that time. Logout and user switch must not call
 * invalidate; the developer would read that as "refresh your token".
 */
export class JwtTokenStore {
  private _tokens?: Record<string, string>;
  private _updateListeners = new EventProducer<JwtUpdatedListener>();
  private _invalidatedListeners = new EventProducer<UserJwtInvalidatedListener>();

  _addInternalUpdateListener(listener: JwtUpdatedListener): void {
    this._updateListeners._subscribe(listener);
  }

  _removeInternalUpdateListener(listener: JwtUpdatedListener): void {
    this._updateListeners._unsubscribe(listener);
  }

  _addUserJwtInvalidatedListener(listener: UserJwtInvalidatedListener): void {
    this._invalidatedListeners._subscribe(listener);
  }

  _removeUserJwtInvalidatedListener(listener: UserJwtInvalidatedListener): void {
    this._invalidatedListeners._unsubscribe(listener);
  }

  _getJwt(externalId: string): string | undefined {
    return this._load()[externalId];
  }

  // A missing token is a no-op. Use _invalidateJwt to remove one.
  _putJwt(externalId: string, jwt: string | null | undefined): void {
    if (!jwt) return;
    const tokens = this._load();
    if (tokens[externalId] === jwt) return;
    tokens[externalId] = jwt;
    setJwtTokens(tokens);
    this._updateListeners._fire((l) => l(externalId));
  }

  _invalidateJwt(externalId: string): void {
    const tokens = this._load();
    if (!(externalId in tokens)) return;
    delete tokens[externalId];
    setJwtTokens(tokens);
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
    const removed = Object.keys(tokens).filter((id) => !keep.has(id));
    if (!removed.length) return;
    removed.forEach((id) => delete tokens[id]);
    setJwtTokens(tokens);
    removed.forEach((id) => this._updateListeners._fire((l) => l(id)));
  }

  private _load(): Record<string, string> {
    this._tokens ??= getJwtTokens();
    return this._tokens;
  }
}
