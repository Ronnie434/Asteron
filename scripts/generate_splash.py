#!/usr/bin/env python3
"""
Generate splash screen images for Asteron app.
Creates splash screens with logo for both light and dark modes.
Based on Renvo app implementation.
"""

from PIL import Image, ImageDraw
import os

# Configuration
LOGO_PATH = "assets/AI_Companion_icon.png"
OUTPUT_DIR = "assets"

# Splash screen dimensions (standard for mobile apps)
SPLASH_WIDTH = 1284  # 3x resolution for @3x devices
SPLASH_HEIGHT = 2778

# Logo configuration - 2x Renvo size for better visibility (160pt at @3x = 480px)
LOGO_SIZE = 480  # 160 * 3 for @3x (2x Renvo size, still well within screen bounds)
LOGO_RADIUS = 120  # 40 * 3 for @3x

# Colors - matching theme
DARK_BG = "#000000"
LIGHT_BG = "#F2F2F7"


def round_corners(image, radius):
    """Apply rounded corners to an image."""
    circle = Image.new('L', (radius * 2, radius * 2), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, radius * 2, radius * 2), fill=255)
    
    alpha = Image.new('L', image.size, 255)
    w, h = image.size
    
    # Top-left corner
    alpha.paste(circle.crop((0, 0, radius, radius)), (0, 0))
    # Top-right corner
    alpha.paste(circle.crop((radius, 0, radius * 2, radius)), (w - radius, 0))
    # Bottom-left corner
    alpha.paste(circle.crop((0, radius, radius, radius * 2)), (0, h - radius))
    # Bottom-right corner
    alpha.paste(circle.crop((radius, radius, radius * 2, radius * 2)), (w - radius, h - radius))
    
    image.putalpha(alpha)
    return image


def create_splash_screen(logo_path, output_path, bg_color):
    """Create a splash screen with centered logo."""
    # Create canvas
    splash = Image.new('RGBA', (SPLASH_WIDTH, SPLASH_HEIGHT), bg_color)
    
    # Load and resize logo
    logo = Image.open(logo_path).convert('RGBA')
    logo = logo.resize((LOGO_SIZE, LOGO_SIZE), Image.Resampling.LANCZOS)
    
    # Apply rounded corners to logo
    logo = round_corners(logo, LOGO_RADIUS)
    
    # Calculate logo position (centered)
    logo_x = (SPLASH_WIDTH - LOGO_SIZE) // 2
    logo_y = (SPLASH_HEIGHT - LOGO_SIZE) // 2
    
    # Paste logo onto splash screen
    splash.paste(logo, (logo_x, logo_y), logo)
    
    # Create a new image with solid background
    final = Image.new('RGB', (SPLASH_WIDTH, SPLASH_HEIGHT), bg_color)
    final.paste(splash, (0, 0), splash)
    final.save(output_path, 'PNG', quality=95, optimize=True)
    
    print(f"✓ Created: {output_path}")


def main():
    """Generate all splash screen variants."""
    # Ensure we're in the right directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    os.chdir(project_dir)
    
    logo_path = LOGO_PATH
    
    # Check if logo exists
    if not os.path.exists(logo_path):
        print(f"Error: Logo not found at {logo_path}")
        return
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Generating splash screens...")
    print(f"Logo: {logo_path}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    # Generate dark mode splash screen
    dark_output = os.path.join(OUTPUT_DIR, "splash-dark.png")
    create_splash_screen(logo_path, dark_output, DARK_BG)
    
    # Generate light mode splash screen
    light_output = os.path.join(OUTPUT_DIR, "splash-light.png")
    create_splash_screen(logo_path, light_output, LIGHT_BG)
    
    print()
    print("✅ All splash screens generated successfully!")
    print()
    print("Next steps:")
    print("1. Run: npx expo prebuild --clean")
    print("2. Run: npx expo run:ios --device")


if __name__ == "__main__":
    main()


