// Reference: OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/config/ConfigModel.kt
// The first retry backoff; it doubles per failure up to the max, then is jittered.
export const OP_REPO_BASE_FAIL_RETRY_BACKOFF = 5_000;
export const OP_REPO_MAX_FAIL_RETRY_BACKOFF = 300_000;
export const OP_REPO_MAX_RETRY_AFTER = 3_600_000;
export const OP_REPO_POST_CREATE_DELAY = 500;
export const OP_REPO_EXECUTION_INTERVAL = 500;
export const OP_REPO_POST_CREATE_RETRY_UP_TO = 15_000;
