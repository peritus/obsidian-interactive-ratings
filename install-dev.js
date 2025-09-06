#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getVCSChangeId() {
    try {
        // Try Jujutsu first
        try {
            // Try current working copy @
            let changeId = execSync('jj log -r @ --no-graph -T change_id', { encoding: 'utf8' }).trim();
            
            // If working copy is empty, try parent revision @-
            if (!changeId || changeId === '' || changeId.includes('(empty)')) {
                changeId = execSync('jj log -r @- --no-graph -T change_id', { encoding: 'utf8' }).trim();
            }
            
            return changeId;
        } catch (jjError) {
            // Fall back to Git
            const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
            return gitHash;
        }
    } catch (error) {
        console.error('Warning: Could not get VCS change ID:', error.message);
        return 'unknown';
    }
}

function getLatestCommitMessage() {
    try {
        // Try Jujutsu first
        try {
            // Try current working copy @
            let message = execSync('jj log -r @ --no-graph -T description', { encoding: 'utf8' }).trim();
            
            // If working copy is empty, try parent revision @-
            if (!message || message === '' || message.includes('(empty)')) {
                message = execSync('jj log -r @- --no-graph -T description', { encoding: 'utf8' }).trim();
            }
            
            const firstLine = message.split('\n')[0];
            return firstLine;
        } catch (jjError) {
            // Fall back to Git
            const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
            const firstLine = message.split('\n')[0];
            return firstLine;
        }
    } catch (error) {
        console.error('Warning: Could not get commit message:', error.message);
        return 'Development build';
    }
}

function generateDevManifest() {
    try {
        // Read the original manifest
        const manifestPath = path.join(__dirname, 'manifest.json');
        const originalManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Get VCS info
        const changeId = getVCSChangeId();
        const commitMessage = getLatestCommitMessage();
        
        // Create dev version of manifest
        const devManifest = {
            ...originalManifest,
            id: `${originalManifest.id}-dev`,
            name: `${originalManifest.name} (Dev)`,
            version: `${originalManifest.version}-dev-${changeId.substring(0, 8)}`,
            description: `${commitMessage} [dev-${changeId.substring(0, 8)}]`
        };
        
        // Return JSON string when used as module, output to stdout when run directly
        const jsonString = JSON.stringify(devManifest, null, 2);
        
        if (require.main === module && process.argv.includes('--preview')) {
            console.log(jsonString);
            process.exit(0);
        }
        
        return jsonString;
        
    } catch (error) {
        console.error('Error generating dev manifest:', error.message);
        process.exit(1);
    }
}

function buildAndInstall() {
    try {
        // Check if VAULT_PATH is provided
        const vaultPath = process.env.VAULT_PATH;
        if (!vaultPath) {
            console.error('Usage: VAULT_PATH="/path/to/vault" npm run build-and-install');
            process.exit(1);
        }

        console.log('📄 Generating dev manifest...');
        const devManifestContent = generateDevManifest();
        
        // Read original manifest to get plugin ID
        const originalManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
        const pluginId = originalManifest.id;
        
        // Create plugin directory path
        const pluginDir = path.join(vaultPath, '.obsidian', 'plugins', pluginId);
        
        console.log('📁 Creating plugin directory...');
        fs.mkdirSync(pluginDir, { recursive: true });
        
        console.log('📋 Copying plugin files...');
        // Copy main files
        const filesToCopy = ['main.js', 'styles.css'];
        for (const file of filesToCopy) {
            if (fs.existsSync(file)) {
                fs.copyFileSync(file, path.join(pluginDir, file));
                console.log(`   ✓ Copied ${file}`);
            }
        }
        
        // Write dev manifest
        fs.writeFileSync(path.join(pluginDir, 'manifest.json'), devManifestContent);
        console.log('   ✓ Copied dev manifest.json');
        
        console.log('✅ Installed dev build successfully!');
        console.log(`   Plugin directory: ${pluginDir}`);
        
    } catch (error) {
        console.error('❌ Build and install failed:', error.message);
        process.exit(1);
    }
}

// Handle command line arguments
if (require.main === module) {
    if (process.argv.includes('--preview')) {
        generateDevManifest();
    } else {
        buildAndInstall();
    }
}

module.exports = { buildAndInstall, generateDevManifest, getVCSChangeId, getLatestCommitMessage };
