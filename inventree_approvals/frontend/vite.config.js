import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteExternalsPlugin } from 'vite-plugin-externals';
import { resolve } from 'path';
/**
 * The following libraries are externalized to avoid bundling them with the plugin.
 * These libraries are expected to be provided by the InvenTree core application.
 */
export var externalLibs = {
    react: 'React',
    'react-dom': 'ReactDOM',
    'ReactDom': 'ReactDOM',
    '@lingui/core': 'LinguiCore',
    '@lingui/react': 'LinguiReact',
    '@mantine/core': 'MantineCore',
    '@mantine/hooks': 'MantineHooks',
    '@mantine/notifications': 'MantineNotifications',
    '@tabler/icons-react': 'TablerIconsReact',
};
// Just the keys of the externalLibs object
var externalKeys = Object.keys(externalLibs);
/**
 * Vite config to build the frontend plugin as an exported module.
 * This will be distributed in the 'static' directory of the plugin.
 */
export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'classic',
            babel: {
                plugins: ['macros'],
            },
        }),
        viteExternalsPlugin(externalLibs),
    ],
    esbuild: {
        jsx: 'preserve',
    },
    build: {
        target: 'esnext',
        cssCodeSplit: false,
        manifest: true,
        sourcemap: true,
        rollupOptions: {
            preserveEntrySignatures: 'exports-only',
            input: ['./src/index.tsx'],
            output: {
                dir: '../static',
                entryFileNames: 'approvals_panel.js',
                assetFileNames: 'assets/[name].[ext]',
                globals: externalLibs,
            },
            external: externalKeys,
        },
    },
    optimizeDeps: {
        exclude: externalKeys,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
});
