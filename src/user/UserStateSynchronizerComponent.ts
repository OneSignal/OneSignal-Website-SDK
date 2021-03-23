export interface UserStateSynchronizerComponent {
  onSession(): void;
  setTags(tags: {[key: string]: any}): void;
}
