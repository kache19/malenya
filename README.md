
<<<<<<< HEAD
# Pharmacy Management System (PMS)

A comprehensive pharmacy management system built with React, TypeScript, PHP, and MySQL. Features include inventory management, point-of-sale, finance tracking, staff management, and AI-powered prescription analysis.

## Features

- 🏥 **Multi-branch Support**: Manage multiple pharmacy locations
- 📦 **Inventory Management**: Batch tracking, expiry monitoring, stock transfers
- 💰 **Point of Sale**: Complete POS system with receipt generation
- 📊 **Finance Management**: Invoices, payments, expense tracking
- 👥 **Staff Management**: Role-based access control
- 🤖 **AI Features**: Prescription analysis with Google Gemini
- 📈 **Reports & Analytics**: Comprehensive reporting and dashboards
- 🔒 **Security**: bcrypt password hashing, JWT authentication, input validation

## Quick Start

### Prerequisites

- XAMPP (or any Apache/PHP/MySQL stack)
- Node.js 18+ (for frontend development)
- MySQL

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd malenya
   ```

2. **Setup XAMPP**
   - Install and start XAMPP
   - Place the project in `C:/xampp/htdocs/malenyapms/malenya` (adjust path as needed)
   - Ensure Apache and MySQL are running

3. **Database Setup**
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Create a database named `malenya_pms`
   - Import `backend/schema_mysql.sql`

4. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Frontend (React dev server)
   cd frontend
   npm run dev

   # Backend is served via Apache at http://localhost/malenyapms/malenya/backend/index.php/api/
   ```

6. **Access the application**
   - Frontend: http://localhost:3000 (or as configured in Vite)
   - Backend API: http://localhost/malenyapms/malenya/backend/index.php/api/

## Production Deployment

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to web server**
   - Copy `frontend/dist/` contents to your web server's document root
   - Copy `backend/` to your PHP-enabled server
   - Configure Apache/Nginx to serve the frontend and proxy API calls to the backend

3. **Setup reverse proxy** (nginx example)
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       root /path/to/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost/malenyapms/malenya/backend/index.php/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login

### Core Endpoints
- `GET /api/branches` - List branches
- `GET /api/inventory` - Get inventory
- `POST /api/sales` - Create sale
- `GET /api/finance/invoices` - List invoices
- `GET /api/staff` - List staff

### Health & Monitoring
- `GET /api/health` - System health check

## Database Management

The database schema is defined in `backend/schema_mysql.sql`. Use phpMyAdmin or MySQL CLI for management.

## Environment Variables

Configure database connection in `backend/config/database.php`.

Key settings:
- Database host, name, user, password
- JWT secret
- Gemini API key (optional)

## Development

### Project Structure
```
├── frontend/            # React frontend
│   ├── components/      # React components
│   ├── services/        # API services
│   ├── public/          # Static assets
│   ├── package.json     # Frontend dependencies
│   └── vite.config.ts   # Vite configuration
├── backend/             # PHP backend API
│   ├── index.php        # Main API entry point
│   ├── routes/          # API route handlers
│   ├── utils/           # Utilities (auth, JWT)
│   ├── config/          # Configuration files
│   └── schema_mysql.sql # Database schema
└── README.md            # This file
```

### Available Scripts

**Frontend:**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Security

- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Input validation
- CORS configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
=======
>>>>>>> c50224702b61b39be1fd2547517f6f47c22a8bbd
