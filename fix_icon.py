import os
from PIL import Image, ImageOps, ImageDraw

def create_composite_icon(logo_path, output_path):
    # Target size for the master icon
    size = (1024, 1024)
    
    # Create valid blank RGBA image
    base = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    
    # Draw White Squircle with padding
    # Adding padding prevents the icon from feeling "too large" in the dock
    padding = 100 
    box_size = (size[0] - padding, size[1] - padding)
    rect_box = (padding, padding, size[0] - padding, size[1] - padding)
    
    # Radius ~22.5% of the SQUIRCLE size (not canvas)
    # squircle width is 1024 - 200 = 824. 22.5% is ~185
    radius = int((size[0] - 2 * padding) * 0.225)
    
    draw.rounded_rectangle(rect_box, radius=radius, fill="white")
    
    # Load and resize logo
    try:
        logo = Image.open(logo_path).convert("RGBA")
        
        # Calculate resize to fit nicely (e.g. 70% of icon size)
        logo_ratio = 0.70
        target_logo_width = int(size[0] * logo_ratio)
        
        # Maintain aspect ratio
        aspect = logo.height / logo.width
        target_logo_height = int(target_logo_width * aspect)
        
        logo = logo.resize((target_logo_width, target_logo_height), Image.Resampling.LANCZOS)
        
        # Center position
        x = (size[0] - target_logo_width) // 2
        y = (size[1] - target_logo_height) // 2
        
        # Paste logo using itself as mask (for transparency)
        base.paste(logo, (x, y), logo)
        
        # Save
        base.save(output_path, "PNG")
        print(f"Saved composite icon to {output_path}")
        
    except Exception as e:
        print(f"Error processing logo: {e}")

if __name__ == "__main__":
    # Assuming running from backend/ dir, so paths relative to project root need adjustment
    # But we set cwd to /Users/walker/github.com/cyclemetry so...
    # actually invoke command is `cd backend && python ...`
    # so paths area relative to backend/
    
    logo_path = "../src-tauri/icons/icon.png.bak"
    output_path = "../src-tauri/icons/icon.png"
    
    if os.path.exists(logo_path):
        create_composite_icon(logo_path, output_path)
    else:
        print(f"Error: {logo_path} not found")
