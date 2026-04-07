#!/bin/bash

# BuildAI ERP - Local Setup Script
# This script automates the local development setup

set -e

echo "======================================"
echo "BuildAI ERP - Local Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    echo "Please install Git from https://git-scm.com"
    exit 1
fi
echo -e "${GREEN}✓ Git $(git --version | cut -d' ' -f3)${NC}"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL is not installed${NC}"
    echo "Please install MySQL 8.0+ from https://dev.mysql.com/downloads/mysql/"
    echo ""
    echo "On macOS: brew install mysql"
    echo "On Ubuntu: sudo apt install mysql-server"
    echo "On Windows: choco install mysql"
    exit 1
fi
echo -e "${GREEN}✓ MySQL $(mysql --version)${NC}"

echo ""
echo -e "${YELLOW}Setting up project...${NC}"

# Install pnpm if not already installed
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm installed${NC}"

# Install dependencies
echo "Installing dependencies..."
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env file
echo ""
echo -e "${YELLOW}Setting up environment...${NC}"

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Database
DATABASE_URL=mysql://buildai_user:buildai_secure_pass_123@localhost:3306/buildai_erp

# Security
JWT_SECRET=your_jwt_secret_key_min_32_characters_long_for_security

# Cache
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=sk-your-api-key-here

# Environment
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}⚠ Please update .env with your actual values:${NC}"
    echo "  - DATABASE_URL: MySQL connection string"
    echo "  - JWT_SECRET: A random 32+ character string"
    echo "  - OPENAI_API_KEY: Your OpenAI API key (optional)"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Create database
echo ""
echo -e "${YELLOW}Setting up database...${NC}"

# Check if database exists
DB_EXISTS=$(mysql -u root -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='buildai_erp';" 2>/dev/null | grep -c buildai_erp || true)

if [ $DB_EXISTS -eq 0 ]; then
    echo "Creating database and user..."
    mysql -u root << 'EOF'
CREATE DATABASE buildai_erp;
CREATE USER 'buildai_user'@'localhost' IDENTIFIED BY 'buildai_secure_pass_123';
GRANT ALL PRIVILEGES ON buildai_erp.* TO 'buildai_user'@'localhost';
FLUSH PRIVILEGES;
EOF
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${GREEN}✓ Database already exists${NC}"
fi

# Run migrations
echo ""
echo -e "${YELLOW}Running migrations...${NC}"

pnpm drizzle-kit generate
pnpm drizzle-kit migrate

echo -e "${GREEN}✓ Migrations completed${NC}"

# Success message
echo ""
echo -e "${GREEN}======================================"
echo "✓ Setup completed successfully!"
echo "======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update .env with your actual values"
echo "2. Run: ${GREEN}pnpm dev${NC}"
echo "3. Open: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "- Setup Guide: SETUP_GUIDE.md"
echo "- AWS Deployment: AWS_DEPLOYMENT.md"
echo "- Full Documentation: BUILDAI_README.md"
echo ""
