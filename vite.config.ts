/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules/react')) return 'react-vendor';
          if (id.includes('node_modules/@supabase')) return 'supabase-vendor';
          if (id.includes('node_modules/lucide-react')) return 'ui-vendor';
          if (id.includes('node_modules/@vercel')) return 'vercel-vendor';
          // Component chunks for code splitting
          if (id.includes('PrayerPresentation') || id.includes('MobilePresentation')) return 'presentation';
          if (id.includes('AdminPortal')) return 'admin-portal';
          if (id.includes('AdminLogin')) return 'admin-login';
          if (id.includes('AdminUserManagement') || id.includes('EmailSettings') || id.includes('EmailSubscribers') || id.includes('EmailTemplatesManager')) return 'admin-email';
          if (id.includes('PrayerTypesManager') || id.includes('PromptManager') || id.includes('BackupStatus')) return 'admin-management';
        }
      }
    },
    chunkSizeWarningLimit: 500,
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      output: {
        comments: false,
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3, // More aggressive compression
      },
    } as any,
    // Target modern browsers for smaller output
    target: 'esnext',
    // Enable source maps only for production debugging
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.config.{js,ts}',
        '**/dist/**',
      ]
    }
  }
})
