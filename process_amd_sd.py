import os
import shutil
import glob
import argparse
from PIL import Image
import numpy as np

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

def parse_demographics(demographics_path):
    """
    Parses the demographics Excel/CSV file to map Eye ID to Eye Category (OS/OD).
    """
    mapping = {}
    
    if not os.path.exists(demographics_path):
        print(f"Warning: Demographics file not found at {demographics_path}.")
        print("We will fall back to alternating even/odd Eye IDs (even = OS, odd = OD) for mapping.")
        return None

    if HAS_PANDAS:
        try:
            if demographics_path.endswith('.csv'):
                df = pd.read_csv(demographics_path)
            else:
                df = pd.read_excel(demographics_path)
            
            # Print columns to help debug if needed
            print("Columns found in demographics file:", list(df.columns))
            
            # Look for columns
            eye_id_col = None
            category_col = None
            
            for col in df.columns:
                col_lower = str(col).lower()
                if 'eye id' in col_lower or 'eye_id' in col_lower:
                    eye_id_col = col
                elif 'eye category' in col_lower or 'eye_category' in col_lower or 'eye side' in col_lower or 'eye_side' in col_lower or 'eye' == col_lower:
                    category_col = col
            
            if eye_id_col and category_col:
                for _, row in df.iterrows():
                    eye_id = str(row[eye_id_col]).strip()
                    category = str(row[category_col]).strip().upper()
                    
                    # Normalize category to OS or OD
                    if 'OS' in category or 'LEFT' in category:
                        mapping[eye_id] = 'os'
                    elif 'OD' in category or 'RIGHT' in category:
                        mapping[eye_id] = 'od'
                    else:
                        # Fallback
                        mapping[eye_id] = 'os' if int(eye_id) % 2 == 0 else 'od'
                print(f"Successfully mapped {len(mapping)} Eye IDs from demographics file.")
                return mapping
            else:
                print("Could not find 'Eye ID' or 'Eye Category' columns in Excel/CSV.")
        except Exception as e:
            print(f"Error reading demographics file: {e}")
            
    else:
        print("Pandas is not installed. Please install pandas (`pip install pandas openpyxl`) to parse the demographics Excel file.")
    
    print("Falling back to alternating Eye IDs (even = OS, odd = OD).")
    return None

def is_diseased_mask(mask_img):
    """
    Analyzes the right half (mask) to determine if it contains wet AMD lesions (SRF, PED, IRF, SHRM).
    In AMD-SD:
    - 0: Background
    - 1: SRF
    - 2: PED
    - 3: IRF
    - 4: SHRM
    - 5: IS/OS (Ellipsoid zone - healthy layer)
    
    If any pixels in the mask have values 1, 2, 3, or 4, it is considered diseased.
    """
    # Convert image to numpy array
    mask_arr = np.array(mask_img)
    
    # Check unique pixel values
    unique_vals = np.unique(mask_arr)
    
    # Grayscale/Indexed mode (L mode or 8-bit)
    # Lesion indices are 1, 2, 3, 4
    for val in [1, 2, 3, 4]:
        if val in unique_vals:
            return True
            
    # RGB mode fallback
    # If the mask is color-coded, background is black (0,0,0).
    # IS/OS is typically a single color (e.g. purple or gray).
    # Other colors represent lesions.
    if len(mask_arr.shape) == 3 and mask_arr.shape[2] >= 3:
        # Calculate non-black pixels
        non_black = (mask_arr[:, :, 0] > 10) | (mask_arr[:, :, 1] > 10) | (mask_arr[:, :, 2] > 10)
        if not np.any(non_black):
            return False
            
        # Check if there are multiple colors representing lesions
        # If we have colors other than the IS/OS purple (e.g. Red, Blue, Green, Yellow), it's diseased.
        # Let's check the number of unique colors. If there's more than 2 colors (black + IS/OS), it's highly likely diseased.
        flat_colors = mask_arr[non_black]
        unique_colors = np.unique(flat_colors, axis=0)
        if len(unique_colors) > 1:
            return True
            
    return False

