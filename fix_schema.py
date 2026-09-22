import sys

def deduplicate_schema(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    out = []
    current_model = None
    seen_in_model = set()
    
    for line in lines:
        if line.startswith("model "):
            current_model = line.split()[1]
            seen_in_model = set()
        
        if current_model and line.strip() != "":
            stripped = line.strip()
            if stripped in seen_in_model and stripped.startswith("expenses Expense[]"):
                # skip duplicate
                continue
            seen_in_model.add(stripped)
            
        out.append(line)
        
    with open(filepath, 'w') as f:
        f.writelines(out)

if __name__ == "__main__":
    deduplicate_schema(sys.argv[1])
