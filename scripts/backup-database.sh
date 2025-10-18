#!/bin/bash

# Manual Database Backup Script for Supabase
# This script creates a local backup of your Supabase database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Supabase Database Backup Script ===${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with the following variables:"
    echo "  SUPABASE_PROJECT_ID=your_project_id"
    echo "  SUPABASE_DB_PASSWORD=your_db_password"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Validate required variables
if [ -z "$SUPABASE_PROJECT_ID" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Please set SUPABASE_PROJECT_ID and SUPABASE_DB_PASSWORD in .env"
    exit 1
fi

# Check if pg_dump is installed
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Error: pg_dump is not installed${NC}"
    echo "Please install PostgreSQL client tools:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
BACKUP_FILE="backups/backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo -e "${YELLOW}Starting backup...${NC}"
echo "Project ID: $SUPABASE_PROJECT_ID"
echo "Backup file: $BACKUP_FILE"
echo ""

# Perform backup
DB_HOST="db.${SUPABASE_PROJECT_ID}.supabase.co"

PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup completed successfully${NC}"
    
    # Compress the backup
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup compressed: $COMPRESSED_FILE ($BACKUP_SIZE)${NC}"
    
    # Create metadata file
    cat > "backups/backup_${TIMESTAMP}.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "date": "${TIMESTAMP}",
  "type": "manual",
  "format": "sql.gz",
  "size": "${BACKUP_SIZE}"
}
EOF
    
    echo -e "${GREEN}✓ Metadata file created${NC}\n"
    echo -e "${GREEN}Backup complete!${NC}"
    echo "Files created:"
    echo "  - $COMPRESSED_FILE"
    echo "  - backups/backup_${TIMESTAMP}.json"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi
