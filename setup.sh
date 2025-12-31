#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}   api-laido Docker Setup Script${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

print_step() {
    echo -e "\n${BLUE}[$1] $2${NC}"
}

print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✘ $1${NC}"
}

# Exit on error with message
exit_on_error() {
    print_error "$1"
    echo -e "${YELLOW}Setup aborted. Please fix the issue and try again.${NC}"
    exit 1
}

# Generate nginx config from template
generate_nginx_config() {
    local domain=$1
    local enable_ssl=$2
    local template_file="docker/nginx/nginx.conf.template"
    local output_file="docker/nginx/nginx.conf"
    
    if [ ! -f "$template_file" ]; then
        exit_on_error "Nginx template not found: $template_file"
    fi
    
    # Copy template
    cp "$template_file" "$output_file"
    
    # Replace domain placeholder
    sed -i "s|{{APP_DOMAIN}}|$domain|g" "$output_file"
    
    # HTTP location block - either redirect to HTTPS or serve directly
    if [[ "$enable_ssl" =~ ^[Yy]$ ]] && [ "$domain" != "localhost" ]; then
        # Redirect to HTTPS
        local http_block="location / {\n        return 301 https://\$host\$request_uri;\n    }"
    else
        # Serve directly
        local http_block="location / {\n        try_files \$uri \$uri/ /index.php?\$query_string;\n    }"
    fi
    sed -i "s|{{HTTP_LOCATION_BLOCK}}|$http_block|g" "$output_file"
    
    # SSL server block
    if [[ "$enable_ssl" =~ ^[Yy]$ ]] && [ "$domain" != "localhost" ]; then
        local ssl_block="# HTTPS server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $domain;
    root /var/www/public;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header X-Frame-Options \"SAMEORIGIN\";
    add_header X-Content-Type-Options \"nosniff\";
    add_header Strict-Transport-Security \"max-age=31536000\" always;

    index index.php;
    charset utf-8;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}"
        # Append SSL block to nginx config
        echo "" >> "$output_file"
        echo "$ssl_block" >> "$output_file"
    fi
    
    # Remove SSL placeholder if not used
    sed -i '/{{SSL_SERVER_BLOCK}}/d' "$output_file"
}

# ========================================
# Main Script
# ========================================
print_header

# Check for .env file
if [ ! -f .env ]; then
    print_warning ".env file not found. Copying from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        exit_on_error ".env.example not found. Cannot continue."
    fi
fi

# Cleanup Option
echo -e "\n${BLUE}Do you want to clean up existing Docker resources (images, containers, volumes) before starting?${NC}"
read -p "(y/n) > " cleanup_choice
if [[ "$cleanup_choice" =~ ^[Yy]$ ]]; then
    print_warning "Cleaning up Docker resources..."
    sg docker -c "docker-compose down --rmi all --volumes --remove-orphans" 2>/dev/null || true
    print_success "Project cleanup completed!"
fi

# Step 0: Global Configuration
print_step "0/5" "Global Project Configuration"

read -p "Enter your application domain (e.g., api.laido.com, default: localhost): " app_domain
app_domain=${app_domain:-localhost}

read -p "Enter proxy port to expose (default: 80): " app_port
app_port=${app_port:-80}

read -p "Enable SSL (HTTPS)? (y/n, default: n): " enable_ssl
enable_ssl=${enable_ssl:-n}

if [[ "$enable_ssl" =~ ^[Yy]$ ]] && [ "$app_domain" == "localhost" ]; then
    print_warning "Cannot enable SSL for 'localhost'. SSL will be disabled."
    enable_ssl="n"
fi

# Update .env
if [[ "$enable_ssl" =~ ^[Yy]$ ]]; then
    sed -i "s|APP_URL=.*|APP_URL=https://$app_domain|g" .env
else
    sed -i "s|APP_URL=.*|APP_URL=http://$app_domain|g" .env
fi

# Update docker-compose ports
sed -i "s|- \".*:80\"|- \"$app_port:80\"|g" docker-compose.yml

# Generate nginx config from template
generate_nginx_config "$app_domain" "$enable_ssl"

print_success "Configuration updated for $app_domain on port $app_port"

# Step 1: Build containers
print_step "1/5" "Building Docker containers..."

sg docker -c "docker-compose down --remove-orphans" 2>/dev/null || true

# Build first (separate step for better error detection)
if ! sg docker -c "docker-compose build"; then
    exit_on_error "Docker build failed! Check the error above."
fi

print_success "Docker images built successfully!"

# Start containers
echo -e "${BLUE}Starting containers...${NC}"
if ! sg docker -c "docker-compose up -d"; then
    exit_on_error "Failed to start containers!"
fi

print_success "Containers started successfully!"

