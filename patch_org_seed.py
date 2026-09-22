import sys

def patch_seed(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    permissions = """
    { action: 'organization:update', resource: 'organization' },
    { action: 'organization:settings:read', resource: 'organization' },
    { action: 'organization:settings:update', resource: 'organization' },
"""

    if "organization:settings:read" not in content:
        content = content.replace("    { action: 'organization:members:read', resource: 'organization' },", "    { action: 'organization:members:read', resource: 'organization' }," + permissions)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_seed(sys.argv[1])
