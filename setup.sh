#!/usr/bin/env bash
# OtterChat Setup Script
# Run this after cloning: bash setup.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BOLD}🦦 OtterChat Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install Node.js 18+ from https://nodejs.org"
  exit 1
fi
NODE_VER=$(node -e "console.log(process.version)")
echo -e "${GREEN}✔${NC} Node.js $NODE_VER"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found."
  exit 1
fi
echo -e "${GREEN}✔${NC} npm $(npm --version)"

# Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✔${NC} Created .env from .env.example"
else
  echo -e "${YELLOW}⚠${NC}  .env already exists, skipping"
fi

# Install backend deps
echo ""
echo -e "${BLUE}▶ Installing backend dependencies...${NC}"
npm install
echo -e "${GREEN}✔${NC} Backend dependencies installed"

# Install frontend deps
echo ""
echo -e "${BLUE}▶ Installing frontend dependencies...${NC}"
cd client && npm install && cd ..
echo -e "${GREEN}✔${NC} Frontend dependencies installed"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}${BOLD}✅ Setup complete!${NC}"
echo ""
echo "Available commands:"
echo ""
echo -e "  ${BOLD}npm run test:unit${NC}        Run crypto/logs/messaging/files unit tests"
echo -e "  ${BOLD}npm run test:integration${NC} Run backend API integration tests"
echo -e "  ${BOLD}npm run test:pipeline${NC}    Run full end-to-end pipeline verification"
echo -e "  ${BOLD}npm test${NC}                 Run all tests"
echo ""
echo "Startup options:"
echo ""
echo -e "  ${BOLD}docker-compose up --build${NC}   Full Docker deployment (recommended)"
echo ""
echo "  Or manually:"
echo -e "  ${BOLD}npm start${NC}                   Backend on http://localhost:3001"
echo -e "  ${BOLD}cd client && npm start${NC}      Frontend on http://localhost:3000"
echo ""
echo -e "${YELLOW}Note: MongoDB must be running for local dev (docker-compose handles this automatically).${NC}"
echo ""
