#!/usr/bin/env python3
"""
Convert PNG icon to Windows ICO format
Requires: pip install pillow
"""
from PIL import Image
import sys
from pathlib import Path

def create_ico(png_path, ico_path):
    """Convert PNG to ICO with multiple sizes"""
    img = Image.open(png_path)

    # Windows ICO standard sizes
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # Create resized versions
    icon_images = []
    for size in sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        icon_images.append(resized)

    # Save as ICO with all sizes
    icon_images[0].save(
        ico_path,
        format='ICO',
        sizes=sizes,
        append_images=icon_images[1:]
    )
    print(f"Created {ico_path} with sizes: {', '.join(f'{s[0]}x{s[1]}' for s in sizes)}")

if __name__ == '__main__':
    script_dir = Path(__file__).parent
    png_path = script_dir / 'icon_1024x1024.png'
    ico_path = script_dir / 'icon.ico'

    if not png_path.exists():
        print(f"Error: {png_path} not found")
        sys.exit(1)

    create_ico(png_path, ico_path)
