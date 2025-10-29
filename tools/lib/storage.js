const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Load .env from the project root (two levels up from lib/)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Use SWITCHBOARD_DATA_PATH from env, fallback to legacy location
const DATA_DIR = process.env.SWITCHBOARD_DATA_PATH
  ? process.env.SWITCHBOARD_DATA_PATH.replace('~', os.homedir())
  : path.join(__dirname, '../../data');
const PRESENTATIONS_FILE = path.join(DATA_DIR, 'presentations.json');

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory exists, ignore error
  }
}

/**
 * Load presentations from JSON file
 * Creates initial file if it doesn't exist
 */
async function loadPresentations() {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(PRESENTATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create initial structure
      const initial = {
        version: '1.0',
        presentations: [],
        nextId: 1
      };
      await savePresentations(initial);
      return initial;
    }
    throw err;
  }
}

/**
 * Save presentations to JSON file
 */
async function savePresentations(data) {
  await ensureDataDir();
  await fs.writeFile(
    PRESENTATIONS_FILE,
    JSON.stringify(data, null, 2) + '\n',
    'utf-8'
  );
}

module.exports = {
  loadPresentations,
  savePresentations,
  PRESENTATIONS_FILE
};
