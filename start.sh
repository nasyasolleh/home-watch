#!/usr/bin/env bash

python3 -m http.server 8000 &
cd backend ; source venv/bin/activate && python3 app.py
echo "Homewatch started..."