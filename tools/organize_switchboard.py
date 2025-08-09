#!/usr/bin/env python3
"""
Organize and clean up the switchboard directory
"""

import os
import re
import shutil
from pathlib import Path

SWITCHBOARD = '/Users/<Owner>/switchboard'

def standardize_tags():
    """Fix tag format in all markdown files"""
    print("\n📝 Standardizing tags format...")
    count = 0
    
    for file in Path(SWITCHBOARD).glob('*.md'):
        if file.is_file():
            try:
                content = file.read_text(encoding='utf-8')
                original = content
                
                # Replace tags: people with tags: [people]
                content = re.sub(r'^tags: people$', 'tags: [people]', content, flags=re.MULTILINE)
                
                # Replace tags: org_p, stub with tags: [org_p, stub]
                content = re.sub(r'^tags: (org_p|stub|litnote)$', r'tags: [\1]', content, flags=re.MULTILINE)
                content = re.sub(r'^tags: (org_p, stub)$', r'tags: [\1]', content, flags=re.MULTILINE)
                
                if content != original:
                    file.write_text(content, encoding='utf-8')
                    print(f"  ✓ {file.name}")
                    count += 1
                    
            except Exception as e:
                print(f"  ✗ Error with {file.name}: {e}")
    
    print(f"  Updated {count} files")
    return count

def create_directories():
    """Create organized directory structure"""
    print("\n📁 Creating directory structure...")
    
    dirs = [
        'People',
        'People/_archive',
        'Meetings/2021',
        'Meetings/2022', 
        'Meetings/2023',
        'Meetings/2024',
        'Meetings/2025',
        'Organizations',
        'Projects',
        'Resources/PDFs',
        'Resources/Images',
        'Resources/Templates',
        'Scripts',
        'Config',
        'Literature'  # For lit notes
    ]
    
    for d in dirs:
        dir_path = Path(SWITCHBOARD) / d
        dir_path.mkdir(parents=True, exist_ok=True)
        if not any(dir_path.iterdir()):  # Only print if newly created/empty
            print(f"  ✓ Created {d}/")

def organize_files():
    """Move files to appropriate directories"""
    print("\n🚀 Organizing files...")
    
    moves = {
        'scripts': 0,
        'pdfs': 0,
        'images': 0,
        'meetings': 0
    }
    
    # Move Python/JS files to Scripts/
    for pattern in ['*.py', '*.js']:
        for file in Path(SWITCHBOARD).glob(pattern):
            if file.is_file() and file.parent == Path(SWITCHBOARD):
                dest = Path(SWITCHBOARD) / 'Scripts' / file.name
                if not dest.exists():
                    shutil.move(str(file), str(dest))
                    print(f"  → Moved {file.name} to Scripts/")
                    moves['scripts'] += 1
    
    # Move PDFs to Resources/PDFs/
    for pdf in Path(SWITCHBOARD).glob('*.pdf'):
        if pdf.is_file() and pdf.parent == Path(SWITCHBOARD):
            dest = Path(SWITCHBOARD) / 'Resources' / 'PDFs' / pdf.name
            if not dest.exists():
                shutil.move(str(pdf), str(dest))
                print(f"  → Moved {pdf.name} to Resources/PDFs/")
                moves['pdfs'] += 1
    
    # Move screenshots and images to Resources/Images/
    for pattern in ['Screenshot*.png', 'Screen Shot*.png', '*.png', '*.jpg', '*.jpeg']:
        for img in Path(SWITCHBOARD).glob(pattern):
            if img.is_file() and img.parent == Path(SWITCHBOARD):
                dest = Path(SWITCHBOARD) / 'Resources' / 'Images' / img.name
                if not dest.exists():
                    shutil.move(str(img), str(dest))
                    print(f"  → Moved {img.name} to Resources/Images/")
                    moves['images'] += 1
    
    # Move meeting notes based on date patterns
    meeting_pattern = re.compile(r'^(\d{4})-(\d{2})-(\d{2})')
    for file in Path(SWITCHBOARD).glob('*.md'):
        if file.is_file() and file.parent == Path(SWITCHBOARD):
            match = meeting_pattern.match(file.name)
            if match:
                year = match.group(1)
                dest_dir = Path(SWITCHBOARD) / 'Meetings' / year
                dest_dir.mkdir(parents=True, exist_ok=True)
                dest = dest_dir / file.name
                if not dest.exists():
                    shutil.move(str(file), str(dest))
                    print(f"  → Moved {file.name} to Meetings/{year}/")
                    moves['meetings'] += 1
    
    print(f"\n  Summary: {moves['scripts']} scripts, {moves['pdfs']} PDFs, {moves['images']} images, {moves['meetings']} meetings moved")

