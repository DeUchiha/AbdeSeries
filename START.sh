#!/bin/bash
echo ""
echo " ============================================"
echo "  AbdeSeries - Starting..."
echo " ============================================"
echo ""
cd "$(dirname "$0")/backend"
echo " Installing dependencies (first time only)..."
npm install
echo ""
echo " Starting server..."
echo ""
echo " ============================================"
echo "  Open browser at: http://localhost:5000"
echo " ============================================"
echo ""
node server.js
