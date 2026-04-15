import sys

def count_tags(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    
    # Simple regex-less parser for tags (very rough but might help)
    for i, line in enumerate(lines):
        line_num = i + 1
        pos = 0
        while True:
            start_tag = line.find('<', pos)
            if start_tag == -1:
                break
            
            # Find end of tag
            end_tag = line.find('>', start_tag)
            if end_tag == -1:
                 # Potentially multi-line tag start
                 break
            
            tag_content = line[start_tag+1:end_tag].strip()
            
            # Ignore comments, self-closing, and fragments
            if tag_content.startswith('!--'):
                pos = end_tag + 1
                continue
            if tag_content.endswith('/') or tag_content.startswith('input') or tag_content.startswith('img') or tag_content.startswith('br') or tag_content.startswith('hr'):
                pos = end_tag + 1
                continue
            if tag_content == '' or tag_content == '/': # Fragment <> or </>
                # We should handle fragments too
                if tag_content == '':
                    stack.append(('<>', line_num))
                else:
                    if stack and stack[-1][0] == '<>':
                        stack.pop()
                pos = end_tag + 1
                continue

            if tag_content.startswith('/'):
                # Closing tag
                tag_name = tag_content[1:].split()[0]
                if stack:
                    last_tag, last_line = stack[-1]
                    if last_tag == tag_name:
                        stack.pop()
                    else:
                        print(f"Error: Found </{tag_name}> at line {line_num}, but expected </{last_tag}> (opened at line {last_line})")
                        # Don't pop, just keep going
                else:
                    print(f"Error: Found </{tag_name}> at line {line_num} with no matching opening tag")
            else:
                # Opening tag
                # Check for self-closing with space like <div />
                if tag_content.endswith('/'):
                    pos = end_tag + 1
                    continue
                
                tag_name = tag_content.split()[0]
                # Ignore component names and standard HTML tags that are common
                # Just catch the ones that usually come in pairs
                if tag_name in ['div', 'span', 'button', 'h1', 'h2', 'h3', 'h4', 'p', 'svg', 'label', 'a', 'strong', 'ul', 'li', 'form', 'select', 'option']:
                    stack.append((tag_name, line_num))
            
            pos = end_tag + 1
    
    if stack:
        print("\nRemaining open tags:")
        for tag, line in stack:
            print(f"- <{tag}> opened at line {line}")

if __name__ == "__main__":
    count_tags(sys.argv[1])