def main():
    parser = argparse.ArgumentParser(description="Process AMD-SD dataset into OS/OD and Normal/Diseased categories.")
    parser.add_argument("--dataset_path", required=True, help="Path to the extracted AMD-SD dataset directory.")
    parser.add_argument("--output_path", default="D:/JaksuHealth/frontend/public/mock_oct", help="Path to save the organized mockup images.")
    parser.add_argument("--demographics", default=None, help="Path to the Demographics of the participants.xlsx/csv file.")
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of images per category (default: 50).")
    
    args = parser.parse_args()
    
    dataset_path = args.dataset_path
    output_path = args.output_path
    limit = args.limit
    
    # Find demographics file
    demographics_path = args.demographics
    if not demographics_path:
        # Try to find it in the dataset directory
        xlsx_files = glob.glob(os.path.join(dataset_path, "*.xlsx"))
        csv_files = glob.glob(os.path.join(dataset_path, "*.csv"))
        all_meta_files = xlsx_files + csv_files
        
        for f in all_meta_files:
            if "demographic" in os.path.basename(f).lower() or "participant" in os.path.basename(f).lower():
                demographics_path = f
                break
        
        if not demographics_path and all_meta_files:
            demographics_path = all_meta_files[0]
            
    eye_mapping = parse_demographics(demographics_path) if demographics_path else None

    # Target folders
    categories = {
        'os_normal': os.path.join(output_path, 'os', 'normal'),
        'os_diseased': os.path.join(output_path, 'os', 'diseased'),
        'od_normal': os.path.join(output_path, 'od', 'normal'),
        'od_diseased': os.path.join(output_path, 'od', 'diseased')
    }
    
    # Create target folders
    for path in categories.values():
        os.makedirs(path, exist_ok=True)
        
    # Counters
    counts = {k: 0 for k in categories.keys()}
    
    # Walk through images in the dataset path
    # Look for files matching n_x.png (either flat or nested)
    print("Searching for images...")
    image_files = glob.glob(os.path.join(dataset_path, "**", "*.png"), recursive=True)
    # Filter out files containing '_mask' or similar in case masks are separate
    image_files = [f for f in image_files if not any(x in os.path.basename(f).lower() for x in ['mask', 'annotation', 'segment'])]
    
    print(f"Found {len(image_files)} potential image files.")
    
    for img_path in image_files:
        filename = os.path.basename(img_path)
        # Parse eye ID from filename (e.g. 100_1.png -> eye_id = 100)
        parts = filename.split('_')
        if len(parts) < 2:
            # Try parsing from parent directory name if nested
            parent_dir = os.path.basename(os.path.dirname(img_path))
            if parent_dir.isdigit():
                eye_id = parent_dir
            else:
                continue
        else:
            eye_id = parts[0]
            
        if not eye_id.isdigit():
            continue
            
        # Determine eye side (OS / OD)
        if eye_mapping and eye_id in eye_mapping:
            eye_side = eye_mapping[eye_id]
        else:
            # Fallback: even Eye ID = OS, odd = OD
            eye_side = 'os' if int(eye_id) % 2 == 0 else 'od'
            
        try:
            with Image.open(img_path) as img:
                W, H = img.size
                
                # Check if image is split (original on left, mask on right)
                # Usually width is twice the height or wide aspect ratio
                if W > H * 1.5:
                    # Crop original B-scan (left half)
                    bscan_img = img.crop((0, 0, W // 2, H))
                    # Crop mask (right half)
                    mask_img = img.crop((W // 2, 0, W, H))
                else:
                    # If it's already just the B-scan, we cannot classify using a mask.
                    # Skip or assume diseased if no mask is present.
                    continue
                
                # Classify based on mask
                is_dis = is_diseased_mask(mask_img)
                condition = 'diseased' if is_dis else 'normal'
                
                category_key = f"{eye_side}_{condition}"
                
                # Check limit
                if counts[category_key] >= limit:
                    continue
                    
                # Resize cropped B-scan to standard UI resolution (800x400)
                resized_bscan = bscan_img.resize((800, 400), Image.Resampling.LANCZOS)
                
                # Save processed file
                counts[category_key] += 1
                new_filename = f"{eye_side}_{condition}_{counts[category_key]}.png"
                dest_path = os.path.join(categories[category_key], new_filename)
                
                resized_bscan.save(dest_path)
                
        except Exception as e:
            print(f"Error processing image {img_path}: {e}")
            
        # Break if all categories are filled
        if all(c >= limit for c in counts.values()):
            print("Successfully collected enough images for all categories!")
            break

    print("\nProcessing completed! Images saved:")
    for cat, count in counts.items():
        print(f"- {cat}: {count} images saved to {categories[cat]}")

if __name__ == "__main__":
    main()
