const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Load .env from the project root (two levels up from lib/)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Use SWITCHBOARD_DATA_PATH from env, fallback to legacy location
const DATA_DIR = process.env.SWITCHBOARD_DATA_PATH
  ? process.env.SWITCHBOARD_DATA_PATH.replace('~', os.homedir())
  : path.join(__dirname, '../../data');
const READING_QUEUE_FILE = path.join(DATA_DIR, 'reading-queue.json');

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory exists, ignore
  }
}

/**
 * Load reading queue from JSON
 */
async function loadReadingQueue() {
  await ensureDataDir();

  try {
    const data = await fs.readFile(READING_QUEUE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create initial structure
      const initial = {
        version: '1.0',
        items: [],
        nextId: 1
      };
      await saveReadingQueue(initial);
      return initial;
    }
    throw err;
  }
}

/**
 * Save reading queue to JSON
 */
async function saveReadingQueue(data) {
  await ensureDataDir();
  await fs.writeFile(
    READING_QUEUE_FILE,
    JSON.stringify(data, null, 2) + '\n',
    'utf-8'
  );
}

/**
 * Generate unique reading ID
 */
function generateId(nextId) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const idNum = String(nextId).padStart(3, '0');
  return `read-${dateStr}-${idNum}`;
}

/**
 * Detect if input is URL or file path
 */
function detectType(input) {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return 'url';
  }
  if (input.endsWith('.pdf')) {
    return 'pdf';
  }
  // Default to URL if contains common URL patterns
  if (input.includes('://') || input.includes('www.')) {
    return 'url';
  }
  return 'pdf'; // Assume file path
}

/**
 * Add reading item (URL or PDF)
 */
async function addReading(input, options = {}) {
  if (!options.title) {
    throw new Error('Title is required (use --title or -t)');
  }

  const data = await loadReadingQueue();
  const id = generateId(data.nextId);
  const type = options.type || detectType(input);

  const item = {
    id,
    type,
    title: options.title,
    url: type === 'url' ? input : null,
    path: type === 'pdf' ? input : null, // Will be moved to papers/ directory later
    status: 'to-read',
    priority: options.priority || 'medium',
    deadline: options.deadline || null,
    addedDate: new Date().toISOString(),
    startedDate: null,
    finishedDate: null,
    archivedDate: null,
    source: options.source || 'manual',
    tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
    notes: options.notes || '',
    estimatedMinutes: options.estimate ? parseInt(options.estimate) : null,
    reminderTaskId: options.reminderId || null
  };

  data.items.push(item);
  data.nextId++;

  await saveReadingQueue(data);

  return item;
}

/**
 * Find reading item by ID
 */
async function findReading(id) {
  const data = await loadReadingQueue();
  const item = data.items.find(i => i.id === id);

  if (!item) {
    throw new Error(`Reading item ${id} not found. Run 'work read list' to see available items.`);
  }

  return { data, item, index: data.items.indexOf(item) };
}

/**
 * Start reading (to-read � reading)
 */
async function startReading(id) {
  const { data, item } = await findReading(id);

  if (item.status !== 'to-read') {
    throw new Error(`Cannot start reading item in '${item.status}' status. Only 'to-read' items can be started.`);
  }

  item.status = 'reading';
  item.startedDate = new Date().toISOString();

  await saveReadingQueue(data);

  return item;
}

/**
 * Finish reading (reading � read)
 */
async function finishReading(id, options = {}) {
  const { data, item } = await findReading(id);

  if (item.status !== 'reading') {
    throw new Error(`Cannot finish reading item in '${item.status}' status. Run 'work read start ${id}' first.`);
  }

  item.status = 'read';
  item.finishedDate = new Date().toISOString();

  if (options.notes) {
    const dateStr = new Date().toISOString().slice(0, 10);
    item.notes += (item.notes ? '\n\n' : '') +
                  `Reading notes (${dateStr}): ${options.notes}`;
  }

  await saveReadingQueue(data);

  return item;
}

/**
 * Archive reading item (any status � archived)
 */
async function archiveReading(id) {
  const { data, item } = await findReading(id);

  item.status = 'archived';
  item.archivedDate = new Date().toISOString();

  await saveReadingQueue(data);

  return item;
}

/**
 * Update reading item
 */
async function updateReading(id, updates) {
  const { data, item } = await findReading(id);

  if (updates.title) item.title = updates.title;
  if (updates.url) item.url = updates.url;
  if (updates.deadline !== undefined) item.deadline = updates.deadline;
  if (updates.priority) item.priority = updates.priority;
  if (updates.notes !== undefined) item.notes = updates.notes;
  if (updates.estimate !== undefined) item.estimatedMinutes = parseInt(updates.estimate);

  if (updates.addTag) {
    if (!item.tags.includes(updates.addTag)) {
      item.tags.push(updates.addTag);
    }
  }
  if (updates.removeTag) {
    item.tags = item.tags.filter(t => t !== updates.removeTag);
  }

  await saveReadingQueue(data);

  return item;
}

/**
 * List reading items with filters
 */
async function listReading(filters = {}) {
  const data = await loadReadingQueue();
  let items = data.items;

  // Filter by type
  if (filters.type) {
    items = items.filter(i => i.type === filters.type);
  }

  // Filter by status
  if (filters.status) {
    items = items.filter(i => i.status === filters.status);
  }

  // Filter by priority
  if (filters.priority) {
    items = items.filter(i => i.priority === filters.priority);
  }

  // Filter by tag
  if (filters.tag) {
    items = items.filter(i => i.tags.includes(filters.tag));
  }

  // Exclude archived unless requested
  if (!filters.all) {
    items = items.filter(i => i.status !== 'archived');
  }

  // Sort: urgent first, then by deadline, then by status
  items.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;

    const statusOrder = { reading: 0, 'to-read': 1, read: 2, archived: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return items;
}

/**
 * Get statistics
 */
async function getStats() {
  const data = await loadReadingQueue();
  const all = data.items;

  return {
    total: all.length,
    toRead: all.filter(i => i.status === 'to-read').length,
    reading: all.filter(i => i.status === 'reading').length,
    read: all.filter(i => i.status === 'read').length,
    archived: all.filter(i => i.status === 'archived').length,
    urls: all.filter(i => i.type === 'url' && i.status !== 'archived').length,
    pdfs: all.filter(i => i.type === 'pdf' && i.status !== 'archived').length
  };
}

module.exports = {
  addReading,
  startReading,
  finishReading,
  archiveReading,
  updateReading,
  findReading,
  listReading,
  getStats
};
