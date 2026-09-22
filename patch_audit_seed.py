import sys

def patch_seed(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    permissions = """
    { action: 'audit_events:read', resource: 'audit_event' },
"""

    if "audit_events:read" not in content:
        content = content.replace("    { action: 'organization:settings:update', resource: 'organization' },", "    { action: 'organization:settings:update', resource: 'organization' }," + permissions)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_seed(sys.argv[1])
