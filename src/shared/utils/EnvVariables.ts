// Really this is Window | ServiceWorkerGlobalScope but Typescript complains about dynamic keys
declare const self: Record<string, unknown>;

const getEnvVariable = (key: string, defaultValue?: string | boolean) => {
  return typeof self[key] === 'undefined' ? defaultValue : self[key];
};

export const EnvVariables = {
  // strings
  API_TYPE: () => getEnvVariable('__API_TYPE__', 'production'),
  API_ORIGIN: () => getEnvVariable('__API_ORIGIN__', 'localhost'),
  BUILD_TYPE: () => getEnvVariable('__BUILD_TYPE__', 'production'),
  BUILD_ORIGIN: () => getEnvVariable('__BUILD_ORIGIN__'),
  VERSION: () => getEnvVariable('__VERSION__'),

  // booleans
  IS_HTTPS: () => getEnvVariable('__IS_HTTPS__', true),
  LOGGING: () => getEnvVariable('__LOGGING__', false),
  NO_DEV_PORT: () => getEnvVariable('__NO_DEV_PORT__', true),
};
