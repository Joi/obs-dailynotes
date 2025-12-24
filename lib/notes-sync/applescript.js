/**
 * AppleScript bridge for Mac Notes.app
 *
 * Provides CRUD operations for notes via AppleScript/osascript
 */

const { execSync } = require('child_process');

const SYNC_FOLDER_NAME = 'Obsidian Sync';

/**
 * Execute an AppleScript and return the result
 * @param {string} script - AppleScript code to execute
 * @returns {string} - Output from the script
 */
function runAppleScript(script) {
  try {
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    return result.trim();
  } catch (error) {
    throw new Error(`AppleScript error: ${error.message}`);
  }
}

/**
 * Check if the sync folder exists in Notes.app
 * @returns {boolean}
 */
function syncFolderExists() {
  const script = `
    tell application "Notes"
      try
        set f to folder "${SYNC_FOLDER_NAME}"
        return true
      on error
        return false
      end try
    end tell
  `;
  return runAppleScript(script) === 'true';
}

/**
 * Create the sync folder in Notes.app
 * @returns {void}
 */
function createSyncFolder() {
  const script = `
    tell application "Notes"
      make new folder with properties {name:"${SYNC_FOLDER_NAME}"}
    end tell
  `;
  runAppleScript(script);
}

/**
 * Ensure the sync folder exists, create if not
 * @returns {void}
 */
function ensureSyncFolder() {
  if (!syncFolderExists()) {
    createSyncFolder();
  }
}

/**
 * List all notes in the sync folder
 * @returns {Array<{id: string, name: string, createdAt: Date, modifiedAt: Date}>}
 */
function listNotesInSyncFolder() {
  ensureSyncFolder();

  // Use linefeed as record separator to avoid conflicts with date commas
  const script = `
    tell application "Notes"
      set outputText to ""
      try
        set syncFolder to folder "${SYNC_FOLDER_NAME}"
        repeat with n in notes of syncFolder
          set noteId to id of n
          set noteName to name of n
          set createDate to creation date of n
          set modDate to modification date of n
          set outputText to outputText & noteId & "|||" & noteName & "|||" & (createDate as string) & "|||" & (modDate as string) & linefeed
        end repeat
      end try
      return outputText
    end tell
  `;

  const output = runAppleScript(script);
  if (!output || output === '') {
    return [];
  }

  // Parse the output - it's newline-separated records
  const lines = output.split('\n').filter(line => line.trim() !== '');
  const notes = [];

  for (const line of lines) {
    const parts = line.split('|||');
    if (parts.length === 4) {
      notes.push({
        id: parts[0].trim(),
        name: parts[1].trim(),
        createdAt: parseAppleDate(parts[2].trim()),
        modifiedAt: parseAppleDate(parts[3].trim())
      });
    }
  }

  return notes;
}

/**
 * Parse Apple's date format string to a Date object
 * @param {string} dateStr - Date string like "Wednesday, December 24, 2025 at 8:33:12"
 * @returns {Date}
 */
function parseAppleDate(dateStr) {
  // Remove "at" and parse
  const cleaned = dateStr.replace(' at ', ' ');
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) {
    // Fallback: return current date if parsing fails
    console.warn(`Could not parse date: ${dateStr}`);
    return new Date();
  }
  return date;
}

/**
 * Get a note's full details including body
 * @param {string} noteId - The CoreData ID of the note
 * @returns {{id: string, name: string, body: string, createdAt: Date, modifiedAt: Date}}
 */
function getNote(noteId) {
  // Escape the noteId for AppleScript
  const escapedId = noteId.replace(/"/g, '\\"');

  const script = `
    tell application "Notes"
      set n to note id "${escapedId}"
      set noteId to id of n
      set noteName to name of n
      set noteBody to body of n
      set createDate to creation date of n
      set modDate to modification date of n
      return noteId & "|||" & noteName & "|||" & noteBody & "|||" & (createDate as string) & "|||" & (modDate as string)
    end tell
  `;

  const output = runAppleScript(script);
  const parts = output.split('|||');

  if (parts.length >= 5) {
    return {
      id: parts[0].trim(),
      name: parts[1].trim(),
      body: parts[2].trim(),
      createdAt: parseAppleDate(parts[3].trim()),
      modifiedAt: parseAppleDate(parts[4].trim())
    };
  }

  throw new Error(`Failed to parse note: ${noteId}`);
}

/**
 * Create a new note in the sync folder
 * @param {string} name - Note title
 * @param {string} body - Note body (HTML format)
 * @returns {string} - The new note's ID
 */
function createNote(name, body) {
  ensureSyncFolder();

  // Escape for AppleScript
  const escapedName = name.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
  const escapedBody = body.replace(/"/g, '\\"').replace(/\\/g, '\\\\');

  const script = `
    tell application "Notes"
      set syncFolder to folder "${SYNC_FOLDER_NAME}"
      set newNote to make new note at syncFolder with properties {name:"${escapedName}", body:"${escapedBody}"}
      return id of newNote
    end tell
  `;

  return runAppleScript(script);
}

/**
 * Update an existing note
 * @param {string} noteId - The note's CoreData ID
 * @param {string} name - New title (optional, pass null to keep existing)
 * @param {string} body - New body (optional, pass null to keep existing)
 */
function updateNote(noteId, name, body) {
  const escapedId = noteId.replace(/"/g, '\\"');

  let setStatements = [];
  if (name !== null && name !== undefined) {
    const escapedName = name.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    setStatements.push(`set name of n to "${escapedName}"`);
  }
  if (body !== null && body !== undefined) {
    const escapedBody = body.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    setStatements.push(`set body of n to "${escapedBody}"`);
  }

  if (setStatements.length === 0) {
    return; // Nothing to update
  }

  const script = `
    tell application "Notes"
      set n to note id "${escapedId}"
      ${setStatements.join('\n      ')}
    end tell
  `;

  runAppleScript(script);
}

/**
 * Delete a note
 * @param {string} noteId - The note's CoreData ID
 */
function deleteNote(noteId) {
  const escapedId = noteId.replace(/"/g, '\\"');

  const script = `
    tell application "Notes"
      set n to note id "${escapedId}"
      delete n
    end tell
  `;

  runAppleScript(script);
}

module.exports = {
  SYNC_FOLDER_NAME,
  syncFolderExists,
  createSyncFolder,
  ensureSyncFolder,
  listNotesInSyncFolder,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  parseAppleDate
};
