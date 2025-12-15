
<<<<<<< HEAD
# Pharmacy Management System (PMS)

A comprehensive pharmacy management system built with React, TypeScript, Node.js, and PostgreSQL. Features include inventory management, point-of-sale, finance tracking, staff management, and AI-powered prescription analysis.

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

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (handled by Docker)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pms
   ```

2. **Environment Setup**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Run with Docker**
   ```bash
   ./deploy.sh
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/system/health

### Manual Setup (Development)

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

2. **Start PostgreSQL**
   ```bash
   # Using Docker
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
   ```

3. **Database setup**
   ```bash
   cd backend
   npm run migrate
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd backend
   npm run dev
   ```

## Production Deployment

### Using Docker Compose

1. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit with production values
   ```

2. **Deploy**
   ```bash
   ./deploy.sh
   ```

### Manual Production Setup

1. **Build frontend**
   ```bash
   npm run build
   ```

2. **Start backend with PM2**
   ```bash
   cd backend
   npm run pm2:start
   ```

3. **Setup reverse proxy** (nginx example)
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
       }

       location /api/ {
           proxy_pass http://localhost:5000;
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
- `GET /api/system/health` - System health check
- `GET /api/system/backup` - Create system backup

## Database Management

### Migrations
```bash
cd backend
npm run migrate
```

### Backups
```bash
# Create backup
npm run backup

# Restore from backup
npm run restore path/to/backup.sql
```

## Environment Variables

See `backend/.env.example` for all required environment variables.

Key variables:
- `DB_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - JWT signing secret
- `GEMINI_API_KEY` - Google Gemini API key (optional)

## Development

### Project Structure
```
├── components/          # React components
├── services/           # API services
├── data/              # Mock data
├── backend/           # Node.js backend
│   ├── server.js      # Main server file
│   ├── schema.sql     # Database schema
│   └── migrate.js     # Migration script
├── public/            # Static assets
└── dist/              # Built frontend
```

### Available Scripts

**Frontend:**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

**Backend:**
- `npm run dev` - Development server with nodemon
- `npm run start` - Production server
- `npm run pm2:start` - Start with PM2
- `npm run migrate` - Run database migrations
- `npm run backup` - Create database backup

## Security

- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Input validation with Joi
- Security headers with Helmet
- CORS configuration
- Request logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
=======
>>>>>>> c50224702b61b39be1fd2547517f6f47c22a8bbd
