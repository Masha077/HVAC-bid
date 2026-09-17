import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// PORT is only needed for the dev server, not for production builds.
// Vercel handles serving the built output on its own port.
const rawPort = process.env.PORT || '5173';
const port = Number(rawPort) || 5173;
const basePath = process.env.BASE_PATH || '/';

export default defineConfig(async () => {
  // Replit-specific plugins: only loaded in Replit dev environment.
  // Never loaded during Vercel production builds.
  const isReplitEnv =
    process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined;

  const replitPlugins = isReplitEnv
    ? await Promise.all([
        import('@replit/vite-plugin-cartographer').then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, '..'),
          })
        ),
        import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
      ])
    : [];

  // Runtime error overlay: only in local/Replit development, not Vercel
  const devPlugins =
    process.env.NODE_ENV !== 'production'
      ? [(await import('@replit/vite-plugin-runtime-error-modal')).default()]
      : [];

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...devPlugins,
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: [
        '.serveousercontent.com',
        '.serveo.net',
        '.lhr.life',
        '.loca.lt',
        '.trycloudflare.com',
        'all',
      ],
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
