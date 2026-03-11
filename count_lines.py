import os

def count_lines(directory, extensions, excludes):
    total_lines = 0
    file_count = 0
    
    for root, dirs, files in os.walk(directory):
        # Modifica dirs in-place para ignorar pastas indesejadas
        dirs[:] = [d for d in dirs if d not in excludes]
        
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = sum(1 for _ in f)
                        total_lines += lines
                        file_count += 1
                except Exception:
                    pass
                    
    return total_lines, file_count

if __name__ == '__main__':
    exts = ('.js', '.ts', '.jsx', '.tsx', '.py', '.css', '.html', '.json', '.md', '.lua', '.yml', '.yaml')
    excl = {'node_modules', '.git', 'venv', '__pycache__', 'build', 'dist', 'data_rocks', '.system_generated', '.next'}
    lines, files = count_lines('.', exts, excl)
    print(f"Total Lines of Code: {lines}")
    print(f"Total Files Scanned: {files}")
