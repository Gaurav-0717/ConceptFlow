# 🧠 ConceptFlow — AI-Powered Visual Learning Platform

ConceptFlow is an AI-powered learning platform that transforms complex concepts into **easy-to-understand visual explanations, structured learning flows, and interactive quizzes**.

Instead of simply reading long explanations, students can enter a concept or paragraph and ConceptFlow converts it into a visual learning experience with **AI-generated summaries, connected concepts, learning-level explanations, and quizzes**.

---

## 🚀 Live Deployment

### 🌐 Frontend

**Live Application:**
https://concept-flow-three.vercel.app

### ⚙️ Backend API

**Backend:**
https://conceptflow-89iq.onrender.com/api/health

---

## ✨ Features

* 🤖 AI-powered concept visualization
* 🧩 Interactive visual learning flows
* 🎓 Beginner, Intermediate, and Advanced learning levels
* 📝 AI-generated interactive quizzes
* 📚 Learning history
* 🏆 Weekly, Monthly, and All-Time leaderboards
* ⭐ XP-based learning system
* 🔥 Gamification and progress tracking
* ⚡ MongoDB-based AI response caching
* 🔄 AI retry and fallback mechanism
* 🔐 User authentication
* 📱 Responsive design
* 🚦 API validation and rate limiting

---

## 🧠 How It Works

```text
Student enters a concept
          ↓
    Backend validates input
          ↓
      Gemini AI Pipeline
          ↓
 Structured Visualization Schema
          ↓
   Visualization Renderer
          ↓
 Visual Explanation + Summary
          ↓
      Interactive Quiz
          ↓
      Score & Feedback
          ↓
 Learning History / XP
```

---

## 🤖 AI-Powered Visualization

ConceptFlow uses the **Google Gemini API** to generate structured educational content.

Instead of directly rendering arbitrary AI-generated UI, the AI response is converted into a controlled visualization schema.

### Visualization Schema

```json
{
  "id": "concept-id",
  "title": "Concept Title",
  "type": "flowchart",
  "summary": "Concept summary",
  "nodes": [],
  "connections": []
}
```

This makes the visualization engine reusable for different subjects and concepts.

---

## ⚡ AI Reliability & Caching

ConceptFlow includes a reliability layer designed to reduce unnecessary AI requests and provide a better experience when AI generation is unavailable.

### Reliability Features

* Google Gemini API integration
* Automatic retry mechanism
* MongoDB-based response caching
* 30-day cache expiration
* Hashed cache keys
* Prompt/model/schema versioning
* AI response validation
* Fallback educational content

### Fallback Topics

The application includes fallback content for concepts such as:

* Photosynthesis
* Water Cycle
* TCP Handshake
* OSI Model
* French Revolution

---

## 🎓 Learning Levels

Students can choose how detailed they want the explanation to be.

| Level           | Description                                  |
| --------------- | -------------------------------------------- |
| 🟢 Beginner     | Simple language and fundamental concepts     |
| 🟡 Intermediate | More detailed explanations and relationships |
| 🔴 Advanced     | Deeper and more technical explanations       |

---

## 📝 Interactive Quiz System

ConceptFlow generates quizzes based on the learning content.

Each quiz includes:

* 5 questions
* 4 multiple-choice options
* Server-controlled correct answers
* Automatic scoring
* Answer explanations

### Quiz Flow

```text
Concept
   ↓
AI Explanation
   ↓
Quiz Generation
   ↓
Student Answers
   ↓
Score
   ↓
Feedback & Explanations
```

---

## 🏆 Gamification

ConceptFlow uses an XP-based learning system to encourage consistent learning.

```text
Explore Concept
      ↓
Complete Learning Activity
      ↓
Complete Quiz
      ↓
Earn XP
      ↓
Improve Ranking
```

### Leaderboard Periods

* Weekly
* Monthly
* All-Time

---

## 📚 Learning History

Authenticated users can track concepts they have explored.

Learning history can be used to support:

* Previous concepts
* Learning activity
* Progress tracking
* XP calculation
* Future personalized recommendations

---

## 🗄️ Database

ConceptFlow uses **MongoDB with Mongoose** for persistent application data.

