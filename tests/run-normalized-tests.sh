#!/bin/bash

# =================================================================
# Normalized BDNS Database Testing Script
# =================================================================

set -e  # Exit on any error

# Configuration
TEST_DB_NAME="bdns_test"
TEST_DB_USER="bdns_user"
TEST_DB_PASSWORD="bdns_password"
TEST_DB_HOST="localhost"
TEST_DB_PORT="5432"

MIGRATION_DIR="../migrations/test-normalized-schema"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================================${NC}"
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

# Check if PostgreSQL is running
check_postgres() {
    print_info "Checking PostgreSQL connection..."
    if ! pg_isready -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER; then
        print_error "PostgreSQL is not running or not accessible"
        print_info "Please start PostgreSQL and ensure it's accessible at $TEST_DB_HOST:$TEST_DB_PORT"
        exit 1
    fi
    print_success "PostgreSQL is running"
}

# Create test database
create_test_database() {
    print_info "Creating test database: $TEST_DB_NAME"
    
    # Drop database if it exists
    if psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -lqt | cut -d \| -f 1 | grep -qw $TEST_DB_NAME; then
        print_warning "Test database exists. Dropping..."
        dropdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME
    fi
    
    # Create fresh database
    createdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME
    print_success "Test database created"
}

# Run migration files
run_migrations() {
    print_header "Running Database Migrations"
    
    local migration_files=(
        "001-create-lookup-tables.sql"
        "002-create-main-tables.sql"
        "003-create-indexes-views.sql"
        "004-data-migration-functions.sql"
    )
    
    for migration_file in "${migration_files[@]}"; do
        local file_path="$MIGRATION_DIR/$migration_file"
        
        if [[ ! -f "$file_path" ]]; then
            print_error "Migration file not found: $file_path"
            exit 1
        fi
        
        print_info "Running migration: $migration_file"
        
        # Set environment variable for psql
        export PGPASSWORD=$TEST_DB_PASSWORD
        
        if psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -f "$file_path"; then
            print_success "Migration completed: $migration_file"
        else
            print_error "Migration failed: $migration_file"
            exit 1
        fi
    done
    
    print_success "All migrations completed successfully"
}

