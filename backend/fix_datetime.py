#!/usr/bin/env python3
"""
Fix datetime.utcnow() usage in Flask app
"""

import re

# Read the file
with open('/Volumes/SSD 980 PRO 1/homewatch/backend/app.py', 'r') as f:
    content = f.read()

# Replace all occurrences of datetime.utcnow() with datetime.now(timezone.utc)
fixed_content = re.sub(r'datetime\.utcnow\(\)', 'datetime.now(timezone.utc)', content)

# Write back the fixed content
with open('/Volumes/SSD 980 PRO 1/homewatch/backend/app.py', 'w') as f:
    f.write(fixed_content)

print("Fixed all datetime.utcnow() calls to use datetime.now(timezone.utc)")
