from PIL import Image
import os

def convert_webp_to_png(input_path, output_path):
    try:
        if not os.path.exists(input_path):
            print(f"Error: File not found: {input_path}")
            return False
            
        img = Image.open(input_path)
        img.save(output_path, "PNG")
        print(f"Successfully converted {input_path} to {output_path}")
        return True
    except ImportError:
        print("Error: Pillow library not installed. Cannot convert image.")
        return False
    except Exception as e:
        print(f"Error converting image: {e}")
        return False

if __name__ == "__main__":
    convert_webp_to_png("assets/icon/cec_logo_original.webp", "assets/icon/cec_logo.png")
