import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use '/' as the base to generate absolute paths from the domain root.
  // This ensures assets load correctly regardless of the URL path.
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three':     ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-spline':    ['@splinetool/react-spline', '@splinetool/runtime'],
          'vendor-mediapipe': ['@mediapipe/tasks-vision'],
          'vendor-react':     ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':     ['@tanstack/react-query'],
        },
      },
    },
  },
});
