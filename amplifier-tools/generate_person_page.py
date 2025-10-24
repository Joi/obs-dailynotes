#!/usr/bin/env python3
"""
Generate enriched person pages for obs-dailynotes using AI.

Usage:
    python amplifier-tools/generate_person_page.py <email>
    python amplifier-tools/generate_person_page.py --name "Person Name" --email "person@example.com"

Examples:
    python amplifier-tools/generate_person_page.py joi@ito.com
    python amplifier-tools/generate_person_page.py --name "Joichi Ito" --email "joi@ito.com" --company "Digital Garage"
"""

import sys
import os
from pathlib import Path
import json
import re

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from utils.claude_helpers import ask_claude, write_file


def extract_name_from_email(email: str) -> str:
    """Extract likely name from email address"""
    local = email.split('@')[0]
    # Convert joi.ito -> Joichi Ito, john.doe -> John Doe
    parts = local.replace('.', ' ').replace('_', ' ').split()
    return ' '.join(word.capitalize() for word in parts)


def get_people_directory() -> Path:
    """Find the people directory in obs-dailynotes"""
    # Check common locations
    candidates = [
        Path.home() / "obs-dailynotes" / "people",
        Path.home() / "switchboard" / "people",
        Path.cwd() / "people",
    ]

    for path in candidates:
        if path.exists() and path.is_dir():
            return path

    # Default: create in project root
    default_path = Path.cwd() / "people"
    default_path.mkdir(parents=True, exist_ok=True)
    return default_path


def sanitize_filename(name: str) -> str:
    """Convert name to safe filename"""
    # Remove special characters, keep spaces and hyphens
    safe = re.sub(r'[^\w\s-]', '', name)
    # Replace spaces with hyphens, collapse multiple
    safe = re.sub(r'[-\s]+', '-', safe)
    return safe.strip('-')


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Generate enriched person pages')
    parser.add_argument('email', nargs='?', help='Email address')
    parser.add_argument('--name', help='Person name (optional)')
    parser.add_argument('--email', dest='email_flag', help='Email address via flag')
    parser.add_argument('--company', help='Company name (optional)')
    parser.add_argument('--context', help='Additional context (optional)')

    args = parser.parse_args()

    # Get email from positional or flag
    email = args.email or args.email_flag

    if not email:
        print("❌ Error: Email address required")
        print("Usage: python amplifier-tools/generate_person_page.py <email>")
        print("   or: python amplifier-tools/generate_person_page.py --email <email> --name \"Name\"")
        sys.exit(1)

    # Get or infer name
    name = args.name or extract_name_from_email(email)

    print(f"📧 Generating person page for: {name} ({email})")

    # Build context for Claude
    person_data = f"""
Email: {email}
Name: {name}
"""

    if args.company:
        person_data += f"Company: {args.company}\n"

    if args.context:
        person_data += f"Additional Context: {args.context}\n"

    print(f"🤖 Asking Claude to generate enriched person page...")

    try:
        # Generate page using Claude
        page_content = ask_claude(
            prompt_template="person_page_generation.md",
            context={"person_data": person_data},
            max_tokens=2000,
        )

        # Clean up response (remove markdown code blocks if present)
        if page_content.startswith("```"):
            lines = page_content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            page_content = "\n".join(lines)

        # Determine output path
        people_dir = get_people_directory()
        filename = sanitize_filename(name) + ".md"
        output_path = people_dir / filename

        # Write the file
        write_file(output_path, page_content)

        print(f"✅ Generated person page: {output_path}")
        print(f"\n💡 Next steps:")
        print(f"   1. Review the page: {output_path}")
        print(f"   2. Edit as needed for accuracy")
        print(f"   3. Update people.json index if you maintain one")
        print(f"   4. Link from relevant daily notes or meeting notes")

    except Exception as e:
        print(f"❌ Error generating person page: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
