
from PIL import Image
import os

def add_padding(image_path, padding_percent=0.2):
    try:
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        
        # Calculate new size with padding
        # We want the original image to occupy (1 - padding_percent) of the new canvas
        # new_size * (1 - padding) = old_size
        # new_size = old_size / (1 - padding)
        
        # Actually, simpler approach: resize the logo down and paste it onto a transparent canvas of the original size
        # This keeps the final icon dimensions (e.g. 512x512) the same but makes the content smaller
        
        target_size = int(width * (1.0 - padding_percent))
        resized_img = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
        
        new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        offset = (width - target_size) // 2
        new_img.paste(resized_img, (offset, offset), resized_img)
        
        # Save backup
        backup_path = image_path + ".bak"
        if not os.path.exists(backup_path):
            import shutil
            shutil.copy(image_path, backup_path)
            print(f"Backed up original to {backup_path}")
            
        new_img.save(image_path, format="PNG")
        print(f"Successfully padded {image_path} by {padding_percent*100}%")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    icon_path = "src-tauri/icons/icon.png"
    add_padding(icon_path, 0.25) # 25% padding