# Step 1.5: SSL Certificate (if enabled)
if [[ "$enable_ssl" =~ ^[Yy]$ ]]; then
    print_step "1.5/5" "Requesting SSL Certificate..."
    
    read -p "Enter your email for Let's Encrypt (required): " email
    if [ -z "$email" ]; then
        print_warning "Email is required for Let's Encrypt. Skipping SSL setup."
    else
        # Request certificate
        sg docker -c "docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ --email $email --agree-tos --no-eff-email -d $app_domain --keep-until-expiring"
        
        # Check if certificate was obtained
        if sudo [ -d "./docker/nginx/certs/live/$app_domain" ]; then
            print_success "SSL certificate obtained!"
            
            # Regenerate nginx config with SSL enabled (cert now exists)
            generate_nginx_config "$app_domain" "y"
            
            # Reload Nginx
            sg docker -c "docker-compose exec -T app nginx -s reload" 2>/dev/null || true
            print_success "Nginx reloaded with SSL configuration!"
        else
            print_warning "SSL certificate not found. You may need to retry or check DNS settings."
        fi
    fi
fi

# Step 2: Wait for database
print_step "2/5" "Waiting for database to be ready..."

max_attempts=30
attempt=0
while ! sg docker -c "docker-compose exec -T db mysqladmin ping -u admin -phxMGyhGcE8oRRJn --silent" 2>/dev/null; do
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        exit_on_error "Database failed to start after $max_attempts attempts."
    fi
done
echo ""
print_success "Database is ready!"

# Step 3: Database Initialization
print_step "3/5" "Database Initialization"
echo -e "Choose an option:"
echo -e "  1) Restore from SQL dump (recommended for existing data)"
echo -e "  2) Fresh migration (empty database + run migrations)"
echo -e "  3) Skip database initialization"
read -p "Enter your choice (1/2/3): " db_choice

case "$db_choice" in
    1)
        echo -e "${BLUE}Enter path to SQL dump file:${NC}"
        echo -e "(Default: database/admin-laido_2025-12-30_20-00-01.sql)"
        read -p "> " sql_path
        sql_path=${sql_path:-database/admin-laido_2025-12-30_20-00-01.sql}
        
        if [ ! -f "$sql_path" ]; then
            print_error "File not found: $sql_path"
            print_warning "Skipping database restore."
        else
            echo -e "${BLUE}Sanitizing and importing $sql_path...${NC}"
            
            # Remove schema prefix from SQL dump
            sed 's/`admin-laido`\.//g' "$sql_path" > database/temp_sanitized.sql
            
            # Wrap with foreign key check disables (using printf for proper newlines)
            {
                printf "SET FOREIGN_KEY_CHECKS=0;\n"
                cat database/temp_sanitized.sql
                printf "\nSET FOREIGN_KEY_CHECKS=1;\n"
            } > database/temp_import.sql
            
            sg docker -c "docker-compose exec -T app php artisan db:wipe --force" 2>/dev/null || true
            
            if sg docker -c "docker-compose exec -T db mysql -u admin -phxMGyhGcE8oRRJn admin-laido < database/temp_import.sql"; then
                print_success "Database restored successfully!"
            else
                print_error "Database import failed! Check the SQL dump file."
            fi
            
            rm -f database/temp_sanitized.sql database/temp_import.sql
        fi
        ;;
    2)
        echo -e "${BLUE}Running fresh migrations...${NC}"
        sg docker -c "docker-compose exec -T app php artisan migrate:fresh --force"
        print_success "Migrations completed!"
        ;;
    *)
        print_warning "Skipping database initialization."
        ;;
esac

# Step 4: Final configuration
print_step "4/5" "Finalizing Laravel configuration..."

sg docker -c "docker-compose exec -T app php artisan storage:link" 2>/dev/null || true
sg docker -c "docker-compose exec -T app php artisan config:cache" 2>/dev/null || true
sg docker -c "docker-compose exec -T app php artisan route:cache" 2>/dev/null || true
sg docker -c "docker-compose exec -T app php artisan view:cache" 2>/dev/null || true

print_success "Laravel optimizations applied!"

# Step 5: Summary
print_step "5/5" "Setup Complete!"

app_url=$(grep APP_URL .env | cut -d= -f2)
if [ "$app_port" != "80" ] && [ "$app_port" != "443" ]; then
    app_url="$app_url:$app_port"
fi

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}   ✔ Setup finished successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "   URL: ${BLUE}$app_url${NC}"
echo -e "   Database: ${BLUE}admin-laido${NC}"
if [[ "$enable_ssl" =~ ^[Yy]$ ]]; then
    echo -e "   SSL: ${GREEN}Enabled${NC}"
else
    echo -e "   SSL: ${YELLOW}Disabled${NC}"
fi
echo -e "${GREEN}=========================================${NC}"
