[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat&logo=swagger&logoColor=black)](https://swagger.io/)

# 🚀 Memories Backend API

A robust, scalable REST API backend for the Memories social platform, built with modern JavaScript technologies. This project demonstrates expertise in full-stack development, API design, security implementation, and cloud deployment.

**Memories** is a dynamic social application enabling users worldwide to share and discover memorable experiences through posts and interactive comments. The backend handles user authentication, content management, and real-time interactions with enterprise-grade security and performance.

## 🌐 Live Demo & Documentation

- **Frontend Application**: [https://create-your-memory.netlify.app/](https://create-your-memory.netlify.app/)
- **Backend API**: [https://memories-api.duckdns.org](https://memories-api.duckdns.org)
- **Interactive API Docs**: [https://memories-api.duckdns.org/docs](https://memories-api.duckdns.org/docs)
- **Frontend Repository**: [https://github.com/iota-008/Create-Memories](https://github.com/iota-008/Create-Memories)

## 🛠️ Tech Stack & Architecture

### Core Technologies
- **Runtime**: Node.js with ES6+ features
- **Framework**: Express.js for RESTful API development
- **Database**: MongoDB with Mongoose ODM for flexible data modelling
- **Authentication**: JWT tokens with bcrypt password hashing
- **Documentation**: Swagger/OpenAPI for comprehensive API documentation

### Security & Performance
- **Security Middleware**: Helmet, CORS, Rate Limiting, MongoDB Sanitisation, XSS Protection
- **Authentication**: Secure JWT implementation with refresh tokens
- **Data Validation**: Joi schema validation
- **Logging**: Morgan for request logging
- **Error Handling**: Centralised error management with proper HTTP status codes

### DevOps & Deployment
- **Environment Management**: dotenv for configuration
- **Process Management**: Graceful shutdown handling
- **Deployment**: VPS with Traefik reverse proxy
- **Container Ready**: Modular architecture for easy containerization

<img width="549" height="455" alt="Memories-logo" src="https://github.com/user-attachments/assets/0fa265d2-4cc8-49df-a27c-1aadeb5852ca" />


## 📋 Key Features

### 🔐 Authentication & Authorization
- User registration and login with secure password hashing
- JWT-based authentication with cookie support
- Google OAuth integration (optional)
- Role-based access control

### 📝 Content Management
- Full CRUD operations for posts and comments
- Post liking and interaction tracking
- Image upload support with file validation
- Real-time content updates

### 🛡️ Security & Performance
- Rate limiting to prevent abuse
- Input sanitisation and validation
- CORS configuration for cross-origin requests
- Comprehensive error handling and logging

### 📚 Developer Experience
- Auto-generated Swagger documentation
- Health check endpoints for monitoring
- Modular architecture with clean separation of concerns
- Comprehensive logging and debugging support

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/iota-008/Create-Memories-Backend.git
cd Create-Memories-Backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration
Create a `.env` file with:
```env
NODE_ENV=development
PORT=5000
CONNECTION_URL=mongodb://localhost:27017/memories
SECRET_KEY=your_secure_jwt_secret
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Visit `http://localhost:5000/docs` for interactive API documentation!

## 📡 API Endpoints Overview

| Resource | Operations | Description |
|----------|------------|-------------|
| **Users** | POST /user/register, POST /user/login | User management and authentication |
| **Posts** | GET/POST /posts, PUT/DELETE /posts/:id | Content creation and management |
| **Comments** | GET/POST /comments, PUT/DELETE /comments/:id | Interactive commenting system |
| **Health** | GET /health | System monitoring |

## 🏗️ Architecture Highlights

- **RESTful Design**: Clean, intuitive API endpoints following REST principles
- **MVC Pattern**: Organised code structure with models, controllers, and routes
- **Middleware Chain**: Comprehensive request processing pipeline
- **Database Optimization**: Efficient queries with Mongoose indexing
- **Scalable Structure**: Modular design ready for microservices migration

## 📈 Performance & Security

- **Rate Limiting**: Prevents API abuse with configurable limits
- **Data Sanitisation**: Protects against NoSQL injection and XSS attacks
- **Secure Headers**: Helmet.js for security headers
- **Input Validation**: Joi schemas ensure data integrity
- **Error Boundaries**: Graceful error handling without exposing sensitive information

## 👨‍💻 Developer

**Ankit Raibole**
- GitHub: [@iota-008](https://github.com/iota-008)
- Portfolio: [View Projects](https://iota-008.github.io)

---
