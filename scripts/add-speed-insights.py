#!/usr/bin/env python3
"""Add Vercel Speed Insights to all Jinja templates."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT / "templates"

SPEED_INSIGHTS_SCRIPT = """  <script>window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};</script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
"""

def add_speed_insights_to_template(template_path):
    """Add Speed Insights script to a template if not already present."""
    content = template_path.read_text(encoding="utf-8")
    
    # Skip if already has Speed Insights
    if "speed-insights" in content:
        print(f"✓ {template_path.name} already has Speed Insights")
        return False
    
    # Find the closing </head> tag and insert before it
    if "</head>" not in content:
        print(f"✗ {template_path.name} has no </head> tag")
        return False
    
    # Insert Speed Insights script before </head>
    updated_content = content.replace("</head>", f"{SPEED_INSIGHTS_SCRIPT}</head>")
    
    template_path.write_text(updated_content, encoding="utf-8")
    print(f"✓ Updated {template_path.name}")
    return True

def main():
    """Process all HTML templates."""
    print("Adding Vercel Speed Insights to templates...\n")
    
    template_files = sorted(TEMPLATES_DIR.glob("*.html"))
    updated_count = 0
    
    for template_path in template_files:
        if add_speed_insights_to_template(template_path):
            updated_count += 1
    
    print(f"\nUpdated {updated_count} template(s)")

if __name__ == "__main__":
    main()