Example models include:

```text
User
LearningHistory
XPActivity
```

MongoDB is also used for the AI caching layer.

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3
* Responsive UI

### Backend

* Node.js
* Express.js
* REST APIs

### Database

* MongoDB
* Mongoose

### AI

* Google Gemini API
* Generative AI
* Structured AI responses
* AI-powered educational content generation

### Deployment & Development

* Git
* GitHub
* Vercel
* Render
* npm

---

## 🏗️ Project Architecture

```text
ConceptFlow
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   └── ...
│
├── package.json
└── README.md
```

---

## 🔌 Backend API

The backend provides REST APIs for:

```text
Authentication
│
├── User Registration
└── User Login

Learning
│
├── Concept Generation
├── Visualization
├── Learning Levels
└── Quiz Generation

Progress
│
├── Learning History
├── XP Activities
└── Leaderboard
```

---

## 🧪 Testing

The backend includes automated tests for important application functionality.

Testing covers areas including:

* API endpoints
* Authentication
* Visualization generation
* Learning history
* Leaderboard
* Database operations
* Validation
* Error handling

---

## 💻 Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Gaurav-0717/ConceptFlow.git
cd ConceptFlow
```

### 2. Install Dependencies

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

---

## 🔑 Environment Variables

Create the required environment variables for the backend.

### Backend `.env`

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=your_gemini_model

JWT_SECRET=your_jwt_secret
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
```

> ⚠️ Never commit `.env` files or API keys to GitHub.

---

## ▶️ Start the Application

### Start Backend

```bash
cd server
npm run dev
```

### Start Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The application will then be available at the local Vite development URL.

---

## 🌐 Deployment

### Frontend — Vercel

ConceptFlow frontend is deployed on Vercel.

**Production URL:**

https://concept-flow-three.vercel.app/

### Backend — Render

The backend is deployed separately on Render.

Configure the following environment variables on Render:

```text
MONGODB_URI
GEMINI_API_KEY
GEMINI_MODEL
JWT_SECRET
```

Then configure the frontend production API URL to point to the deployed backend.

---

## 🔒 Security

ConceptFlow follows basic production security practices:

* Environment variables for secrets
* API key protection
* Authentication middleware
* Protected API routes
* Request validation
* Rate limiting
* CORS configuration
* Server-side quiz answer handling
* MongoDB/Mongoose validation
* Sensitive configuration excluded from Git

---

## 📱 Responsive Design

ConceptFlow is designed for:

```text
Desktop
   ↓
Tablet
   ↓
Mobile
```

The visualization interface includes responsive controls and is optimized for smaller screens.

---

## 🎯 Project Objective

Traditional learning often looks like:

```text
Long Text
   ↓
Read
   ↓
Memorize
```

ConceptFlow provides an interactive alternative:

```text
Concept
   ↓
AI Explanation
   ↓
Visual Structure
   ↓
Interactive Learning
   ↓
Quiz
   ↓
Progress
```

The goal is to make learning **more visual, interactive, and personalized**.

---

## 🔮 Future Enhancements

* 📈 Advanced student analytics
* 🧠 Personalized learning recommendations
* 🗂️ Subject and topic categorization
* 🎮 Extended gamification
* 🏅 Badges and achievements
* 📊 Detailed progress dashboard
* 👥 Social learning
* 📚 AI-generated study plans
* 🎤 Voice-based concept input
* 📄 PDF/document concept extraction

---

## 👨‍💻 Author

### Gaurav Vasant Shingare

**Computer Engineering Student | Full-Stack Developer**

Interested in building full-stack applications using **MERN, AI/ML, and modern web technologies**.

### 🔗 Links

* 🌐 **Live Project:** https://concept-flow-three.vercel.app/
* 💻 **GitHub:** https://github.com/Gaurav-0717
* 🧩 **ConceptFlow Repository:** https://github.com/Gaurav-0717/ConceptFlow
* 🧠 **LeetCode:** https://leetcode.com/u/Gaurav_Shingare/

---

## ⭐ Support

If you find ConceptFlow useful or interesting, consider giving the repository a ⭐ on GitHub.

---

## 📄 License

This project is developed for educational and portfolio purposes.
