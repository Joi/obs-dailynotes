# GTD Workflow Redesign Proposal

**Date:** 2025-10-27
**Status:** Draft for Review
**Philosophy:** Ruthless Simplicity

## Executive Summary

The current GTD system isn't working because it's optimized for capturing stats, not driving action. With 108 unassigned tasks and minimal use of context tags, the workflow has failed to establish sustainable habits. This proposal strips the system down to what actually works and builds a lightweight, actionable workflow inspired by the presentations system's success.

## 1. Current State Analysis

### What Works ✅

- **Cache-based architecture** - Read-only Apple Reminders integration via JSON cache
- **Dashboard generation** - Automated update mechanism works reliably
- **Person-centric lists** - Shared lists (Daum, Mizuka, Mika) provide natural organization
- **#someday tagging** - Clear distinction between actionable and aspirational items

### What's Broken ❌

**Critical Issues:**

1. **No actionable views** - Dashboard shows counts, not actual next actions
2. **No tagging discipline** - 108/113 tasks unassigned to projects
3. **Context tags unused** - Only 2 @context tags found (out of 108 active tasks)
4. **Broken dependency** - gtdService.js:38 references archived processGTD.js
5. **Stats without action** - Dashboard is informational, not operational
6. **No workflow** - No clear process for inbox → next actions

**Structural Problems:**

