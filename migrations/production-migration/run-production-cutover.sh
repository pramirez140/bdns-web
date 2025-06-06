#!/bin/bash

# =================================================================
# Production Database Cutover Script
# =================================================================
# 
# This script performs the final cutover to activate the new 
# normalized database schema. This is the final step after
# migration and testing.
#
# PREREQUISITES:
# 1. run-production-migration.sh completed successfully
# 2. New schema tested and verified
# 3. Application code updated for new schema
# 4. Application stopped during cutover
#
# =================================================================

set -e  # Exit on any error

# Configuration
DB_NAME="bdns_db"
DB_USER="bdns_user"
DB_PASSWORD="bdns_password"
DB_HOST="localhost"
DB_PORT="5432"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}=================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}=================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Check if migration was completed
check_migration_completed() {
    print_header "Checking Migration Prerequisites"
    
    export PGPASSWORD=$DB_PASSWORD
    
    # Check if new tables exist
    local new_tables=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE '%_new';
    " | tr -d ' ')
    
    if [[ $new_tables -eq 0 ]]; then
        print_error "No migrated tables found with '_new' suffix"
        print_info "Please run the migration script first:"
        print_info "  ./run-production-migration.sh"
        exit 1
    fi
    print_success "Found $new_tables migrated tables"
    
    # Check if backup tables exist
    local backup_tables=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE '%_backup';
    " | tr -d ' ')
    
    if [[ $backup_tables -eq 0 ]]; then
        print_error "No backup tables found"
        print_info "Backup tables are required for safe cutover"
        exit 1
    fi
    print_success "Found $backup_tables backup tables"
    
    # Verify data in new tables
    local grants_new=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM grants_new;" | tr -d ' ')
    local users_new=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users_new;" | tr -d ' ')
    
    if [[ $grants_new -eq 0 ]]; then
        print_error "grants_new table is empty"
        exit 1
    fi
    
    if [[ $users_new -eq 0 ]]; then
        print_error "users_new table is empty"
        exit 1
    fi
    
    print_success "New tables contain data: $grants_new grants, $users_new users"
}

# Check if application is stopped
check_application_status() {
    print_header "Checking Application Status"
    
    # Check if web containers are running
    local web_containers=$(docker ps --filter "name=bdns-web" --format "table {{.Names}}" | grep -v NAMES | wc -l)
    
    if [[ $web_containers -gt 0 ]]; then
        print_warning "BDNS web application appears to be running"
        print_info "Detected running containers:"
        docker ps --filter "name=bdns-web" --format "table {{.Names}}\t{{.Status}}"
        echo ""
        print_warning "It's recommended to stop the application during cutover"
        echo ""
        
        if [[ "$FORCE" != "true" ]]; then
            read -p "Do you want to proceed anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Cutover cancelled. Stop the application and try again."
                print_info "To stop: docker-compose down"
                exit 0
            fi
        fi
    else
        print_success "Application appears to be stopped"
    fi
}

# Show cutover plan
show_cutover_plan() {
    print_header "Cutover Plan"
    
    echo -e "${BLUE}This cutover will:${NC}"
    echo "1. 🔒 Create final backup of current state"
    echo "2. 🗑️  Drop old tables (they are backed up)"
    echo "3. 🔄 Rename new tables to production names"
    echo "4. 🔐 Recreate authentication tables"
    echo "5. ⚡ Create performance indexes"
    echo "6. 📊 Create materialized views"
    echo "7. 🔧 Create triggers and functions"
    echo "8. 🔍 Update search vectors"
    echo "9. ✅ Verify final state"
    echo ""
    echo -e "${YELLOW}CRITICAL NOTES:${NC}"
    echo "- ⚠️  This activates the new normalized schema"
    echo "- 🛑 Your application should be stopped during this process"
    echo "- 🔒 Original data is preserved in backup tables"
    echo "- 🔄 Rollback is available if needed"
    echo ""
    echo -e "${GREEN}After cutover:${NC}"
    echo "- 🚀 Normalized schema will be active"
    echo "- 📈 Improved performance and data integrity"
    echo "- 🔗 Proper foreign key relationships"
    echo "- 🧹 Clean, organized data structure"
    echo ""
}

# Execute cutover
run_cutover() {
    print_header "Executing Database Cutover"
    
    print_step "Starting cutover process..."
    print_warning "This will activate the new database schema"
    
    # Run the cutover script
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/cutover-to-normalized-schema.sql"; then
        print_success "Cutover completed successfully"
    else
        print_error "Cutover failed"
        print_info "Check the error messages above"
        print_info "Your data should still be safe in backup tables"
        print_info "You may need to run the rollback script if the database is in an inconsistent state"
        exit 1
    fi
}

# Verify cutover success
verify_cutover() {
    print_header "Verifying Cutover Success"
    
    print_step "Checking new active schema..."
    
    # Check that production tables exist (not _new anymore)
    local prod_tables=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('organizations', 'grants', 'users', 'user_favorites', 'user_grant_tracking');
    " | tr -d ' ')
    
    if [[ $prod_tables -ne 5 ]]; then
        print_error "Expected 5 main production tables, found $prod_tables"
        exit 1
    fi
    print_success "Main production tables exist"
    
    # Check data integrity
    local grants_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM grants;" | tr -d ' ')
    local users_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    local orgs_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM organizations;" | tr -d ' ')
    
    print_success "Data verification:"
    print_info "  - Grants: $grants_count"
    print_info "  - Users: $users_count"
    print_info "  - Organizations: $orgs_count"
    
    # Check foreign key relationships
    local fk_violations=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM grants g 
        LEFT JOIN organizations o ON g.organization_id = o.id 
        WHERE o.id IS NULL;
    " | tr -d ' ')
    
    if [[ $fk_violations -gt 0 ]]; then
        print_error "$fk_violations grants have invalid organization references"
        exit 1
    fi
    print_success "All foreign key relationships are valid"
    
    # Check materialized views
    local mat_views=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public';
    " | tr -d ' ')
    
    if [[ $mat_views -eq 0 ]]; then
        print_warning "No materialized views found"
    else
        print_success "Found $mat_views materialized view(s)"
    fi
    
    # Test a sample query
    local sample_query=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM grants g 
        JOIN organizations o ON g.organization_id = o.id 
        WHERE g.is_open = true;
    " | tr -d ' ')
    
    print_success "Sample query successful: $sample_query open grants"
}

