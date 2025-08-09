#!/usr/bin/env python3
"""
Fix links to files in Attachments folder
"""

import os
import re
from pathlib import Path

SWITCHBOARD = '/Users/joi/switchboard'

def fix_attachment_links(file_path):
    """Fix links to point to Attachments folder"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = []
        
        # Pattern to find Screen Shot references without path
        pattern = r'!\[\[(Screen Shot [^]]+\.png)\]\]'
        
        def replace_with_path(match):
            filename = match.group(1)
            # Check if file exists in Attachments
            attachment_path = Path(SWITCHBOARD) / 'Attachments' / filename
            if attachment_path.exists():
                changes_made.append(f"  {filename} → Attachments/{filename}")
                return f'![[Attachments/{filename}]]'
            return match.group(0)
        
        content = re.sub(pattern, replace_with_path, content)
        
        # Save if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made
        
        return None
        
    except Exception as e:
        print(f"  ✗ Error processing {file_path}: {e}")
        return None

def main():
    print("🔧 Fixing links to Attachments folder...")
    print("=" * 50)
    
    # Files that need fixing based on grep results
    files_to_fix = [
        'dailynote/2021-07-28.md',
        'dailynote/2021-11-30.md',
        'dailynote/2022-08-09.md',
        'dailynote/2022-04-01.md',
        'dailynote/2021-07-16.md',
        'dailynote/2021-09-21.md',
        'dailynote/2021-10-04.md',
        'dailynote/2022-02-02.md',
        'dailynote/2022-07-18.md',
        'dailynote/2021-07-21.md',
        'dailynote/2022-08-04.md',
        'dailynote/2021-12-22.md',
        'dailynote/2021-12-16.md',
        'dailynote/2021-12-06.md',
        'dailynote/2022-08-01.md',
        'dailynote/2022-06-28.md',
        'Kio Ito.md',
        'litnotes/@itoPracticeChange2018.md',
        'Meetings/2021/2021-08-04-1400 DA Exec Member Meeting 3.md',
    ]
    
    files_fixed = 0
    total_fixes = 0
    
    for file_rel in files_to_fix:
        file_path = os.path.join(SWITCHBOARD, file_rel)
        if os.path.exists(file_path):
            changes = fix_attachment_links(file_path)
            if changes:
                print(f"\n✓ Fixed {file_rel}:")
                for change in changes:
                    print(change)
                files_fixed += 1
                total_fixes += len(changes)
    
    print("\n" + "=" * 50)
    print(f"✅ Complete!")
    print(f"  Files updated: {files_fixed}")
    print(f"  Links fixed: {total_fixes}")

if __name__ == "__main__":
    main()