- Dashboard quick actions link to non-existent pages (GTD/inbox, GTD/next-actions, etc.)
- Complex tag system (#email, #email-reply, #email-waiting, etc.) never adopted
- Priority markers (!, !!) defined but not used
- Context system designed but abandoned

### What's Missing 🚫

1. **Daily workflow** - No clear routine for processing tasks
2. **Next actions view** - Most important GTD component absent
3. **Working dashboard** - Need to see tasks, not statistics
4. **Simple habits** - Current system requires too much overhead

## 2. Root Cause Analysis

Looking at the presentations system success vs. GTD failure reveals the pattern:

| Presentations System (Works) | GTD System (Broken) |
|------------------------------|-------------------|
| Shows actual content | Shows only counts |
| Clear actionable items | Abstract statistics |
| Minimal tagging (date-based) | Complex tag taxonomy |
| Natural workflow integration | Requires discipline |
| Updates what you see | Updates what you track |

**Key insight:** People use systems that reduce friction, not add it. The GTD system requires tagging discipline before showing value. The presentations system shows value immediately.

## 3. Proposed Tag Strategy

### Essential Tags (Use These)

**Status Tags** - One per task, describes current state:
- `#someday` - Not actionable now (already working)
- `#waiting` - Blocked on someone else (already in use for Reid's list)
- No tag = actionable now

**Project Tags** - Optional, use when helpful:
- `#project:bhutan` - Group related tasks
- `#project:digital-garage` - Professional projects
- `#project:tea-ceremony` - Personal projects

**Priority Markers** - Use sparingly:
- `!` - Important (maybe 5% of tasks)
- `!!` - Urgent (maybe 1% of tasks)

### Abandoned Tags (Don't Use)

Delete these from the system entirely:
- `#inbox` - Redundant (Inbox list already exists)
- `#next` - Redundant (anything not #someday or #waiting is next)
- `#email`, `#email-reply`, `#email-waiting` - Too granular
- `#call`, `#meeting` - Context not helpful
- `@context` tags - Never used, adds friction

### Tag Philosophy

**Use tags to filter, not to describe.**

- A task either IS or ISN'T actionable → `#someday` or no tag
- A task either IS or ISN'T blocked → `#waiting` or no tag
- Projects are optional groupings, not requirements

**Example task titles:**
```
✅ GOOD:
- Book dinner with Jun
- Kojunsha Lunch Presentation 📅 2025/11/7 #project:presentations
- Read exinstitutional theory https://... #someday
- Email From: Tobias Rees — Re: AI@70 #waiting

❌ BAD (too many tags):
- Book dinner with Jun #next #call #personal
- Email reply to Tobias #email #email-reply #waiting
```

## 4. Proposed Workflow

### Daily Routine (5 minutes)

**Morning:**
1. Open Dashboard → See "Today's Next Actions" (3-5 tasks max)
2. Pick one task to do first
3. Do it or defer it (add date or #someday)

**Throughout Day:**
- Add tasks to Inbox as they arise (no tagging required)
- Mark completed tasks as done in Apple Reminders

**Evening (optional):**
- Quick scan of Dashboard
- Move 1-2 items from Inbox to next actions (assign dates if needed)

### Weekly Review (15 minutes, Sunday)

1. **Process Inbox** (10 min)
   - For each task in Inbox list:
     - Add due date if time-sensitive → becomes "next action"
     - Add `#someday` if not ready → goes to someday list
     - Add `#project:name` if part of bigger initiative → optional
     - Delete if no longer relevant

2. **Review Next Actions** (3 min)
   - Scan tasks without dates or tags
   - Ensure they're still actionable
   - Push out dates on deferred items

3. **Check Waiting For** (2 min)
   - Review `#waiting` tasks
   - Follow up or remove tag if unblocked

### No Daily Processing Required

Unlike traditional GTD, this system doesn't require daily inbox processing. Tasks live in Inbox until weekly review unless you want to action them sooner. The dashboard surfaces what's important.

## 5. Dashboard Redesign

### New Structure

```markdown
# GTD Dashboard

Updated: [timestamp]

## 🎯 Today's Next Actions (3-5 items)

- [ ] Book dinner with Jun
- [ ] Kojunsha Lunch Presentation (due Nov 20)
- [ ] Waka Recommendation (due Nov 13)

## 📋 This Week (next 7 days)

- [ ] Kojunsha Lunch Presentation 📅 2025/11/7
- [ ] Faculty feedback - chiyoda san

## 📥 Inbox (items need processing)

- [ ] X1 Studio
- [ ] Kio gift tax
- [ ] Share model comparison from Kai to Joe
... (show first 10, with count if more)

## ⏸️ Waiting For (blocked on others)

- [ ] Email From: Tobias Rees — Re: AI@70 (Reid)
... (show all)

## 🗂️ Active Projects

### #project/presentations (6 tasks)
- 2 due this week, 4 future

### #project/bhutan (4 tasks)
- 1 waiting, 3 active

## 💭 Someday/Maybe (5 items)

- [ ] Read exinstitutional theory https://...
- [ ] Make Kimono Database
... (collapsed by default, expand to see all)

## 📊 Quick Stats

- Total active: 108 tasks
- Unassigned: 100 tasks (assign projects during weekly review)
- Person lists: Daum (6), Mei Ling (7), Reid (3)
```

### Key Changes from Current Dashboard

1. **Show actual tasks** - Not just counts
2. **Prioritize by date** - Today/This Week at top
3. **Limit visible items** - 3-5 next actions, not overwhelming
4. **Collapsible sections** - Someday hidden by default
5. **Actionable items first** - What can I do now?
6. **Stats at bottom** - Informational, not primary

### Design Principles

- **Scannable** - See today's work in 3 seconds
- **Minimal** - Show what matters, hide what doesn't
- **Actionable** - Every item is something you can do
- **Honest** - 100 unassigned tasks? Show it, process weekly

## 6. Code Improvements

### Fix gtdService.js Dependency

**Problem:** Line 38 references archived processGTD.js

**Solution:** Extract needed functions into gtdService.js itself

```javascript
// Remove this:
const legacy = require('../../tools/processGTD.js');

// Add inline:
function parseGTDElements(text) {
  return {
    tags: extractTags(text),
    hasPriority: text.includes('!'),
    isUrgent: text.includes('!!')
  };
}

function categorizeReminders(reminders) {
  return {
    inbox: reminders.filter(r => r.list === 'Inbox' && !r.completed),
    today: reminders.filter(r => isDueToday(r) && !r.completed),
    waiting: reminders.filter(r => r.tags?.includes('waiting') && !r.completed),
    someday: reminders.filter(r => r.tags?.includes('someday') && !r.completed)
  };
}

function extractTags(text) {
  if (!text) return [];
  const re = /#([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/g;
  const tags = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

function isDueToday(task) {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}
```

### Enhance dashboard.js

**New function to show actual tasks:**

```javascript
/**
 * Format task for display in markdown
 */
function formatTask(task) {
  const checkbox = '- [ ]';
  let title = task.title;

  // Extract actual title (remove tags for display)
  title = title.replace(/#[A-Za-z0-9_:-]+/g, '').trim();

  // Add due date if present
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    title += ` (due ${formatted})`;
  }

  // Add priority indicator
  if (task.title.includes('!!')) title = '⚠️ ' + title;
  else if (task.title.includes('!')) title = '❗' + title;

  return `${checkbox} ${title}`;
}

/**
 * Generate "Next Actions" section (core of new dashboard)
 */
function generateNextActions(reminders) {
  const active = reminders.filter(r =>
    !r.completed &&
    !r.tags?.includes('someday') &&
    !r.tags?.includes('waiting')
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  // Categorize by urgency
  const dueToday = [];
  const dueThisWeek = [];
  const noDate = [];

  active.forEach(task => {
    if (!task.dueDate) {
      noDate.push(task);
    } else {
      const due = new Date(task.dueDate);
      if (due.toDateString() === today.toDateString()) {
        dueToday.push(task);
      } else if (due <= weekFromNow) {
        dueThisWeek.push(task);
      }
    }
  });

  // Sort by priority and show top items
  const nextActions = [
    ...dueToday.sort((a, b) => (b.title.includes('!') ? 1 : 0) - (a.title.includes('!') ? 1 : 0)),
    ...dueThisWeek.slice(0, 3),
    ...noDate.slice(0, 2)
  ].slice(0, 5);  // Limit to 5 items

  return nextActions;
}
```

**Updated generateDashboard function:**

```javascript
function generateDashboard(reminders) {
  const now = new Date();

  let markdown = `# GTD Dashboard\n\n`;
  markdown += `Updated: ${now.toLocaleString()}\n\n`;

  // 1. TODAY'S NEXT ACTIONS (most important)
  const nextActions = generateNextActions(reminders);
  markdown += `## 🎯 Today's Next Actions\n\n`;
  if (nextActions.length > 0) {
    nextActions.forEach(task => {
      markdown += formatTask(task) + '\n';
    });
  } else {
    markdown += `*No urgent actions - check inbox or projects below*\n`;
  }
  markdown += '\n';

  // 2. THIS WEEK
  const thisWeek = getThisWeekTasks(reminders);
  markdown += `## 📋 This Week\n\n`;
  if (thisWeek.length > 0) {
    thisWeek.slice(0, 10).forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    if (thisWeek.length > 10) {
      markdown += `\n*... and ${thisWeek.length - 10} more*\n`;
    }
  } else {
    markdown += `*No tasks due this week*\n`;
  }
  markdown += '\n';

  // 3. INBOX (needs processing)
  const inbox = reminders.filter(r => r.list === 'Inbox' && !r.completed);
  markdown += `## 📥 Inbox (${inbox.length} items)\n\n`;
  if (inbox.length > 0) {
    inbox.slice(0, 10).forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    if (inbox.length > 10) {
      markdown += `\n*... and ${inbox.length - 10} more (process during weekly review)*\n`;
    }
  }
  markdown += '\n';

  // 4. WAITING FOR
  const waiting = reminders.filter(r => r.tags?.includes('waiting') && !r.completed);
  if (waiting.length > 0) {
    markdown += `## ⏸️ Waiting For\n\n`;
    waiting.forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    markdown += '\n';
  }

  // 5. ACTIVE PROJECTS (collapsed stats)
  const projects = getProjectStats(reminders);
  if (Object.keys(projects).length > 0) {
    markdown += `## 🗂️ Active Projects\n\n`;
    Object.entries(projects).forEach(([name, stats]) => {
      markdown += `### #project/${name} (${stats.total} tasks)\n`;
      const details = [];
      if (stats.thisWeek > 0) details.push(`${stats.thisWeek} this week`);
      if (stats.waiting > 0) details.push(`${stats.waiting} waiting`);
      if (stats.future > 0) details.push(`${stats.future} future`);
      markdown += `- ${details.join(', ')}\n\n`;
    });
  }

  // 6. SOMEDAY (collapsed)
  const someday = reminders.filter(r => r.tags?.includes('someday') && !r.completed);
  markdown += `## 💭 Someday/Maybe (${someday.length} items)\n\n`;
  markdown += `<details>\n<summary>Click to expand</summary>\n\n`;
  someday.forEach(task => {
    markdown += formatTask(task) + '\n';
  });
  markdown += `</details>\n\n`;

  // 7. QUICK STATS (informational, at bottom)
  const active = reminders.filter(r => !r.completed && !r.tags?.includes('someday'));
  const unassigned = active.filter(r => !extractProject(r.tags));

  markdown += `## 📊 Quick Stats\n\n`;
  markdown += `- Total active: ${active.length} tasks\n`;
  markdown += `- Unassigned to projects: ${unassigned.length} tasks\n`;
  if (unassigned.length > 20) {
    markdown += `  - *Consider assigning projects during weekly review*\n`;
  }

  return markdown;
}
```

### Helper Functions

```javascript
function getThisWeekTasks(reminders) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  return reminders.filter(r => {
    if (r.completed || r.tags?.includes('someday') || r.tags?.includes('waiting')) {
      return false;
    }
    if (!r.dueDate) return false;

    const due = new Date(r.dueDate);
    return due > today && due <= weekFromNow;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

function getProjectStats(reminders) {
  const active = reminders.filter(r => !r.completed && !r.tags?.includes('someday'));
  const projects = {};

  active.forEach(task => {
    const project = extractProject(task.tags);
    if (!project) return;

    if (!projects[project]) {
      projects[project] = { total: 0, thisWeek: 0, waiting: 0, future: 0 };
    }

    projects[project].total++;

    if (task.tags?.includes('waiting')) {
      projects[project].waiting++;
    } else if (task.dueDate) {
      const due = new Date(task.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      if (due <= weekFromNow) {
        projects[project].thisWeek++;
      } else {
        projects[project].future++;
      }
    }
  });

  return projects;
}
```

## 7. Migration Plan

### Phase 1: Fix Broken Code (1 hour)

1. **Update gtdService.js**
   - Remove dependency on archived processGTD.js
   - Inline needed functions
   - Test cache loading still works

2. **Test dashboard generation**
   ```bash
   cd /Users/joi/obs-dailynotes
   node lib/gtd-simple/dashboard.js
   ```

3. **Verify output** - Dashboard should generate without errors

### Phase 2: Deploy New Dashboard (1 hour)

1. **Update dashboard.js** with new design
2. **Add helper functions** for task formatting
3. **Test with current data** - Should show actual tasks, not just counts
4. **Review output** - Does it show actionable items?

### Phase 3: Tag Cleanup (Sunday weekly review, 30 min)

**Don't try to fix all 108 tasks at once.** Instead:

1. **Add due dates to urgent items** (5-10 tasks)
   - Scan Inbox
   - Pick 5 things that matter this week
   - Add dates to them in Apple Reminders

2. **Tag truly non-actionable items** (#someday)
   - Scan Inbox for "nice to have" items
   - Add #someday to 10-20 items
   - They'll move out of active view

3. **Let the rest sit in Inbox**
   - It's okay to have unprocessed items
   - The new dashboard will show what's important
   - Process more during next weekly review

4. **Optional: Add 2-3 project tags**
   - If you notice clusters (bhutan, presentations, tea)
   - Tag just those items
   - Don't force it

### Phase 4: Habit Formation (2-4 weeks)

**Week 1-2: Just look**
- Open dashboard daily
- Don't force yourself to process
- Notice what's useful vs. noise

**Week 3-4: Light interaction**
- Pick 1-2 tasks from "Today's Next Actions"
- Mark them done when complete
- Add new items to Inbox without tagging

**After 4 weeks: Evaluate**
- Is the dashboard useful?
- Are you naturally tagging items?
- What's still friction?

### Migration Success Criteria

- [ ] Dashboard generates without errors
- [ ] Shows 3-5 next actions
- [ ] Inbox count visible (even if high)
- [ ] User looks at dashboard 3+ times/week
- [ ] At least 5 tasks have dates assigned
- [ ] At least 10 tasks tagged #someday

**NOT required for success:**
- All 108 tasks processed
- Every task has project tag
- Zero unassigned items
- Daily inbox processing

## 8. Success Metrics

### Immediate Success (Week 1)

- Dashboard shows actual tasks, not stats
- No broken code dependencies
- User can identify "next action" in <10 seconds

### Short-term Success (Month 1)

- User checks dashboard 3-5x/week
- Inbox processed during weekly reviews
- 10-20 tasks have meaningful tags
- Completed tasks marked done

### Long-term Success (Month 3)

- Dashboard is trusted source of "what's next"
- Weekly review takes <15 minutes
- Natural tagging habits emerge
- System feels helpful, not burdensome

### Warning Signs (Abandon if these occur)

- Dashboard still not useful after redesign
- Weekly review regularly skipped for 3+ weeks
- Adding tags feels like work, not help
- Simpler alternative emerges (just use calendar + Inbox)

## 9. Lessons from Presentations System

The presentations dashboard works because:

1. **Shows actual content** - See the presentations, not counts
2. **Minimal overhead** - Just put files in folder with dates
3. **Automatic organization** - System infers structure from filenames
4. **Immediate value** - Works from day one
5. **Scales naturally** - More presentations? Just add files

Apply to GTD:

1. **Show actual tasks** - Not "5 tasks due today" but WHICH 5 tasks
2. **Minimal tagging** - Dates + #someday + #waiting is enough
3. **Automatic priority** - Sort by date, show top 5
4. **Immediate value** - Dashboard useful even with messy data
5. **Scales naturally** - 100 tasks? Show important ones, hide rest

## 10. Philosophy Alignment

This redesign follows ruthless simplicity:

**Occam's Razor:**
- Simplest tag system: status (#someday, #waiting) + optional projects
- Simplest workflow: Weekly review + daily scan
- Simplest dashboard: Show what matters, hide what doesn't

**Trust in Emergence:**
- Don't force project structure upfront
- Let natural groupings emerge through use
- System adapts to actual behavior, not ideal behavior

**Present-moment focus:**
- Dashboard answers "what should I do now?"
- Not "how organized is my system?"
- Action-oriented, not management-oriented

**Pragmatic trust:**
- Trust yourself to do weekly review
- Trust that important things will surface
- Trust that perfect tagging isn't necessary

## 11. Open Questions

1. **Should we delete old Quick Actions links?** (GTD/inbox, GTD/next-actions, etc.)
   - Recommendation: Yes, they point to non-existent pages

2. **Should person lists stay in Apple Reminders or move to dashboard?**
   - Recommendation: Stay in Reminders, they work as-is

3. **Should we enforce any tagging during daily note creation?**
   - Recommendation: No, keep friction low

4. **How often should dashboard auto-update?**
   - Current: On-demand (run script manually)
   - Recommendation: Keep manual for now, automate later if habit sticks

5. **Should unassigned tasks be a problem or a feature?**
   - Recommendation: Feature. Most tasks don't need projects. Projects are for grouping, not required.

## 12. Next Steps

**Immediate (today):**
1. Review this proposal
2. Decide: Proceed with redesign, modify, or abandon?

**If proceeding (this week):**
1. Fix gtdService.js dependency (1 hour)
2. Implement new dashboard design (2 hours)
3. Test with current data

**If successful (ongoing):**
1. Use dashboard for 1 week without changes
2. Process inbox during Sunday review
3. Iterate based on actual usage

## Appendix: Comparison Table

| Aspect | Current System | Proposed System |
|--------|---------------|-----------------|
| **Primary View** | Stats dashboard | Next actions list |
| **Tagging Required** | Yes (complex) | Minimal (dates + status) |
| **Daily Workflow** | Undefined | Scan dashboard (2 min) |
| **Weekly Workflow** | Undefined | Process inbox (15 min) |
| **Main Question Answered** | "How organized am I?" | "What should I do now?" |
| **Unassigned Tasks** | Problem (108!) | Expected (process weekly) |
| **Success Metric** | All tasks tagged | Dashboard regularly used |
| **Friction Point** | Requires discipline | Requires weekly review |
| **Value Proposition** | Organization | Action |

---

**Recommendation:** Implement this redesign. Current system is non-functional. Proposed system follows proven patterns from presentations dashboard and aligns with ruthless simplicity philosophy. Low risk (can revert), high potential value (actionable GTD).