# Show post-cutover instructions
show_post_cutover_instructions() {
    print_header "Post-Cutover Instructions"
    
    echo -e "${GREEN}🎉 CUTOVER COMPLETED SUCCESSFULLY!${NC}"
    echo ""
    echo -e "${BLUE}Your normalized database schema is now ACTIVE. Next steps:${NC}"
    echo ""
    echo -e "${YELLOW}1. RESTART YOUR APPLICATION${NC}"
    echo "   cd $PROJECT_DIR"
    echo "   docker-compose up -d"
    echo ""
    echo -e "${YELLOW}2. VERIFY APPLICATION FUNCTIONALITY${NC}"
    echo "   - ✅ Test user login"
    echo "   - ✅ Test grant search"
    echo "   - ✅ Test user favorites"
    echo "   - ✅ Test grant tracking"
    echo "   - ✅ Verify all features work correctly"
    echo ""
    echo -e "${YELLOW}3. MONITOR APPLICATION LOGS${NC}"
    echo "   docker-compose logs -f web"
    echo ""
    echo -e "${YELLOW}4. UPDATE APPLICATION CODE (if needed)${NC}"
    echo "   - Update database queries to use new schema"
    echo "   - Leverage new foreign key relationships"
    echo "   - Use materialized views for better performance"
    echo ""
    echo -e "${GREEN}DATABASE IMPROVEMENTS:${NC}"
    echo "   ✅ Proper referential integrity with foreign keys"
    echo "   ✅ Normalized data structure eliminates redundancy"
    echo "   ✅ Hierarchical organization structure"
    echo "   ✅ Performance optimized with strategic indexes"
    echo "   ✅ Materialized views for fast complex queries"
    echo "   ✅ Full-text search with Spanish language support"
    echo ""
    echo -e "${BLUE}ROLLBACK (if needed):${NC}"
    echo "   If you encounter issues, you can rollback:"
    echo "   psql -d $DB_NAME -f rollback-from-normalized-schema.sql"
    echo ""
    echo -e "${PURPLE}BACKUP TABLES (preserved for safety):${NC}"
    echo "   - convocatorias_backup"
    echo "   - users_backup"
    echo "   - favorites_backup"
    echo "   - grant_tracking_backup"
    echo "   - search_history_backup"
    echo "   - *_pre_cutover tables"
    echo ""
    echo -e "${GREEN}🚀 Your BDNS application is now running on the optimized normalized schema!${NC}"
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "Cutover script encountered an error"
        print_info "Your database may be in an inconsistent state"
        print_info "Consider running the rollback script:"
        print_info "  psql -d $DB_NAME -f rollback-from-normalized-schema.sql"
    fi
}

# Help function
show_help() {
    cat << EOF
Production Database Cutover Script

USAGE:
    $0 [options]

OPTIONS:
    -h, --help          Show this help message
    --dry-run          Show cutover plan without executing
    --force            Skip confirmation prompts
    --verify-only      Only run verification checks

PREREQUISITES:
    1. Migration script completed successfully
    2. New schema tested and verified
    3. Application code updated for new schema
    4. Application stopped during cutover

ENVIRONMENT VARIABLES:
    DB_NAME            Database name (default: bdns_db)
    DB_USER            Database user (default: bdns_user)
    DB_PASSWORD        Database password (default: bdns_password)
    DB_HOST            Database host (default: localhost)
    DB_PORT            Database port (default: 5432)

EXAMPLES:
    # Show cutover plan
    $0 --dry-run
    
    # Run cutover with confirmation
    $0
    
    # Run cutover without prompts
    $0 --force

SAFETY FEATURES:
    - Additional backup created before cutover
    - Rollback script available if needed
    - Data integrity verification

For rollback, use:
    psql -d $DB_NAME -f rollback-from-normalized-schema.sql

EOF
}

# Main execution function
main() {
    print_header "BDNS Production Database Cutover"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    check_migration_completed
    check_application_status
    show_cutover_plan
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "Dry run completed. Use --force to execute cutover."
        exit 0
    fi
    
    if [[ "$VERIFY_ONLY" == "true" ]]; then
        verify_cutover
        print_info "Verification completed."
        exit 0
    fi
    
    # Final confirmation
    if [[ "$FORCE" != "true" ]]; then
        echo ""
        echo -e "${RED}⚠️  THIS IS THE FINAL STEP: This will activate the new normalized schema.${NC}"
        echo -e "${YELLOW}🛑 Make sure your application is stopped and you've tested the new schema.${NC}"
        echo -e "${GREEN}✅ Your original data is safely backed up.${NC}"
        echo ""
        read -p "Are you ready to proceed with the cutover? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Cutover cancelled by user"
            exit 0
        fi
    fi
    
    run_cutover
    verify_cutover
    show_post_cutover_instructions
}

# Parse command line arguments
DRY_RUN=false
FORCE=false
VERIFY_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set up PostgreSQL password
export PGPASSWORD=$DB_PASSWORD

# Run main function
main