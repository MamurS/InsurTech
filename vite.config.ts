import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the browser
      'process.env': {
        API_KEY: env.API_KEY || '',
        SUPABASE_URL: env.SUPABASE_URL || '',
        SUPABASE_KEY: env.SUPABASE_KEY || '',
        NODE_ENV: JSON.stringify(mode)
      }
    }
  };
});