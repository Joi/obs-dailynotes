/**
 * Sync state manager for Notes.app ↔ Obsidian sync
 *
 * Tracks which notes have been synced and their last known state
 * to detect changes and handle conflicts.
 */

const fs = require('fs');
const path = require('path');

/**
 * State manager for sync tracking
 */
class SyncState {
  /**
   * @param {string} syncDir - Path to the sync directory (e.g., ~/switchboard/notes-sync)
   */
  constructor(syncDir) {
    this.syncDir = syncDir;
    this.stateFile = path.join(syncDir, '.sync-state.json');
    this.state = this.load();
  }

  /**
   * Load state from file, or create default state
   * @returns {Object}
   */
  load() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const content = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Warning: Could not load sync state: ${error.message}`);
    }

    // Return default state
    return {
      enabledSince: new Date().toISOString(),
      notes: {}
    };
  }

  /**
   * Save current state to file
   */
  save() {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.syncDir)) {
        fs.mkdirSync(this.syncDir, { recursive: true });
      }

      const content = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(this.stateFile, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save sync state: ${error.message}`);
    }
  }

  /**
   * Get the date when sync was enabled
   * @returns {Date}
   */
  getEnabledSince() {
    return new Date(this.state.enabledSince);
  }

  /**
   * Check if a note is being tracked
   * @param {string} noteId - Notes.app CoreData ID
   * @returns {boolean}
   */
  isTracked(noteId) {
    return noteId in this.state.notes;
  }

  /**
   * Get tracking info for a note
   * @param {string} noteId
   * @returns {Object|null}
   */
  getNoteState(noteId) {
    return this.state.notes[noteId] || null;
  }

  /**
   * Find note ID by Obsidian path
   * @param {string} obsidianPath - Relative path in sync folder
   * @returns {string|null} - Note ID or null
   */
  findNoteIdByPath(obsidianPath) {
    for (const [noteId, info] of Object.entries(this.state.notes)) {
      if (info.obsidianPath === obsidianPath) {
        return noteId;
      }
    }
    return null;
  }

  /**
   * Track a new note
   * @param {string} noteId - Notes.app CoreData ID
   * @param {string} obsidianPath - Relative path in sync folder
   * @param {Date} notesModifiedAt - Notes.app modification date
   * @param {Date} obsidianMtime - Obsidian file mtime
   */
  trackNote(noteId, obsidianPath, notesModifiedAt, obsidianMtime) {
    this.state.notes[noteId] = {
      obsidianPath,
      lastSyncedAt: new Date().toISOString(),
      notesModifiedAt: notesModifiedAt.toISOString(),
      obsidianMtime: obsidianMtime.toISOString()
    };
    this.save();
  }

  /**
   * Update sync timestamp for a note
   * @param {string} noteId
   * @param {Date} notesModifiedAt
   * @param {Date} obsidianMtime
   */
  updateSyncTime(noteId, notesModifiedAt, obsidianMtime) {
    if (this.state.notes[noteId]) {
      this.state.notes[noteId].lastSyncedAt = new Date().toISOString();
      this.state.notes[noteId].notesModifiedAt = notesModifiedAt.toISOString();
      this.state.notes[noteId].obsidianMtime = obsidianMtime.toISOString();
      this.save();
    }
  }

  /**
   * Remove a note from tracking
   * @param {string} noteId
   */
  untrackNote(noteId) {
    delete this.state.notes[noteId];
    this.save();
  }

  /**
   * Get all tracked notes
   * @returns {Object} - Map of noteId -> tracking info
   */
  getAllTracked() {
    return { ...this.state.notes };
  }

  /**
   * Initialize sync state (for first-time setup)
   * @param {Date} [since] - Optional date to set as enabledSince
   */
  initialize(since = null) {
    this.state = {
      enabledSince: (since || new Date()).toISOString(),
      notes: {}
    };
    this.save();
  }

  /**
   * Get summary statistics
   * @returns {Object}
   */
  getStats() {
    const notes = Object.values(this.state.notes);
    return {
      enabledSince: this.state.enabledSince,
      totalTracked: notes.length,
      notes: notes.map(n => ({
        path: n.obsidianPath,
        lastSynced: n.lastSyncedAt
      }))
    };
  }
}

module.exports = { SyncState };
