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

// Build configuration
const buildOptions = {
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  platform: 'browser',
  target: 'es2016',
  format: 'cjs',
  banner: { js: banner },
  external: ['obsidian'],
  logLevel: 'info',
  minify: process.env.NODE_ENV === 'production',
  treeShaking: true,
};

// Function to copy the manifest and styles
function copyFiles() {
  // This would copy files if needed, but in this case manifest.json is already in the root
  console.log('Copying additional files...');
  
  // Copy styles.css if it exists
  try {
    fs.copyFileSync('styles.css', 'styles.css');
    console.log('Copied styles.css');
  } catch (err) {
    // If it doesn't exist, that's fine
  }
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
