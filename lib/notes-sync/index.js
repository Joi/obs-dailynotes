/**
 * Notes.app ↔ Obsidian Sync Orchestrator
 *
 * Bidirectional sync between Mac Notes.app and Obsidian vault.
 * Only syncs notes in the "Obsidian Sync" folder.
 */

const fs = require('fs');
const path = require('path');
const {
  ensureSyncFolder,
  listNotesInSyncFolder,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  SYNC_FOLDER_NAME
} = require('./applescript');
const {
  htmlToMarkdown,
  markdownToHtml,
  titleToFilename,
  filenameToTitle
} = require('./converter');
const { SyncState } = require('./state');

/**
 * Default sync directory in Obsidian vault
 */
const DEFAULT_OBSIDIAN_SYNC_DIR = path.join(
  process.env.HOME,
  'switchboard',
  'notes-sync'
);

/**
 * Notes Sync Manager
 */
class NotesSync {
  /**
   * @param {string} [obsidianSyncDir] - Path to Obsidian sync folder
   */
  constructor(obsidianSyncDir = DEFAULT_OBSIDIAN_SYNC_DIR) {
    this.obsidianSyncDir = obsidianSyncDir;
    this.state = new SyncState(obsidianSyncDir);
  }

  /**
   * Initialize sync (first-time setup)
   * Creates necessary folders and initializes state
   */
  initialize() {
    // Ensure Obsidian sync directory exists
    if (!fs.existsSync(this.obsidianSyncDir)) {
      fs.mkdirSync(this.obsidianSyncDir, { recursive: true });
      console.log(`Created Obsidian sync folder: ${this.obsidianSyncDir}`);
    }

    // Ensure Notes.app sync folder exists
    ensureSyncFolder();
    console.log(`Ensured Notes.app folder: "${SYNC_FOLDER_NAME}"`);

    // Initialize state if not already done
    if (!fs.existsSync(this.state.stateFile)) {
      this.state.initialize();
      console.log('Initialized sync state');
    }

    return {
      obsidianDir: this.obsidianSyncDir,
      notesFolder: SYNC_FOLDER_NAME,
      enabledSince: this.state.getEnabledSince()
    };
  }

  /**
   * Pull changes from Notes.app to Obsidian
   * @returns {Object} - Summary of changes
   */
  pullFromNotes() {
    const results = {
      created: [],
      updated: [],
      deleted: [],
      unchanged: [],
      errors: []
    };

    // Get all notes in sync folder
    const notesInFolder = listNotesInSyncFolder();
    const trackedNotes = this.state.getAllTracked();
    const seenNoteIds = new Set();

    for (const noteMeta of notesInFolder) {
      seenNoteIds.add(noteMeta.id);

      try {
        const tracked = this.state.getNoteState(noteMeta.id);

        if (!tracked) {
          // New note - create in Obsidian
          const fullNote = getNote(noteMeta.id);
          const markdown = htmlToMarkdown(fullNote.body);
          const filename = `${titleToFilename(fullNote.name)}.md`;
          const obsidianPath = path.join(this.obsidianSyncDir, filename);

          // Add frontmatter with metadata
          const content = this._addFrontmatter(markdown, {
            title: fullNote.name,
            created: fullNote.createdAt.toISOString(),
            modified: fullNote.modifiedAt.toISOString(),
            notesId: fullNote.id
          });

          fs.writeFileSync(obsidianPath, content, 'utf-8');
          const stats = fs.statSync(obsidianPath);

          this.state.trackNote(
            noteMeta.id,
            filename,
            fullNote.modifiedAt,
            stats.mtime
          );

          results.created.push(filename);
        } else {
          // Existing note - check for updates
          const lastNotesModified = new Date(tracked.notesModifiedAt);

          if (noteMeta.modifiedAt > lastNotesModified) {
            // Note was updated in Notes.app
            const fullNote = getNote(noteMeta.id);
            const markdown = htmlToMarkdown(fullNote.body);
            const obsidianPath = path.join(this.obsidianSyncDir, tracked.obsidianPath);

            // Preserve frontmatter, update content
            const content = this._addFrontmatter(markdown, {
              title: fullNote.name,
              created: fullNote.createdAt.toISOString(),
              modified: fullNote.modifiedAt.toISOString(),
              notesId: fullNote.id
            });

            fs.writeFileSync(obsidianPath, content, 'utf-8');
            const stats = fs.statSync(obsidianPath);

            this.state.updateSyncTime(
              noteMeta.id,
              fullNote.modifiedAt,
              stats.mtime
            );

            results.updated.push(tracked.obsidianPath);
          } else {
            results.unchanged.push(tracked.obsidianPath);
          }
        }
      } catch (error) {
        results.errors.push({
          noteId: noteMeta.id,
          name: noteMeta.name,
          error: error.message
        });
      }
    }

    // Check for deleted notes (in state but not in Notes.app)
    for (const [noteId, info] of Object.entries(trackedNotes)) {
      if (!seenNoteIds.has(noteId)) {
        // Note was deleted from Notes.app - remove from Obsidian
        const obsidianPath = path.join(this.obsidianSyncDir, info.obsidianPath);
        if (fs.existsSync(obsidianPath)) {
          // Move to trash folder instead of deleting
          const trashDir = path.join(this.obsidianSyncDir, '.trash');
          if (!fs.existsSync(trashDir)) {
            fs.mkdirSync(trashDir, { recursive: true });
          }
          const trashPath = path.join(trashDir, info.obsidianPath);
          fs.renameSync(obsidianPath, trashPath);
          results.deleted.push(info.obsidianPath);
        }
        this.state.untrackNote(noteId);
      }
    }

    return results;
  }

