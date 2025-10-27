const { loadPresentations, savePresentations } = require('./storage');

/**
 * Generate unique presentation ID
 */
function generateId(nextId) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const idNum = String(nextId).padStart(3, '0');
  return `pres-${dateStr}-${idNum}`;
}

/**
 * Validate Google Slides URL
 */
function validateSlidesUrl(url) {
  return url.includes('docs.google.com/presentation');
}

/**
 * Add a new presentation
 */
async function addPresentation(url, options = {}) {
  if (!validateSlidesUrl(url)) {
    throw new Error('Invalid Google Slides URL. Expected: https://docs.google.com/presentation/d/...');
  }
  
  if (!options.title) {
    throw new Error('Title is required (use --title or -t)');
  }
  
  const data = await loadPresentations();
  const id = generateId(data.nextId);
  
  const presentation = {
    id,
    title: options.title,
    url,
    notionUrl: options.notion || options.notionUrl || null,
    status: 'planned',
    priority: options.priority || 'medium',
    deadline: options.deadline || null,
    createdDate: new Date().toISOString(),
    startedDate: null,
    completedDate: null,
    archivedDate: null,
    tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
    notes: options.notes || '',
    reminderTaskId: null,
    estimatedHours: options.estimate ? parseFloat(options.estimate) : null,
    actualHours: 0
  };
  
  data.presentations.push(presentation);
  data.nextId++;
  
  await savePresentations(data);
  
  return presentation;
}

/**
 * Find presentation by ID
 */
async function findPresentation(id) {
  const data = await loadPresentations();
  const pres = data.presentations.find(p => p.id === id);
  
  if (!pres) {
    throw new Error(`Presentation ${id} not found. Run 'work pres list' to see available presentations.`);
  }
  
  return { data, pres, index: data.presentations.indexOf(pres) };
}

/**
 * Start working on presentation (planned → in-progress)
 */
async function startPresentation(id) {
  const { data, pres } = await findPresentation(id);
  
  if (pres.status !== 'planned') {
    throw new Error(`Cannot start presentation in '${pres.status}' status. Only 'planned' presentations can be started.`);
  }
  
  pres.status = 'in-progress';
  pres.startedDate = new Date().toISOString();
  
  await savePresentations(data);
  
  return pres;
}

/**
 * Complete presentation (in-progress → completed)
 */
async function completePresentation(id, options = {}) {
  const { data, pres } = await findPresentation(id);
  
  if (pres.status !== 'in-progress') {
    throw new Error(`Cannot complete presentation in '${pres.status}' status. Run 'work pres start ${id}' first.`);
  }
  
  pres.status = 'completed';
  pres.completedDate = new Date().toISOString();
  
  if (options.hours) {
    pres.actualHours = parseFloat(options.hours);
  }
  
  if (options.notes) {
    const dateStr = new Date().toISOString().slice(0, 10);
    pres.notes += (pres.notes ? '\n\n' : '') + 
                  `Completion notes (${dateStr}): ${options.notes}`;
  }
  
  await savePresentations(data);
  
  return pres;
}

/**
 * Archive presentation (any status → archived)
 */
async function archivePresentation(id) {
  const { data, pres } = await findPresentation(id);
  
  pres.status = 'archived';
  pres.archivedDate = new Date().toISOString();
  
  await savePresentations(data);
  
  return pres;
}

/**
 * Update presentation metadata
 */
async function updatePresentation(id, updates) {
  const { data, pres } = await findPresentation(id);
  
  if (updates.title) pres.title = updates.title;
  if (updates.url) {
    if (!validateSlidesUrl(updates.url)) {
      throw new Error('Invalid Google Slides URL');
    }
    pres.url = updates.url;
  }
  if (updates.notion !== undefined) pres.notionUrl = updates.notion;
  if (updates.deadline !== undefined) pres.deadline = updates.deadline;
  if (updates.priority) pres.priority = updates.priority;
  if (updates.notes !== undefined) pres.notes = updates.notes;
  if (updates.estimate !== undefined) pres.estimatedHours = parseFloat(updates.estimate);
  
  if (updates.addTag) {
    if (!pres.tags.includes(updates.addTag)) {
      pres.tags.push(updates.addTag);
    }
  }
  if (updates.removeTag) {
    pres.tags = pres.tags.filter(t => t !== updates.removeTag);
  }
  
  await savePresentations(data);
  
  return pres;
}

/**
 * List presentations with optional filters
 */
async function listPresentations(filters = {}) {
  const data = await loadPresentations();
  let presentations = data.presentations;
  
  // Filter by status
  if (filters.status) {
    presentations = presentations.filter(p => p.status === filters.status);
  }
  
  // Filter by priority
  if (filters.priority) {
    presentations = presentations.filter(p => p.priority === filters.priority);
  }
  
  // Filter by tag
  if (filters.tag) {
    presentations = presentations.filter(p => p.tags.includes(filters.tag));
  }
  
  // Exclude archived unless explicitly requested
  if (!filters.all) {
    presentations = presentations.filter(p => p.status !== 'archived');
  }
  
  // Sort: urgent first, then by deadline, then by status
  presentations.sort((a, b) => {
    // Priority order
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Deadline order (soonest first, null last)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    
    // Status order
    const statusOrder = { 'in-progress': 0, planned: 1, completed: 2, archived: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  return presentations;
}

/**
 * Get statistics
 */
async function getStats() {
  const data = await loadPresentations();
  const all = data.presentations;
  
  return {
    total: all.length,
    planned: all.filter(p => p.status === 'planned').length,
    inProgress: all.filter(p => p.status === 'in-progress').length,
    completed: all.filter(p => p.status === 'completed').length,
    archived: all.filter(p => p.status === 'archived').length,
    urgent: all.filter(p => p.priority === 'urgent' && p.status !== 'archived').length,
    overdue: all.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed' && p.status !== 'archived').length
  };
}

module.exports = {
  addPresentation,
  startPresentation,
  completePresentation,
  archivePresentation,
  updatePresentation,
  findPresentation,
  listPresentations,
  getStats
};
