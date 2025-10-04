#!/usr/bin/env python3
"""
Safe Empty File Cleaner
Removes ONLY files with exactly 0 bytes (completely empty)
"""

import os
import sys
from pathlib import Path

# Configuration - now points to project root from scripts folder
PROJECT_ROOT = Path(__file__).parent.parent
EXCLUDED_DIRS = {
    '.git', 'node_modules', '.next', 'dist', 'build', 
    '__pycache__', '.pytest_cache', 'coverage'
}

def is_safe_to_scan(path):
    """Check if directory should be scanned (exclude sensitive dirs)"""
    return not any(excluded in path.parts for excluded in EXCLUDED_DIRS)

def find_empty_files(root_dir):
    """Find all files with exactly 0 bytes"""
    empty_files = []
    
    for root, dirs, files in os.walk(root_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        
        for file in files:
            file_path = Path(root) / file
            
            try:
                # Only consider files with exactly 0 bytes
                if file_path.stat().st_size == 0:
                    empty_files.append(file_path)
            except (OSError, PermissionError) as e:
                print(f"⚠️  Cannot access: {file_path} ({e})")
                continue
    
    return empty_files

def safe_delete_empty_files():
    """Safely delete empty files with user confirmation"""
    print("🔍 Scanning for empty files...")
    print(f"📁 Root directory: {PROJECT_ROOT}")
    print(f"🚫 Excluding: {', '.join(EXCLUDED_DIRS)}")
    print("-" * 60)
    
    empty_files = find_empty_files(PROJECT_ROOT)
    
    if not empty_files:
        print("✅ No empty files found!")
        return
    
    print(f"📋 Found {len(empty_files)} empty file(s):")
    for i, file_path in enumerate(empty_files, 1):
        relative_path = file_path.relative_to(PROJECT_ROOT)
        file_size = file_path.stat().st_size
        print(f"   {i:2d}. {relative_path} ({file_size} bytes)")
    
    print("-" * 60)
    
    # Safety confirmation
    response = input(f"❓ Delete these {len(empty_files)} empty files? (y/N): ").strip().lower()
    
    if response != 'y':
        print("❌ Operation cancelled")
        return
    
    # Delete files
    deleted_count = 0
    for file_path in empty_files:
        try:
            # Double-check file is still empty before deletion
            if file_path.exists() and file_path.stat().st_size == 0:
                file_path.unlink()
                deleted_count += 1
                print(f"🗑️  Deleted: {file_path.relative_to(PROJECT_ROOT)}")
            else:
                print(f"⚠️  Skipped: {file_path.relative_to(PROJECT_ROOT)} (no longer empty)")
        except (OSError, PermissionError) as e:
            print(f"❌ Failed to delete {file_path.relative_to(PROJECT_ROOT)}: {e}")
    
    print("-" * 60)
    print(f"✅ Successfully deleted {deleted_count} empty file(s)")

def main():
    """Main entry point"""
    print("🧹 Safe Empty File Cleaner")
    print("=" * 60)
    
    try:
        safe_delete_empty_files()
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
