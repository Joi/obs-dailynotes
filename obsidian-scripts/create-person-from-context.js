// Templater script for creating person pages with context extraction
// Place this in your Obsidian vault and call it from Templater

async function createPersonFromContext(tp) {
    // Get the file name (person's name)
    const fileName = tp.file.title;
    
    // Get the file that triggered this creation (likely your daily note)
    const activeFile = app.workspace.getActiveFile();
    let extractedEmail = "";
    let extractedContext = [];
    
    if (activeFile) {
        const content = await app.vault.read(activeFile);
        const lines = content.split('\n');
        
        // Search for mentions of this person and nearby emails
        const personNameVariations = [
            fileName,
            fileName.toLowerCase(),
            fileName.split(' ')[0], // First name only
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if line mentions the person
            let mentionFound = false;
            for (const variation of personNameVariations) {
                if (line.includes(variation) || line.includes(`[[${variation}]]`)) {
                    mentionFound = true;
                    break;
                }
            }
            
            if (mentionFound) {
                // Look for emails in the same line and nearby lines
                const contextStart = Math.max(0, i - 2);
                const contextEnd = Math.min(lines.length - 1, i + 2);
                
                for (let j = contextStart; j <= contextEnd; j++) {
                    const contextLine = lines[j];
                    
                    // Extract email if found
                    const emailMatch = contextLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                    if (emailMatch && !extractedEmail) {
                        extractedEmail = emailMatch[1].toLowerCase();
                    }
                    
                    // Collect context
                    if (contextLine.trim()) {
                        extractedContext.push(contextLine.trim());
                    }
                }
            }
        }
    }
    
    // Search through recent daily notes for more context
    const recentDailies = app.vault.getMarkdownFiles()
        .filter(f => f.path.includes('dailynote'))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, 10); // Last 10 daily notes
    
    const meetings = [];
    for (const file of recentDailies) {
        const content = await app.vault.read(file);
        if (content.includes(fileName) || content.includes(`[[${fileName}]]`)) {
            // Extract meeting context
            const meetingMatch = content.match(new RegExp(`###.*?${fileName}.*?\n(.*?)(?=\n###|\n##|$)`, 's'));
            if (meetingMatch) {
                const date = file.basename;
                meetings.push(`- [[${date}]]: ${meetingMatch[0].split('\n')[0].replace(/^###\s*/, '')}`);
            }
        }
    }
    
    // Build the frontmatter
    const emails = extractedEmail ? `[${extractedEmail}]` : '[]';
    
    // Generate the person page content
    let content = `---
tags: person
name: ${fileName}
emails: ${emails}
aliases: []
reminders:
  listName: "${fileName}"
---

# ${fileName}

## Bio
- Organization and Role: 
- Background: 
- LinkedIn: 
- Location: 

## Contact
- Email: ${extractedEmail || ''}
- Phone: 
- Assistant: 

## Connection
- How we met: 
- Introduced by: 
- Topics of mutual interest: 

## Meetings & Notes
${meetings.join('\n')}

## Context from Daily Notes
${extractedContext.length > 0 ? extractedContext.map(c => `- ${c}`).join('\n') : '- No context found'}

## Action Items
- [ ] Add contact details
- [ ] Update bio information
- [ ] Create Reminders list if needed

---
*Created: ${tp.date.now("YYYY-MM-DD HH:mm")}*
*Source: ${activeFile ? activeFile.path : 'Manual creation'}*
`;
    
    return content;
}

module.exports = createPersonFromContext;