import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    plugins: [mkcert()],
    define: {
      __API_ORIGIN__: JSON.stringify(process.env.API_ORIGIN),
      __API_TYPE__: JSON.stringify(process.env.API),
      __BUILD_ORIGIN__: JSON.stringify(process.env.BUILD_ORIGIN),
      __BUILD_TYPE__: JSON.stringify(mode),
      __IS_HTTPS__: JSON.stringify(true),
      __LOGGING__: JSON.stringify(isDev),
      __NO_DEV_PORT__: JSON.stringify(process.env.NO_DEV_PORT),
      __VERSION__: JSON.stringify(process.env.npm_package_config_sdkVersion),
    },
    server: {
      open: true,
      port: 4001,
      https: {
        cert: './certs/cert.pem',
        key: './certs/dev.pem',
      },
    },
  };
});
