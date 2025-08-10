# obs-dailynotes Roadmap

## Immediate Tasks

### GTD System Improvements
- [x] Remove @ context system (redundant, conflicts with Obsidian extensions)
- [x] Rename 'evening' sync to just 'sync' for flexible timing
- [x] Fix missing 'daily' npm script
- [ ] Enable full editing of reminders in Obsidian (not just completion)
- [ ] Implement smarter tag detection with fuzzy matching
  - Auto-detect "email", "mail", "reply" → #email
  - Auto-detect "call", "phone" → #call
- [ ] Add natural language date parsing
  - "tomorrow", "next Friday", "in 2 weeks"
- [ ] Auto-detect and link people in task titles
  - "Call John Smith" → links to [[John Smith]]

### Privacy & Multi-Sync Strategy
- [ ] Implement folder structure with selective sync:
  - **`_private/`**: Personal only (Obsidian Sync only, never GitHub)
  - **`_shared/`**: Team collaboration (separate sync strategy needed)
  - **Regular folders**: GitHub private repo
- [ ] Set up multi-tier sync system:
  - **Obsidian Sync**: For all personal content including private folders
  - **GitHub Private Repo**: For non-sensitive content (excluding `_private/`)
  - **Team Sync Solution**: For `_shared/` folder collaboration
  - **Local Git Script**: Run on one machine to manage what gets pushed where
- [ ] Create git automation script that:
  - Respects `_private/` folder exclusions
  - Potentially pushes `_shared/` to separate team repository
  - Runs on a single designated machine
  - Allows Obsidian Sync to handle all content while GitHub gets filtered subset

### Team Collaboration Strategy (`_shared/` folder)
- [ ] Evaluate team sync options:
  - **Option 1**: Separate GitHub repo just for shared content
  - **Option 2**: Obsidian Sync with shared vault for team
  - **Option 3**: Syncthing or similar P2P solution
  - **Option 4**: Cloud service (Dropbox/Google Drive) for just `_shared/`
- [ ] Define shared content structure:
  - Project documentation
  - Meeting notes with multiple attendees
  - Shared resources and references
  - Team task lists
- [ ] Set up access controls:
  - Read-only vs read-write permissions
  - Team member onboarding process
  - Conflict resolution strategy

### Tag System Implementation
- [ ] Implement hierarchical/nested tags system for people (e.g., `people/professional/client`)
- [ ] Standardize all person pages to use array format for tags: `tags: [people]`
- [ ] Implement subcategory tags:
  - `people/personal/family`
  - `people/personal/friend`
  - `people/professional/colleague`
  - `people/professional/client`
  - `people/professional/investor`
  - `people/professional/advisor`
  - `people/research/collaborator`
- [ ] Add privacy/sharing markers:
  - `tags: [private]` - never leaves local machine
  - `tags: [shared]` - available to team
  - `tags: [public]` - can be shared publicly

## Short-term Improvements

### Organization
- [ ] Move all Python/JS files to `Scripts/` folder
- [ ] Move all PDFs to `Resources/PDFs/`
- [ ] Create proper folder hierarchy:
  - `People/`
  - `Meetings/`
  - `Organizations/`
  - `Projects/`
  - `Resources/`
  - `_private/` (local only, Obsidian Sync)
  - `_shared/` (team collaboration)
  - `_local/` (cache/drafts, never synced)

### Sync Architecture Implementation
- [ ] Configure `.gitignore`:
  ```gitignore
  _private/
  _local/
  .obsidian/workspace.json
  .DS_Store
  ```
- [ ] Set up `_shared/.gitignore` for team repo:
  ```gitignore
  **/private-*
  **/personal-*
  .obsidian/workspace.json
  ```
- [ ] Create sync scripts:
  - `sync-to-github.sh` - Main vault to GitHub (excluding private)
  - `sync-shared.sh` - Shared folder to team repository
  - `sync-status.sh` - Check sync status across all remotes

### Team Collaboration Features
- [ ] Create templates for shared content:
  - Shared meeting notes template
  - Project documentation template
  - Team task template
- [ ] Implement naming conventions for shared files
- [ ] Set up automated notifications for shared content changes

### PDF Integration System
- [ ] Create PDF metadata system with companion .md files
- [ ] Build Reading Queue dashboard
- [ ] Link PDFs to reminder system

## Medium-term Goals

### Automation
- [ ] Create pre-commit hooks:
  - Check for private tags in public repos
  - Validate shared content format
  - Ensure proper file locations
- [ ] Build script to automatically segregate files by privacy level
- [ ] Implement automated file organization based on tags
- [ ] Enhance git scripts to handle:
  - Automatic daily commits
  - Smart commit messages
  - Conflict resolution between multiple sync sources
  - Team member change notifications

### Enhanced Features
- [ ] Person page enrichment (last_contact, relationship type)
- [ ] Smart lists for Obsidian (people to reconnect with, pending readings)
- [ ] Meeting notes standardization
- [ ] Team dashboard showing recent shared updates

## Long-term Vision

### System Integration
- [ ] Full GTD integration with all document types
- [ ] Automated reminder generation from PDFs and documents
- [ ] Cross-platform sync with privacy preservation
- [ ] Team task management integration

### Archive Strategy
- [ ] Implement inactive contact archiving
- [ ] Old meeting archival system
- [ ] Completed project cleanup automation
- [ ] Shared content retention policies

### Advanced Team Features
- [ ] Real-time collaboration on shared documents
- [ ] Version control with blame/attribution
- [ ] Team member activity dashboard
- [ ] Automated team reports generation

## Notes from Conversations

_This section captures ideas and decisions from our ongoing discussions_

### 2025-08-09
- **Three-tier sync strategy**:
  - `_private/`: Personal only (Obsidian Sync only)
  - `_shared/`: Team collaboration (needs separate sync solution)
  - Regular content: GitHub private repo
- **Single machine git approach**: One designated machine will run git scripts to push filtered content to GitHub
- **Team collaboration needs**: Share specific content with team members while maintaining personal privacy
- **Folder naming convention**: Use underscore prefix (`_`) for special folders with custom sync rules
- Use nested tags with forward slashes in YAML for hierarchical organization
- Both folder-based (`_private/`, `_shared/`) and tag-based (`tags: [private]`, `tags: [shared]`) approaches will be supported

### Implementation Considerations for `_shared/` folder:
1. **Separate Repository Approach** (Recommended):
   - Create `team-switchboard` GitHub repo
   - Only `_shared/` contents get pushed there
   - Team members clone just this repo
   - Simpler permissions management

2. **Symlink Approach**:
   - Team members have separate checkout of shared repo
   - Symlink `_shared/` to their Obsidian vault
   - Allows integration while maintaining separation

3. **Branch Strategy**:
   - Use `shared` branch in main repo
   - Only `_shared/` folder exists in this branch
   - Team members track only this branch

---

*Last updated: 2025-08-09*