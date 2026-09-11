#!/usr/bin/env python3
"""Add Vercel Speed Insights to all generated HTML files."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

SPEED_INSIGHTS_SCRIPT = """  <script>window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};</script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
"""

# Directories to skip
SKIP_DIRS = {".git", "node_modules", "static", "data", "templates", "scripts", "tests", "docs"}

def add_speed_insights_to_file(html_path):
    """Add Speed Insights script to an HTML file if not already present."""
    try:
        content = html_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"✗ Error reading {html_path}: {e}")
        return False
    
    # Skip if already has Speed Insights
    if "speed-insights" in content:
        return False
    
    # Find the closing </head> tag and insert before it
    if "</head>" not in content:
        return False
    
    # Insert Speed Insights script before </head>
    updated_content = content.replace("</head>", f"{SPEED_INSIGHTS_SCRIPT}</head>", 1)
    
    try:
        html_path.write_text(updated_content, encoding="utf-8")
        return True
    except Exception as e:
        print(f"✗ Error writing {html_path}: {e}")
        return False

def should_skip_dir(path):
    """Check if directory should be skipped."""
    parts = path.parts
    return any(skip_dir in parts for skip_dir in SKIP_DIRS)

def main():
    """Process all HTML files."""
    print("Adding Vercel Speed Insights to generated HTML files...\n")
    
    updated_count = 0
    checked_count = 0
    
    # Find all HTML files recursively
    for html_path in ROOT.rglob("*.html"):
        # Skip files in excluded directories
        if should_skip_dir(html_path.relative_to(ROOT)):
            continue
        
        checked_count += 1
        if add_speed_insights_to_file(html_path):
            updated_count += 1
            rel_path = html_path.relative_to(ROOT)
            if updated_count <= 20:  # Only print first 20 to avoid spam
                print(f"✓ Updated {rel_path}")
    
    print(f"\nChecked {checked_count} files")
    print(f"Updated {updated_count} file(s)")

if __name__ == "__main__":
    main()
