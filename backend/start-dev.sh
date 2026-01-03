#!/bin/bash

# Start Backend Development Server
# This script ensures Node 22 is loaded before starting the server

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 22
nvm use 22

# Start the development server
npm run dev
