#!/bin/bash

# Database Restore Script for Supabase
# This script restores a Supabase database from a backup file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}=== Supabase Database Restore Script ===${NC}\n"
echo -e "${YELLOW}⚠️  WARNING: This will overwrite your current database!${NC}"
echo -e "${YELLOW}⚠️  Make sure you have a recent backup before proceeding.${NC}\n"

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

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Please install PostgreSQL client tools:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

# List available backups
echo -e "${BLUE}Available backups:${NC}\n"
if [ -d "backups" ] && [ "$(ls -A backups/*.sql.gz 2>/dev/null)" ]; then
    ls -lh backups/*.sql.gz | awk '{print $9, "(" $5 ")"}'
    echo ""
else
    echo "No backups found in ./backups/"
    exit 1
fi

# Get backup file from user
read -p "Enter the backup file name (or full path): " BACKUP_INPUT

# Handle different input formats
if [ -f "$BACKUP_INPUT" ]; then
    BACKUP_FILE="$BACKUP_INPUT"
elif [ -f "backups/$BACKUP_INPUT" ]; then
    BACKUP_FILE="backups/$BACKUP_INPUT"
elif [ -f "backups/backup_${BACKUP_INPUT}.sql.gz" ]; then
    BACKUP_FILE="backups/backup_${BACKUP_INPUT}.sql.gz"
else
    echo -e "${RED}Error: Backup file not found: $BACKUP_INPUT${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Selected backup: $BACKUP_FILE${NC}"

# Final confirmation
read -p "$(echo -e ${RED}Are you sure you want to restore? This will OVERWRITE your database! [yes/NO]: ${NC})" CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo -e "\n${YELLOW}Decompressing backup...${NC}"
    TEMP_SQL="/tmp/restore_temp_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
    SQL_FILE="$TEMP_SQL"
else
    SQL_FILE="$BACKUP_FILE"
fi

# Perform restore
echo -e "${YELLOW}Starting restore...${NC}"
DB_HOST="db.${SUPABASE_PROJECT_ID}.supabase.co"
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@${DB_HOST}:5432/postgres"

PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql "$DB_URL" < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Database restored successfully!${NC}"
    
    # Cleanup temp file
    if [ -n "$TEMP_SQL" ] && [ -f "$TEMP_SQL" ]; then
        rm "$TEMP_SQL"
        echo -e "${GREEN}✓ Cleaned up temporary files${NC}"
    fi
else
    echo -e "\n${RED}✗ Restore failed${NC}"
    
    # Cleanup temp file
    if [ -n "$TEMP_SQL" ] && [ -f "$TEMP_SQL" ]; then
        rm "$TEMP_SQL"
    fi
    exit 1
fi

echo -e "\n${GREEN}Restore complete!${NC}"
echo -e "${YELLOW}Note: You may need to refresh your application to see the changes.${NC}"
