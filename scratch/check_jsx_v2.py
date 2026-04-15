import sys

def check_jsx(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = []
    
    for i, line in enumerate(lines):
        lnum = i + 1
        # Extract tags
        pos = 0
        while True:
            start = line.find('<', pos)
            if start == -1: break
            
            end = line.find('>', start)
            if end == -1: break
            
            tag = line[start:end+1]
            pos = end + 1
            
            # Ignore self-closing, fragments, comments
            if tag.startswith('<!--') or tag.endswith('/>') or tag.startswith('</>'):
                continue
            if tag.startswith('<input') or tag.startswith('<img') or tag.startswith('<hr') or tag.startswith('<br'):
                continue
            if tag == '<>':
                stack.append(('<>', lnum))
                continue

            if tag.startswith('</'):
                name = tag[2:-1].strip()
                if not stack:
                    print(f"[{lnum}] Extra closing tag: {tag}")
                else:
                    last, lstart = stack.pop()
                    if last != name and not name.startswith(last): # partial match for tags with props
                        print(f"[{lnum}] Mismatch: {tag} closes {last} from line {lstart}")
            else:
                name = tag[1:-1].split()[0]
                # Filter for common JSX tags
                if name[0].islower() or name == 'svg' or name == 'path':
                    stack.append((name, lnum))
                    
    if stack:
        print("\nUnclosed tags:")
        for name, lnum in stack:
            print(f"[{lnum}] {name}")

if __name__ == "__main__":
    check_jsx(sys.argv[1])
