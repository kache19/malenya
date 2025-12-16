# Pharmacy Management System - PHP Backend

This is the PHP backend for the Malenya Pharmaceutical Company Pharmacy Management System, converted from Node.js/Express to plain PHP with MySQL.

## 🚀 Quick Start

### 1. Database Setup

1. Create a MySQL database named `malenyap_pms_db`
2. Run the schema file:
   ```bash
   mysql -u root -p malenyap_pms_db < schema_mysql.sql
   ```

### 2. Seed Basic Data

Run the seeding script to populate essential data:
```bash
php seed_basic.php
```

This will create:
- Default branch (MAIN_BRANCH)
- Admin user (username: `admin`, password: `admin123`)
- Sample products
- Basic inventory

### 3. Configure Environment

Update `config/database.php` with your MySQL credentials:
```php
$host = getenv('DB_HOST') ?: 'localhost';
$dbname = getenv('DB_NAME') ?: 'malenyap_pms_db';
$user = getenv('DB_USER') ?: 'malenyap_malenya';
$password = getenv('DB_PASSWORD') ?: 'malenya12345';
```

### 4. Test Invoice Generation

Test the professional invoice generation:
```bash
php test_invoice.php
```
This creates a sample invoice and generates an HTML file you can view in your browser.

### 5. Run Setup Check

Verify everything is working:
```bash
php setup.php
```

### 6. Start PHP Server

For development, you can use PHP's built-in server:
```bash
php -S localhost:8000 index.php
```

Or configure Apache/Nginx to serve the `index.php` file.

## 🔧 Business Rules

### Stock Transfer Policy
- **All shipments are made from HEAD_OFFICE** as the central warehouse
- Users can select any branch as the destination
- HEAD_OFFICE maintains master inventory for distribution

## 🔧 Troubleshooting

### "Failed to Create Shipment" Error

This usually means:

1. **Database not set up**: Run `schema_mysql.sql`
2. **HEAD_OFFICE not created**: Run `seed_basic.php` to create the main branch
3. **No products in HEAD_OFFICE**: Ensure HEAD_OFFICE has inventory
4. **Invalid destination branch**: Check that target branch exists

Run `php setup.php` to diagnose issues.

### API Endpoints

The API maintains the same endpoints as the original Node.js version:

- `POST /api/auth/login` - User login
- `GET /api/products` - List products
- `POST /api/inventory/transfers` - Create stock transfer
- And all other original endpoints...

### Frontend Integration

Update your frontend's API base URL to point to the PHP backend:
```javascript
const API_URL = 'http://localhost:8000/api/';
```

## 📄 Invoice Generation

The system includes professional invoice generation with the following features:

### Invoice Templates
- **Professional Design**: Matches your provided invoice layout
- **Company Branding**: Logo placeholder and company information
- **Complete Details**: Invoice number, dates, customer info, itemized table
- **Financial Calculations**: Subtotal, VAT (18%), total amounts
- **Payment Terms**: Due dates and payment instructions

### API Endpoints
- `GET /api/finance/invoices/{id}/html` - Generate HTML invoice
- `GET /api/finance/invoices/{id}/pdf` - Generate PDF invoice (requires PDF library)

### Usage Example
```bash
# Generate HTML invoice
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/finance/invoices/INV-001/html > invoice.html

# Open in browser
open invoice.html
```

### Dynamic Settings Integration

The invoice system now pulls all company information from the settings database:

**Company Settings (Category: 'company'):**
- `company_name` - Company name for branding
- `company_address` - Physical address
- `company_phone` - Contact phone number
- `company_email` - Contact email address
- `company_website` - Website URL
- `company_tax_id` - Tax identification number
- `company_logo` - Path to logo file

**Invoice Settings:**
- `invoice_tax_rate` - VAT percentage (default: 18%)
- `invoice_payment_terms` - Payment terms text
- `invoice_footer_text` - Footer message

### Customization

**Via Settings API:**
```bash
# Update company name
curl -X PUT http://localhost:8000/api/settings/company_name \
  -H "Content-Type: application/json" \
  -d '{"settingValue": "Your Company Name"}'

# Update tax rate
curl -X PUT http://localhost:8000/api/settings/invoice_tax_rate \
  -H "Content-Type: application/json" \
  -d '{"settingValue": "16"}'
```

**File-based:**
- Add your logo as `logo.png` in the backend directory
- Modify styling in `invoice_template.php`
- Update default values in `seed_basic.php`

## 📁 Project Structure

```
backend_php/
├── index.php              # Main entry point
├── config/
│   └── database.php       # MySQL connection
├── utils/
│   ├── jwt.php           # JWT utilities
│   └── auth.php          # Authentication
├── routes/               # API endpoints
│   ├── auth.php
│   ├── products.php
│   ├── inventory.php
│   ├── finance.php       # Invoice generation
│   └── ...
├── invoice_template.php  # Professional invoice template
├── schema_mysql.sql      # Database schema
├── setup.php            # Setup verification
├── seed_basic.php       # Basic data seeding
├── test_invoice.php     # Invoice generation test
└── README.md            # This file
```

## 🔒 Security Notes

- Passwords are hashed using `password_hash()` (bcrypt)
- JWT tokens are validated on each request
- Role-based access control is enforced
- PDO prepared statements prevent SQL injection

## 🆘 Support

If you encounter issues:

1. Run `php setup.php` to check system status
2. Verify database credentials in `config/database.php`
3. Check PHP error logs
4. Ensure MySQL server is running

The system is now fully converted and should work identically to the original Node.js version.</content>
</xai:function_call">The setup scripts and improved error handling should resolve the transfer creation issue. The problem was likely due to missing database setup or foreign key constraints. With the new setup and seeding scripts, the system should work properly.