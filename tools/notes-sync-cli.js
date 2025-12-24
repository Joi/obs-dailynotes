#!/usr/bin/env node
/**
 * Notes.app ↔ Obsidian Sync CLI
 *
 * Commands:
 *   init     - Initialize sync (creates folders, sets up state)
 *   sync     - Full bidirectional sync
 *   pull     - Pull from Notes.app to Obsidian only
 *   push     - Push from Obsidian to Notes.app only
 *   status   - Show sync status
 */

const { NotesSync } = require('../lib/notes-sync');

const command = process.argv[2] || 'sync';
const sync = new NotesSync();

function formatResults(results, direction) {
  const lines = [];

  if (results.created.length > 0) {
    lines.push(`  ✅ Created: ${results.created.length}`);
    results.created.forEach(f => lines.push(`     • ${f}`));
  }

  if (results.updated.length > 0) {
    lines.push(`  📝 Updated: ${results.updated.length}`);
    results.updated.forEach(f => lines.push(`     • ${f}`));
  }

  if (results.deleted.length > 0) {
    lines.push(`  🗑️  Deleted: ${results.deleted.length}`);
    results.deleted.forEach(f => lines.push(`     • ${f}`));
  }

  if (results.unchanged.length > 0) {
    lines.push(`  ⏸️  Unchanged: ${results.unchanged.length}`);
  }

  if (results.errors.length > 0) {
    lines.push(`  ❌ Errors: ${results.errors.length}`);
    results.errors.forEach(e => {
      const name = e.file || e.name || e.noteId;
      lines.push(`     • ${name}: ${e.error}`);
    });
  }

  return lines.join('\n');
}

try {
  switch (command) {
    case 'init': {
      console.log('🔧 Initializing Notes.app ↔ Obsidian sync...\n');
      const result = sync.initialize();
      console.log(`  📁 Obsidian folder: ${result.obsidianDir}`);
      console.log(`  📝 Notes.app folder: "${result.notesFolder}"`);
      console.log(`  📅 Enabled since: ${result.enabledSince.toLocaleString()}`);
      console.log('\n✅ Sync initialized! Add notes to the "Obsidian Sync" folder in Notes.app to start syncing.');
      break;
    }

    case 'sync': {
      console.log('🔄 Running bidirectional sync...\n');
      const results = sync.sync();

      console.log('📥 Pull (Notes.app → Obsidian):');
      console.log(formatResults(results.pull, 'pull'));

      console.log('\n📤 Push (Obsidian → Notes.app):');
      console.log(formatResults(results.push, 'push'));

      console.log('\n📊 Summary:');
      console.log(`  • Created: ${results.summary.totalCreated}`);
      console.log(`  • Updated: ${results.summary.totalUpdated}`);
      console.log(`  • Deleted: ${results.summary.totalDeleted}`);
      if (results.summary.totalErrors > 0) {
        console.log(`  • Errors: ${results.summary.totalErrors}`);
      }
      console.log('\n✅ Sync complete!');
      break;
    }

    case 'pull': {
      console.log('📥 Pulling from Notes.app to Obsidian...\n');
      sync.initialize();
      const results = sync.pullFromNotes();
      console.log(formatResults(results, 'pull'));
      console.log('\n✅ Pull complete!');
      break;
    }

    case 'push': {
      console.log('📤 Pushing from Obsidian to Notes.app...\n');
      sync.initialize();
      const results = sync.pushToNotes();
      console.log(formatResults(results, 'push'));
      console.log('\n✅ Push complete!');
      break;
    }

    case 'status': {
      console.log('📊 Notes.app ↔ Obsidian Sync Status\n');
      const status = sync.getStatus();
      console.log(`  📅 Enabled since: ${new Date(status.enabledSince).toLocaleString()}`);
      console.log(`  📁 Obsidian folder: ${status.obsidianSyncDir}`);
      console.log(`  📝 Notes.app folder: "${status.notesFolderName}"`);
      console.log(`  🔗 Tracked notes: ${status.trackedNotes}`);
      console.log(`  📋 Notes in sync folder: ${status.notesInSyncFolder}`);
      break;
    }

    case 'help':
    case '--help':
    case '-h': {
      console.log(`
Notes.app ↔ Obsidian Sync CLI

Usage: notes-sync [command]

Commands:
  init     Initialize sync (creates folders, sets up state)
  sync     Full bidirectional sync (default)
  pull     Pull from Notes.app to Obsidian only
  push     Push from Obsidian to Notes.app only
  status   Show sync status
  help     Show this help message

How it works:
  1. Create an "Obsidian Sync" folder in Notes.app
  2. Run 'notes-sync init' to set up
  3. Add notes to that folder in Notes.app
  4. Run 'notes-sync sync' to sync them to ~/switchboard/notes-sync/
  5. Edit in either place - changes sync both ways!
`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "notes-sync help" for usage.');
      process.exit(1);
  }
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
}
