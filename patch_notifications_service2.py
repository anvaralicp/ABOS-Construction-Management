import sys
import re

def patch_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove status: 'ACTIVE' from validateReferences
    content = content.replace("user_id: dto.user_id,\n        status: 'ACTIVE'", "user_id: dto.user_id")

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_service(sys.argv[1])
