// Monorepo-aware Metro config: watch the repo root so hoisted dependencies
// resolve, and let Metro look up node_modules from both the app and the root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [appModules, path.resolve(workspaceRoot, 'node_modules')];
// Prefer the app's own copies of React / React Native to avoid duplicate-module
// errors when dependencies are hoisted to the workspace root.
config.resolver.disableHierarchicalLookup = false;

// Disable Watchman and use Metro's built-in file crawler. Watchman throws an
// unhandled "Operation not permitted" error on some macOS setups (missing Full
// Disk Access / TCC) which crashes the bundler instead of degrading gracefully.
// The node crawler is slightly slower but reliable and needs no system setup.
config.resolver.useWatchman = false;

// Force a SINGLE React across the bundle. In this npm-workspaces monorepo the
// root hoists React 18 (apps/web pins it), while this app needs React 19 for RN
// 0.81. Without this, `react-native` (hoisted to the root) resolves React 18
// while app code uses 19 — mismatched React internals crash at startup with
// "Cannot read property 'S'/'default' of undefined". Pin `react` and its
// subpaths (jsx-runtime, etc.) to this app's React 19 copy.
//
// Scope this to `react` ONLY: react-native ships its own correct nested
// `scheduler@0.26.0`, and forcing `scheduler`/`react-dom` here would wrongly
// redirect those to the root copies (0.23.2 / web's react-dom) and break RN.
const isForced = (name) => name === 'react' || name.startsWith('react/');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isForced(moduleName)) {
    try {
      return { type: 'sourceFile', filePath: require.resolve(moduleName, { paths: [appModules] }) };
    } catch {
      // Not present in the app's own node_modules — fall through to default.
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