# Verify table creation
verify_tables() {
    print_header "Verifying Table Creation"
    
    export PGPASSWORD=$TEST_DB_PASSWORD
    
    local table_count=$(psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    " | tr -d ' ')
    
    print_info "Created $table_count tables"
    
    if [[ $table_count -ge 20 ]]; then
        print_success "Table creation verification passed"
    else
        print_error "Expected at least 20 tables, found $table_count"
        exit 1
    fi
}

# Create sample data
create_sample_data() {
    print_header "Creating Sample Data"
    
    export PGPASSWORD=$TEST_DB_PASSWORD
    
    print_info "Creating sample organizations..."
    local org_count=$(psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -t -c "
        SELECT create_sample_organizations();
    " | tr -d ' ')
    print_success "Created $org_count sample organizations"
    
    print_info "Creating sample grants..."
    local grant_count=$(psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -t -c "
        SELECT create_sample_grants();
    " | tr -d ' ')
    print_success "Created $grant_count sample grants"
    
    print_info "Creating sample users..."
    local user_count=$(psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -t -c "
        SELECT create_sample_users();
    " | tr -d ' ')
    print_success "Created $user_count sample users"
    
    print_info "Refreshing materialized views..."
    psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -c "
        REFRESH MATERIALIZED VIEW grant_search_view;
        REFRESH MATERIALIZED VIEW organization_summary_view;
    "
    print_success "Materialized views refreshed"
}

# Run Node.js tests
run_nodejs_tests() {
    print_header "Running Node.js Tests"
    
    # Set test database URL
    export TEST_DATABASE_URL="postgresql://$TEST_DB_USER:$TEST_DB_PASSWORD@$TEST_DB_HOST:$TEST_DB_PORT/$TEST_DB_NAME"
    
    print_info "Running comprehensive database tests..."
    
    if node "$SCRIPT_DIR/test-normalized-database.js"; then
        print_success "Node.js tests completed successfully"
    else
        print_error "Node.js tests failed"
        exit 1
    fi
}

# Generate database statistics
generate_statistics() {
    print_header "Database Statistics"
    
    export PGPASSWORD=$TEST_DB_PASSWORD
    
    print_info "Generating database statistics..."
    
    psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -c "
        -- Table counts
        SELECT 
            'Tables' as category,
            table_name,
            (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int as count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ORDER BY count DESC;
        
        -- Constraint summary
        SELECT 
            constraint_type,
            COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        GROUP BY constraint_type
        ORDER BY count DESC;
        
        -- Index summary
        SELECT 
            'Indexes' as category,
            COUNT(*) as total_indexes
        FROM pg_indexes 
        WHERE schemaname = 'public';
        
        -- Materialized view summary
        SELECT 
            'Materialized Views' as category,
            matviewname,
            CASE WHEN ispopulated THEN 'Populated' ELSE 'Not Populated' END as status
        FROM pg_matviews 
        WHERE schemaname = 'public';
    "
    
    print_success "Database statistics generated"
}

# Performance tests
run_performance_tests() {
    print_header "Performance Tests"
    
    export PGPASSWORD=$TEST_DB_PASSWORD
    
    print_info "Running performance tests..."
    
    psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -c "
        -- Test search performance
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM grant_search_view 
        WHERE search_vector @@ plainto_tsquery('spanish', 'tecnología')
        LIMIT 10;
        
        -- Test hierarchical query performance
        EXPLAIN (ANALYZE, BUFFERS)
        WITH RECURSIVE org_hierarchy AS (
            SELECT id, name, parent_id, 1 as level
            FROM organizations WHERE parent_id IS NULL
            UNION ALL
            SELECT o.id, o.name, o.parent_id, oh.level + 1
            FROM organizations o
            JOIN org_hierarchy oh ON o.parent_id = oh.id
        )
        SELECT COUNT(*) FROM org_hierarchy;
        
        -- Test join performance
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT g.title, o.name, COUNT(uf.id) as favorites_count
        FROM grants g
        JOIN organizations o ON g.organization_id = o.id
        LEFT JOIN user_favorites uf ON g.id = uf.grant_id
        GROUP BY g.id, g.title, o.name
        ORDER BY favorites_count DESC
        LIMIT 10;
    "
    
    print_success "Performance tests completed"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up test database..."
    dropdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME 2>/dev/null || true
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_header "Normalized BDNS Database Testing Suite"
    
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    # Check prerequisites
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if migration files exist
    if [[ ! -d "$MIGRATION_DIR" ]]; then
        print_error "Migration directory not found: $MIGRATION_DIR"
        exit 1
    fi
    
    # Run test sequence
    check_postgres
    create_test_database
    run_migrations
    verify_tables
    create_sample_data
    run_nodejs_tests
    generate_statistics
    run_performance_tests
    
    print_header "🎉 ALL TESTS COMPLETED SUCCESSFULLY!"
    print_success "The normalized database structure is ready for production use"
    print_info "Test database will be cleaned up automatically"
}

# Help function
show_help() {
    cat << EOF
Normalized BDNS Database Testing Script

USAGE:
    $0 [options]

OPTIONS:
    -h, --help          Show this help message
    --keep-db          Keep test database after tests (skip cleanup)
    --skip-node        Skip Node.js tests
    --stats-only       Only generate statistics (requires existing test db)

ENVIRONMENT VARIABLES:
    TEST_DB_NAME        Test database name (default: bdns_test)
    TEST_DB_USER        Database user (default: bdns_user)
    TEST_DB_PASSWORD    Database password (default: bdns_password)
    TEST_DB_HOST        Database host (default: localhost)
    TEST_DB_PORT        Database port (default: 5432)

EXAMPLES:
    # Run full test suite
    $0
    
    # Run tests and keep database for inspection
    $0 --keep-db
    
    # Generate statistics only
    $0 --stats-only

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --keep-db)
            trap - EXIT  # Remove cleanup trap
            shift
            ;;
        --skip-node)
            SKIP_NODE=true
            shift
            ;;
        --stats-only)
            STATS_ONLY=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run appropriate function based on options
if [[ "$STATS_ONLY" == "true" ]]; then
    generate_statistics
else
    main
fi