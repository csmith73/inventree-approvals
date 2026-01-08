/**
 * The following libraries are externalized to avoid bundling them with the plugin.
 * These libraries are expected to be provided by the InvenTree core application.
 *
 * IMPORTANT: Only include libraries that InvenTree actually exposes as globals.
 * Other libraries (like @tabler/icons-react, @mantine/hooks) must be bundled.
 */
export declare const externalLibs: Record<string, string>;
/**
 * Vite config to build the frontend plugin as an exported module.
 * This will be distributed in the 'static' directory of the plugin.
 */
declare const _default: import("vite").UserConfig;
export default _default;
