/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is necessary for the Next.js dev server to work correctly
  // inside a proxied environment like Google Cloud Shell.
  webpack: (config, { dev, isServer }) => {
    // The 'public' option is used to specify the URL that the browser
    // will use to connect to the dev server for HMR (hot-reloading).
    // process.env.CS_WEB_PREVIEW_HOST is a Cloud Shell-specific environment
    // variable that provides the correct public hostname.
    if (dev && !isServer && process.env.CS_WEB_PREVIEW_HOST) {
      config.devServer.public = `https://${process.env.CS_WEB_PREVIEW_HOST}`;
    }

    return config;
  },
};

module.exports = nextConfig;