  /**
   * Push changes from Obsidian to Notes.app
   * @returns {Object} - Summary of changes
   */
  pushToNotes() {
    const results = {
      created: [],
      updated: [],
      deleted: [],
      unchanged: [],
      errors: []
    };

    // Get all markdown files in sync folder
    const obsidianFiles = fs.readdirSync(this.obsidianSyncDir)
      .filter(f => f.endsWith('.md') && !f.startsWith('.'));

    const trackedNotes = this.state.getAllTracked();
    const seenPaths = new Set();

    for (const filename of obsidianFiles) {
      seenPaths.add(filename);
      const obsidianPath = path.join(this.obsidianSyncDir, filename);

      try {
        const stats = fs.statSync(obsidianPath);
        const noteId = this.state.findNoteIdByPath(filename);

        if (!noteId) {
          // New file in Obsidian - create in Notes.app
          const content = fs.readFileSync(obsidianPath, 'utf-8');
          const { frontmatter, body } = this._parseFrontmatter(content);
          const title = frontmatter.title || filenameToTitle(filename);
          const html = markdownToHtml(body);

          const newNoteId = createNote(title, html);

          // Get the created note to get accurate timestamps
          const createdNote = getNote(newNoteId);

          this.state.trackNote(
            newNoteId,
            filename,
            createdNote.modifiedAt,
            stats.mtime
          );

          results.created.push(filename);
        } else {
          // Existing file - check for updates
          const tracked = this.state.getNoteState(noteId);
          const lastObsidianMtime = new Date(tracked.obsidianMtime);

          if (stats.mtime > lastObsidianMtime) {
            // File was updated in Obsidian
            const content = fs.readFileSync(obsidianPath, 'utf-8');
            const { frontmatter, body } = this._parseFrontmatter(content);
            const title = frontmatter.title || filenameToTitle(filename);
            const html = markdownToHtml(body);

            updateNote(noteId, title, html);

            // Get updated note for accurate timestamp
            const updatedNote = getNote(noteId);

            this.state.updateSyncTime(
              noteId,
              updatedNote.modifiedAt,
              stats.mtime
            );

            results.updated.push(filename);
          } else {
            results.unchanged.push(filename);
          }
        }
      } catch (error) {
        results.errors.push({
          file: filename,
          error: error.message
        });
      }
    }

    // Check for deleted files (in state but not in Obsidian)
    for (const [noteId, info] of Object.entries(trackedNotes)) {
      if (!seenPaths.has(info.obsidianPath)) {
        // File was deleted from Obsidian - delete from Notes.app
        try {
          deleteNote(noteId);
          results.deleted.push(info.obsidianPath);
        } catch (error) {
          results.errors.push({
            noteId,
            file: info.obsidianPath,
            error: error.message
          });
        }
        this.state.untrackNote(noteId);
      }
    }

    return results;
  }

  /**
   * Full bidirectional sync
   * Pull first (Notes.app wins for conflicts), then push new Obsidian files
   * @returns {Object} - Summary of all changes
   */
  sync() {
    console.log('Starting Notes.app ↔ Obsidian sync...');

    // Ensure folders exist
    this.initialize();

    // Pull from Notes.app first
    console.log('Pulling from Notes.app...');
    const pullResults = this.pullFromNotes();

    // Push to Notes.app
    console.log('Pushing to Notes.app...');
    const pushResults = this.pushToNotes();

    return {
      pull: pullResults,
      push: pushResults,
      summary: {
        totalCreated: pullResults.created.length + pushResults.created.length,
        totalUpdated: pullResults.updated.length + pushResults.updated.length,
        totalDeleted: pullResults.deleted.length + pushResults.deleted.length,
        totalErrors: pullResults.errors.length + pushResults.errors.length
      }
    };
  }

  /**
   * Get sync status
   * @returns {Object}
   */
  getStatus() {
    const stats = this.state.getStats();
    const notesInFolder = listNotesInSyncFolder();

    return {
      enabledSince: stats.enabledSince,
      trackedNotes: stats.totalTracked,
      notesInSyncFolder: notesInFolder.length,
      obsidianSyncDir: this.obsidianSyncDir,
      notesFolderName: SYNC_FOLDER_NAME
    };
  }

  /**
   * Add YAML frontmatter to markdown content
   * @private
   */
  _addFrontmatter(markdown, meta) {
    const frontmatter = [
      '---',
      `title: "${meta.title.replace(/"/g, '\\"')}"`,
      `created: ${meta.created}`,
      `modified: ${meta.modified}`,
      `notes-id: "${meta.notesId}"`,
      '---',
      '',
      markdown
    ].join('\n');

    return frontmatter;
  }

  /**
   * Parse YAML frontmatter from markdown content
   * @private
   */
  _parseFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterStr = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    // Simple YAML parsing
    const frontmatter = {};
    for (const line of frontmatterStr.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        frontmatter[key] = value;
      }
    }

    return { frontmatter, body };
  }
}

module.exports = { NotesSync, DEFAULT_OBSIDIAN_SYNC_DIR };
