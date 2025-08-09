#!/usr/bin/env python3
"""
Fix broken links after moving files to organized folders
"""

import os
import re
from pathlib import Path

SWITCHBOARD = '/Users/joi/switchboard'

# Map of moved files to their new locations
MOVED_FILES = {
    # PDFs
    '20230904_6th_SteerCo_vShared.pdf': 'Resources/PDFs/20230904_6th_SteerCo_vShared.pdf',
    'ECB2022_Prototype_Onboarding_UTXO_2.pdf': 'Resources/PDFs/ECB2022_Prototype_Onboarding_UTXO_2.pdf',
    '麻布台ヒルズ レジデンスAアクセスマップ【送迎車・タクシー】_20231011.pdf': 'Resources/PDFs/麻布台ヒルズ レジデンスAアクセスマップ【送迎車・タクシー】_20231011.pdf',
    
    # Images - Screenshots
    'Screenshot 2022-11-09 at 11.00.43.png': 'Resources/Images/Screenshot 2022-11-09 at 11.00.43.png',
    'Screenshot 2025-01-23 at 14.21.17.png': 'Resources/Images/Screenshot 2025-01-23 at 14.21.17.png',
    'Screenshot 2023-06-07 at 14.32.49.png': 'Resources/Images/Screenshot 2023-06-07 at 14.32.49.png',
    'Screenshot 2023-08-13 at 15.35.04.png': 'Resources/Images/Screenshot 2023-08-13 at 15.35.04.png',
    'Screenshot 2023-10-23 at 9.32.19.png': 'Resources/Images/Screenshot 2023-10-23 at 9.32.19.png',
    'Screenshot 2023-06-06 at 14.02.18 1.png': 'Resources/Images/Screenshot 2023-06-06 at 14.02.18 1.png',
    'Screenshot 2024-05-01 at 7.02.25.png': 'Resources/Images/Screenshot 2024-05-01 at 7.02.25.png',
    'Screenshot 2025-05-20 at 12.20.26.png': 'Resources/Images/Screenshot 2025-05-20 at 12.20.26.png',
    'Screenshot 2023-01-20 at 13.27.46.png': 'Resources/Images/Screenshot 2023-01-20 at 13.27.46.png',
    'Screenshot 2022-12-15 at 12.16.57.png': 'Resources/Images/Screenshot 2022-12-15 at 12.16.57.png',
    'Screenshot 2023-06-22 at 6.19.12.png': 'Resources/Images/Screenshot 2023-06-22 at 6.19.12.png',
    'Screenshot 2022-12-15 at 12.26.34.png': 'Resources/Images/Screenshot 2022-12-15 at 12.26.34.png',
    'Screenshot 2023-06-07 at 14.33.54.png': 'Resources/Images/Screenshot 2023-06-07 at 14.33.54.png',
    'Screenshot 2023-02-02 at 9.46.15.png': 'Resources/Images/Screenshot 2023-02-02 at 9.46.15.png',
    'Screenshot 2024-05-30 at 7.17.40.png': 'Resources/Images/Screenshot 2024-05-30 at 7.17.40.png',
    'Screenshot 2023-06-07 at 14.30.38.png': 'Resources/Images/Screenshot 2023-06-07 at 14.30.38.png',
    'Screenshot 2023-08-13 at 15.42.20.png': 'Resources/Images/Screenshot 2023-08-13 at 15.42.20.png',
    'Screenshot 2023-01-31 at 11.01.24.png': 'Resources/Images/Screenshot 2023-01-31 at 11.01.24.png',
    'Screenshot 2023-08-13 at 15.37.47.png': 'Resources/Images/Screenshot 2023-08-13 at 15.37.47.png',
    'Screenshot 2024-03-18 at 5.10.42.png': 'Resources/Images/Screenshot 2024-03-18 at 5.10.42.png',
    'Screenshot 2024-05-18 at 17.41.41.png': 'Resources/Images/Screenshot 2024-05-18 at 17.41.41.png',
    'Screenshot 2023-08-13 at 15.35.52.png': 'Resources/Images/Screenshot 2023-08-13 at 15.35.52.png',
    'Screenshot 2023-06-06 at 14.02.18.png': 'Resources/Images/Screenshot 2023-06-06 at 14.02.18.png',
    'Screenshot 2023-06-07 at 14.32.21.png': 'Resources/Images/Screenshot 2023-06-07 at 14.32.21.png',
    'Screenshot 2025-06-18 at 6.11.53.png': 'Resources/Images/Screenshot 2025-06-18 at 6.11.53.png',
    'Screenshot 2022-12-21 at 16.13.04.png': 'Resources/Images/Screenshot 2022-12-21 at 16.13.04.png',
    'Screenshot 2023-06-26 at 11.58.49.png': 'Resources/Images/Screenshot 2023-06-26 at 11.58.49.png',
    'Screenshot 2023-06-26 at 11.57.27.png': 'Resources/Images/Screenshot 2023-06-26 at 11.57.27.png',
    'Screenshot 2023-01-20 at 13.28.40.png': 'Resources/Images/Screenshot 2023-01-20 at 13.28.40.png',
    'Screenshot 2022-12-28 at 8.01.22.png': 'Resources/Images/Screenshot 2022-12-28 at 8.01.22.png',
    'Screenshot 2023-06-07 at 14.30.51.png': 'Resources/Images/Screenshot 2023-06-07 at 14.30.51.png',
    
    # Screen Shots (with space)
    'Screen Shot 2022-09-27 at 7.22.49.png': 'Resources/Images/Screen Shot 2022-09-27 at 7.22.49.png',
    'Screen Shot 2022-10-11 at 15.06.49.png': 'Resources/Images/Screen Shot 2022-10-11 at 15.06.49.png',
    'Screen Shot 2022-10-11 at 15.05.43.png': 'Resources/Images/Screen Shot 2022-10-11 at 15.05.43.png',
    
    # Japanese screenshot
    'スクリーンショット 2024-11-21 16.56.03.png': 'Resources/Images/スクリーンショット 2024-11-21 16.56.03.png',
    
    # Pasted images
    'Pasted image 20230905025353.png': 'Resources/Images/Pasted image 20230905025353.png',
}

