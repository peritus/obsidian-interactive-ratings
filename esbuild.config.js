const esbuild = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const banner = `/*
THIS FILE IS GENERATED - DO NOT EDIT DIRECTLY
Interactive Ratings Plugin for Obsidian (https://obsidian.md)
*/`;

// Check if watch flag is provided
const isWatch = process.argv.includes('--watch');

// Get logging configuration from environment variable
const loggingEnabled = process.env.LOGGING_ENABLED === 'true';
console.log(`Building with logging ${loggingEnabled ? 'ENABLED' : 'DISABLED'}`);

// Build configuration
const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  platform: 'browser',
  target: 'es2016',
  format: 'cjs',
  banner: { js: banner },
  define: {
    'process.env.LOGGING_ENABLED': JSON.stringify(loggingEnabled)
  },
  external: ['obsidian'],
  logLevel: 'info',
  minify: false,
  treeShaking: true,
};

// Function to copy the manifest and styles
function copyFiles() {
  // This would copy files if needed, but in this case manifest.json is already in the root
  console.log('Copying additional files...');
  
  fs.copyFileSync('styles.css', 'styles.css');
  console.log('Copied styles.css');
}

async function build() {
  try {
    if (isWatch) {
      // Watch mode
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
    } else {
      // Single build
      await esbuild.build(buildOptions);
      copyFiles();
      console.log('Build completed successfully!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();