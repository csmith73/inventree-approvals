import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ApprovalsPanel',
      formats: ['es'],
      fileName: () => 'approvals_panel.js',
    },
    outDir: '../static',
    emptyOutDir: false,
    rollupOptions: {
      // Externalize dependencies that are provided by InvenTree
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mantine/core',
        '@mantine/hooks',
        '@mantine/notifications',
        '@tabler/icons-react',
        '@lingui/core',
        '@lingui/react',
      ],
      output: {
        // Global variable names for externalized dependencies
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          '@mantine/core': 'MantineCore',
          '@mantine/hooks': 'MantineHooks',
          '@mantine/notifications': 'MantineNotifications',
          '@tabler/icons-react': 'TablerIcons',
          '@lingui/core': 'LinguiCore',
          '@lingui/react': 'LinguiReact',
        },
      },
    },
    minify: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