def fix_links_in_file(file_path):
    """Fix broken links in a single markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = []
        
        # Fix each moved file reference
        for old_name, new_path in MOVED_FILES.items():
            # Pattern 1: Wikilinks ![[filename]]
            old_pattern = f'![[{old_name}]]'
            new_pattern = f'![[{new_path}]]'
            if old_pattern in content:
                content = content.replace(old_pattern, new_pattern)
                changes_made.append(f"  {old_name} → {new_path}")
            
            # Pattern 2: Markdown links ![](filename)
            old_pattern2 = f']({old_name})'
            new_pattern2 = f']({new_path})'
            if old_pattern2 in content:
                content = content.replace(old_pattern2, new_pattern2)
                changes_made.append(f"  {old_name} → {new_path}")
        
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
    print("🔧 Fixing broken links after file reorganization...")
    print("=" * 50)
    
    # Get all markdown files
    md_files = []
    for root, dirs, files in os.walk(SWITCHBOARD):
        # Skip the Attachments folder since those weren't moved
        if 'Attachments' in root:
            continue
        for file in files:
            if file.endswith('.md'):
                md_files.append(os.path.join(root, file))
    
    print(f"📝 Scanning {len(md_files)} markdown files...")
    
    files_fixed = 0
    total_fixes = 0
    
    for md_file in md_files:
        changes = fix_links_in_file(md_file)
        if changes:
            rel_path = os.path.relpath(md_file, SWITCHBOARD)
            print(f"\n✓ Fixed {rel_path}:")
            for change in changes:
                print(change)
            files_fixed += 1
            total_fixes += len(changes)
    
    print("\n" + "=" * 50)
    print(f"✅ Complete!")
    print(f"  Files updated: {files_fixed}")
    print(f"  Links fixed: {total_fixes}")
    
    # Also check for any remaining broken references
    print("\n🔍 Checking for any remaining broken references...")
    remaining_broken = []
    
    for md_file in md_files:
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for references to moved files that might have been missed
            for old_name in MOVED_FILES.keys():
                if old_name in content and f'Resources/' not in content:
                    rel_path = os.path.relpath(md_file, SWITCHBOARD)
                    remaining_broken.append(f"  {rel_path} still references {old_name}")
        except:
            pass
    
    if remaining_broken:
        print("⚠️  Some references might still be broken:")
        for item in remaining_broken[:10]:  # Show first 10
            print(item)
    else:
        print("  ✓ No remaining broken references found!")

if __name__ == "__main__":
    main()