/// <reference types="vite/client" />

/**
 * The version of the SDK in package.json (config.sdkVersion)
 */
declare const __VERSION__: string;

/**
 * Whether to log messages to the console
 */
declare const __LOGGING__: boolean;

declare const __IS_HTTPS__: boolean;

declare const __API_ORIGIN__: string;

/**
 * Which API environment to use (development, staging, production)
 */
declare const __API_TYPE__: string;

/**
 * Whether or not a dev port should be used
 */
declare const __NO_DEV_PORT__: boolean;

/**
 * Where to get static resources from
 */
declare const __BUILD_ORIGIN__: string;

/**
 * Which build environment to use (development, staging, production)
 */
declare const __BUILD_TYPE__: string;
