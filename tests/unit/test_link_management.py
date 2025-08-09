"""
Unit tests for link management and integrity
"""

import pytest
from pathlib import Path
import sys
import re

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'tools'))

class TestLinkExtraction:
    """Test link extraction from markdown content"""
    
    def test_extract_wikilinks(self):
        """Test extraction of wiki-style links"""
        content = """
        Some text with [[Person Name]] and ![[image.png]].
        Also ![[Resources/PDFs/document.pdf]] here.
        """
        
        # Extract all wikilinks
        pattern = r'!?\[\[([^\]]+)\]\]'
        links = re.findall(pattern, content)
        
        assert 'Person Name' in links
        assert 'image.png' in links
        assert 'Resources/PDFs/document.pdf' in links
        assert len(links) == 3
    
    def test_extract_markdown_links(self):
        """Test extraction of standard markdown links"""
        content = """
        Here's an [external link](https://example.com)
        And an ![image](local-image.png)
        Plus a [document](Resources/document.pdf)
        """
        
        # Extract markdown links (focusing on local files)
        pattern = r'!?\[([^\]]*)\]\(([^)]+)\)'
        matches = re.findall(pattern, content)
        links = [match[1] for match in matches if not match[1].startswith('http')]
        
        assert 'local-image.png' in links
        assert 'Resources/document.pdf' in links
        assert len(links) == 2
    
    def test_mixed_link_formats(self):
        """Test extraction of mixed link formats"""
        content = """
        ![[wikilink.pdf]]
        ![markdown](image.png)
        [[Person Page]]
        [Regular Link](document.pdf)
        """
        
        all_links = []
        
        # Wikilinks
        wiki_pattern = r'!?\[\[([^\]]+)\]\]'
        all_links.extend(re.findall(wiki_pattern, content))
        
        # Markdown links
        md_pattern = r'!?\[[^\]]*\]\(([^)]+)\)'
        md_links = re.findall(md_pattern, content)
        all_links.extend([link for link in md_links if not link.startswith('http')])
        
        assert 'wikilink.pdf' in all_links
        assert 'Person Page' in all_links
        assert 'image.png' in all_links
        assert 'document.pdf' in all_links


class TestLinkUpdating:
    """Test link updating when files move"""
    
    def test_update_wikilink_path(self):
        """Test updating wikilink to new path"""
        content = "![[document.pdf]]"
        old_name = "document.pdf"
        new_path = "Resources/PDFs/document.pdf"
        
        updated = content.replace(f'![[{old_name}]]', f'![[{new_path}]]')
        
        assert updated == "![[Resources/PDFs/document.pdf]]"
        assert f'![[{old_name}]]' not in updated  # Check the full link pattern
    
    def test_update_multiple_links(self):
        """Test updating multiple links in same document"""
        content = """
        First reference: ![[test.pdf]]
        Second reference: ![[test.pdf]]
        Different file: ![[other.pdf]]
        """
        
        # Update test.pdf
        updated = content.replace('![[test.pdf]]', '![[Resources/PDFs/test.pdf]]')
        
        assert updated.count('![[Resources/PDFs/test.pdf]]') == 2
        assert '![[other.pdf]]' in updated
        assert '![[test.pdf]]' not in updated
    
    def test_preserve_partial_matches(self):
        """Test that partial filename matches aren't affected"""
        content = """
        ![[test.pdf]]
        ![[test.pdf.backup]]
        ![[another-test.pdf]]
        """
        
        # Only update exact match
        updated = content.replace('![[test.pdf]]', '![[Resources/PDFs/test.pdf]]')
        
        assert '![[Resources/PDFs/test.pdf]]' in updated
        assert '![[test.pdf.backup]]' in updated  # Unchanged
        assert '![[another-test.pdf]]' in updated  # Unchanged
    
    def test_update_with_spaces(self):
        """Test updating filenames with spaces"""
        content = '![[Screen Shot 2025-08-09.png]]'
        old_name = 'Screen Shot 2025-08-09.png'
        new_path = 'Resources/Images/Screen Shot 2025-08-09.png'
        
        updated = content.replace(f'![[{old_name}]]', f'![[{new_path}]]')
        
        assert updated == '![[Resources/Images/Screen Shot 2025-08-09.png]]'


class TestBrokenLinkDetection:
    """Test detection of broken links"""
    
    def test_find_broken_links_in_vault(self, temp_vault):
        """Test finding broken links in a vault"""
        # Create a file with links
        md_file = temp_vault / "test.md"
        md_file.write_text("""
        ![[exists.pdf]]
        ![[does-not-exist.pdf]]
        [[Existing Person]]
        [[Missing Person]]
        """)
        
        # Create some of the linked files
        (temp_vault / "exists.pdf").touch()
        (temp_vault / "Existing Person.md").write_text("# Existing Person")
        
        # Find broken links
        broken_links = []
        content = md_file.read_text()
        
        # Extract all links
        wiki_pattern = r'!?\[\[([^\]]+)\]\]'
        links = re.findall(wiki_pattern, content)
        
        for link in links:
            # Check if file exists
            if not link.startswith('http'):
                # Try with .md extension for person pages
                link_path = temp_vault / link
                link_path_md = temp_vault / f"{link}.md"
                
                if not link_path.exists() and not link_path_md.exists():
                    broken_links.append(link)
        
        assert 'does-not-exist.pdf' in broken_links
        assert 'Missing Person' in broken_links
        assert 'exists.pdf' not in broken_links
        assert 'Existing Person' not in broken_links
    
    def test_validate_relative_paths(self):
        """Test validation of relative path links"""
        content = """
        ![[Resources/PDFs/document.pdf]]
        ![[../outside-vault.pdf]]
        ![[/absolute/path.pdf]]
        """
        
        # Find potentially problematic paths
        wiki_pattern = r'!?\[\[([^\]]+)\]\]'
        links = re.findall(wiki_pattern, content)
        
        problematic = []
        for link in links:
            if link.startswith('../') or link.startswith('/'):
                problematic.append(link)
        
        assert '../outside-vault.pdf' in problematic
        assert '/absolute/path.pdf' in problematic
        assert 'Resources/PDFs/document.pdf' not in problematic


class TestLinkHelpers:
    """Test helper functions for link management"""
    
    def test_normalize_link_path(self):
        """Test path normalization"""
        tests = [
            ('document.pdf', 'document.pdf'),
            ('./document.pdf', 'document.pdf'),
            ('Resources//PDFs//document.pdf', 'Resources/PDFs/document.pdf'),
            ('Resources/./PDFs/document.pdf', 'Resources/PDFs/document.pdf'),
        ]
        
        for input_path, expected in tests:
            # Simple normalization
            normalized = input_path.replace('//', '/').replace('/./', '/')
            if normalized.startswith('./'):
                normalized = normalized[2:]
            
            assert normalized == expected
    
    def test_link_type_detection(self):
        """Test detection of link types"""
        def get_link_type(link):
            if link.startswith('http://') or link.startswith('https://'):
                return 'external'
            elif link.endswith(('.png', '.jpg', '.jpeg', '.gif')):
                return 'image'
            elif link.endswith('.pdf'):
                return 'pdf'
            elif link.endswith('.md') or not '.' in link.split('/')[-1]:
                return 'markdown'
            else:
                return 'other'
        
        assert get_link_type('https://example.com') == 'external'
        assert get_link_type('image.png') == 'image'
        assert get_link_type('document.pdf') == 'pdf'
        assert get_link_type('Person Name') == 'markdown'
        assert get_link_type('notes.md') == 'markdown'
        assert get_link_type('data.csv') == 'other'