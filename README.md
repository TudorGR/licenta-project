# CalendarIQ - AI-Powered Calendar

An intelligent calendar application that combines traditional calendar functionality with cutting-edge AI capabilities to revolutionize personal scheduling and event management.

![calendariq](https://github.com/user-attachments/assets/b91a9bf6-0ca7-4387-aad5-9a3625f3a66b)

## 🎯 Overview

CalendarIQ is a comprehensive web application built as a university thesis project at **Universitatea „Alexandru Ioan Cuza" din Iași (UAIC)**. It features an intuitive calendar interface enhanced by an AI assistant that helps users manage their schedules more efficiently through natural language interactions.

## ✨ Key Features

### 🤖 AI-Powered Assistant

- **Natural Language Processing**: Create, modify, and search events using conversational commands
- **Voice Recognition**: Speak your calendar requests directly to the AI assistant
- **Smart Time Suggestions**: AI analyzes your patterns to suggest optimal scheduling times
- **Event Overlap Detection**: Automatically detects and resolves scheduling conflicts
- **Personalized Recommendations**: Context-aware suggestions based on your event history

### 📅 Advanced Calendar Management

- **Multiple View Modes**: Month, week, and day views for comprehensive schedule visualization
- **Event Categories**: Organized categorization (Work, Health, Social, Travel, Education, etc.)
- **Smart Event Creation**: AI-powered event suggestions with location and category recommendations

### 🌍 Local Events Integration

- **Real-time Local Events**: Discover events happening in your city (focused on Iași, Romania)
- **Intelligent Filtering**: Events filtered by timeframe (today, this week, this month)
- **Seamless Integration**: Add local events directly to your personal calendar

### 🎙️ Voice Interface

- **Speech-to-Text**: Create events and interact with the AI using voice commands
- **Real-time Audio Visualization**: Visual feedback during voice input
- **Cross-platform Compatibility**: Works on both desktop and mobile devices

### 📊 Smart Analytics

- **Event Pattern Analysis**: Understand your scheduling habits and productivity patterns
- **Category Statistics**: Visual breakdown of how you spend your time

### 🔐 Secure User Management

- **User Authentication**: Secure login and registration system
- **Personal Data Protection**: Each user's events and preferences are privately stored
- **Persistent Sessions**: Seamless experience across browser sessions

## 🛠️ Technology Stack

### Frontend

- **React 19**: Modern UI library with hooks and context
- **Tailwind CSS 4**: Utility-first CSS framework for responsive design
- **Chart.js**: Interactive charts and data visualizations
- **React Speech Recognition**: Voice input functionality
- **React Router**: Client-side routing
- **Day.js**: Lightweight date manipulation
- **Axios**: HTTP client for API communication

### Backend

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MySQL**: Popular open source database
- **Sequelize**: ORM for database operations
- **JWT**: JSON Web Tokens for authentication
- **bcrypt**: Password hashing and security

### AI & External Services

- **Groq SDK**: Fast AI inference for natural language processing
- **Google Generative AI**: Advanced AI capabilities for event suggestions
- **Speech Recognition API**: Browser-based voice input
- **Local Events API**: Real-time local event discovery

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/licenta-project.git
   cd licenta-project
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**

   Create a `.env` file in the backend directory:

   ```env
   PORT=5000
   JWT_SECRET=your_jwt_secret_here
   GROQ_API_KEY=your_groq_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

5. **Start the application**

   Backend server:

   ```bash
   cd backend
   npm start
   ```

   Frontend development server:

   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the application**

   Open your browser and navigate to `http://localhost:5173`

## 📖 Usage Guide

### Basic Calendar Operations

- **Navigation**: Use the header controls to switch between month, week, and day views
- **Create Events**: Click on any date/time slot or use the "+" button
- **Edit Events**: Click on existing events to modify details
- **Categories**: Organize events with color-coded categories

### AI Assistant Commands

The AI assistant understands natural language commands such as:

- **Creating Events**:

  - "Schedule a meeting tomorrow at 2 PM"
  - "Add gym session on Friday morning"
  - "Put dentist appointment next week"

- **Finding Events**:

  - "When is my next meeting?"
  - "When was my last doctor appointment?"
  - "Find my workout sessions this week"

- **Time Suggestions**:

  - "When should I schedule a team meeting?"
  - "Find the best time for a dentist visit"
  - "Suggest time slots for studying"

- **Local Events**:
  - "What events are happening today?"
  - "Show me local events this weekend"
  - "Any concerts this month?"

### Voice Commands

- Press and hold the microphone button to record voice commands
- Speak naturally - the AI will process your request
- Audio visualization provides real-time feedback

## 📁 Project Structure

```
licenta-project/
├── backend/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── models/
│   │   ├── Event.js             # Event data model
│   │   ├── User.js              # User data model
│   │   └── associations.js      # Model relationships
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── chat.js              # AI chat functionality
│   │   ├── events.js            # Event CRUD operations
│   │   ├── localEvents.js       # Local events discovery
│   │   ├── suggestions.js       # AI suggestions engine
│   │   └── travel.js            # Location and travel utilities
│   ├── database.sqlite          # SQLite database file
│   ├── server.js                # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── context/             # React context providers
│   │   ├── services/            # API service functions
│   │   ├── utils/               # Utility functions
│   │   ├── assets/              # Static assets (icons, images)
│   │   ├── App.jsx              # Main application component
│   │   └── main.jsx             # Application entry point
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🎨 Features in Detail

### AI-Powered Event Creation

The system analyzes your past events to suggest:

- **Event Titles**: Based on similar past events
- **Categories**: Intelligent categorization
- **Locations**: Frequently used venues
- **Time Slots**: Optimal scheduling based on your patterns

### Smart Conflict Resolution

When scheduling conflicts arise, the AI:

- Detects overlapping events
- Suggests alternative time slots
- Provides interactive resolution options

### Local Events Discovery

- Real-time integration with local event sources
- Intelligent filtering by timeframe and relevance
- Location-aware suggestions

## 🔒 Privacy & Security

- **Data Encryption**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **User Isolation**: Each user's data is completely private
- **No Data Sharing**: Personal calendar data never leaves the secure environment

## 🎓 Academic Context

This project was developed as a bachelor's thesis at **Universitatea „Alexandru Ioan Cuza" din Iași (UAIC)**, focusing on the integration of artificial intelligence with traditional calendar management systems. The research explores how AI can enhance user productivity and scheduling efficiency through natural language processing and pattern recognition.

## 📄 Copyright & License

© 2025 **Universitatea „Alexandru Ioan Cuza" din Iași (UAIC)**

This project was developed as part of academic research at UAIC. All rights reserved.

**Note**: This software is the intellectual property of the university and the student developer. Please contact the institution for licensing inquiries.

## 🤝 Contributing

This is an academic project developed for thesis purposes. While the code is available for educational reference, please respect the academic nature of this work.

## 🙏 Acknowledgments

- **UAIC Faculty** for providing guidance and resources
- **Groq** for providing fast AI inference capabilities
- **Google** for Generative AI services
- **Open Source Community** for the various libraries and frameworks used