def create_pdf_reading_template():
    """Create template for PDF metadata"""
    print("\n📚 Creating PDF reading template...")
    
    template = """---
type: pdf-metadata
file: Resources/PDFs/{{filename}}
tags: [reading/pending]
author: 
related_person: 
priority: normal
estimated_time: 
due_date: 
reminder_id: 
---

# {{title}}

## Summary
(To be filled after reading)

## Key Points
- 

## Action Items
- [ ] Read document
- [ ] Take notes
- [ ] Follow up if needed

## Notes

"""
    
    template_path = Path(SWITCHBOARD) / 'Resources' / 'Templates' / 'pdf-metadata.md'
    template_path.parent.mkdir(parents=True, exist_ok=True)
    template_path.write_text(template)
    print(f"  ✓ Created PDF metadata template")

def create_reading_queue():
    """Create reading queue dashboard"""
    print("\n📖 Creating reading queue dashboard...")
    
    dashboard = """# Reading Queue

## 🔴 High Priority
\`\`\`dataview
TABLE file.link AS "Document", author AS "Author", due_date AS "Due", estimated_time AS "Time"
FROM "Resources/PDFs"
WHERE contains(tags, "reading/pending") AND priority = "high"
SORT due_date ASC
\`\`\`

## 📅 Due This Week
\`\`\`dataview
TABLE file.link AS "Document", author AS "Author", estimated_time AS "Time"
FROM "Resources/PDFs"
WHERE contains(tags, "reading/pending") AND due_date <= date(today) + dur(7 days)
SORT due_date ASC
\`\`\`

## 📚 All Pending
\`\`\`dataview
TABLE file.link AS "Document", author AS "Author", priority AS "Priority"
FROM "Resources/PDFs"
WHERE contains(tags, "reading/pending")
SORT priority DESC, file.name ASC
\`\`\`

## ✅ Recently Completed
\`\`\`dataview
TABLE file.link AS "Document", author AS "Author"
FROM "Resources/PDFs"
WHERE contains(tags, "reading/completed")
SORT file.mtime DESC
LIMIT 10
\`\`\`
"""
    
    queue_path = Path(SWITCHBOARD) / 'Reading-Queue.md'
    queue_path.write_text(dashboard)
    print(f"  ✓ Created Reading Queue dashboard")

def generate_report():
    """Generate organization report"""
    print("\n📊 Analyzing current state...")
    
    # Count files by type
    all_files = list(Path(SWITCHBOARD).glob('*'))
    md_files = [f for f in all_files if f.suffix == '.md' and f.is_file()]
    
    # Check for person pages (rough heuristic)
    person_pages = []
    for f in md_files:
        try:
            content = f.read_text(encoding='utf-8')
            if 'tags:' in content and 'people' in content:
                person_pages.append(f.name)
        except:
            pass
    
    print(f"""
  Files in root: {len([f for f in all_files if f.is_file() and f.parent == Path(SWITCHBOARD)])}
  Markdown files: {len(md_files)}
  Likely person pages: {len(person_pages)}
  PDFs: {len(list(Path(SWITCHBOARD).glob('**/*.pdf')))}
  Images: {len(list(Path(SWITCHBOARD).glob('**/*.png'))) + len(list(Path(SWITCHBOARD).glob('**/*.jpg')))}
  Scripts: {len(list(Path(SWITCHBOARD).glob('**/*.py'))) + len(list(Path(SWITCHBOARD).glob('**/*.js')))}
  """)

if __name__ == "__main__":
    print("=" * 50)
    print("SWITCHBOARD ORGANIZATION SCRIPT")
    print("=" * 50)
    
    # Get initial state
    generate_report()
    
    # Run cleanup
    standardize_tags()
    create_directories()
    organize_files()
    create_pdf_reading_template()
    create_reading_queue()
    
    print("\n✅ Organization complete!")
    print("\nNext steps:")
    print("  1. Review Reading-Queue.md for PDF management")
    print("  2. Check organized folders in switchboard/")
    print("  3. Consider moving person pages to People/ folder")
    print("  4. Create metadata files for important PDFs")