# Connect — Personal Communication App

A real-time web messaging application similar to WhatsApp, Teams, and Skype. Built with React, Node.js, Socket.io, and SQLite.

## Features

- **User authentication** — Register, login, and profile management
- **Contacts** — Search users and add them to your contact list
- **Real-time 1:1 chat** — Instant messaging with WebSockets
- **Online presence** — See who is online or offline
- **Typing indicators** — Know when someone is typing
- **Unread message counts** — Track unread messages per conversation
- **Modern UI** — Dark-themed, responsive chat interface

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS 4 |
| Backend | Node.js, Express |
| Real-time | Socket.io |
| Database | SQLite (Node.js built-in) |
| Auth | JWT |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start the app

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173).

### 3. Open in browser

Go to [http://localhost:5173](http://localhost:5173)

## Usage

1. **Register** two accounts (use two browser windows or incognito mode)
2. **Add contacts** — Go to the Contacts tab, click "Add contact", and search by username
3. **Start chatting** — Click a contact to open a conversation and send messages in real time

## Project Structure

```
PersonalCommunication/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── context/        # Auth & Socket providers
│       ├── pages/          # Login, Register, Chat
│       └── services/       # API client
├── server/                 # Node.js backend
│   └── src/
│       ├── routes/         # REST API routes
│       ├── db.js           # SQLite setup
│       ├── socket.js       # WebSocket handlers
│       └── index.js        # Server entry
└── package.json            # Root scripts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/contacts` | List contacts |
| GET | `/api/contacts/search?q=` | Search users |
| POST | `/api/contacts` | Add contact |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations/direct` | Start 1:1 chat |
| GET | `/api/conversations/:id/messages` | Get messages |

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send a message |
| `message:new` | Server → Client | New message received |
| `typing:start` / `typing:stop` | Both | Typing indicators |
| `user:status` | Server → Client | Online/offline updates |

## Environment Variables

Copy `server/.env.example` to `server/.env`:

```
PORT=3001
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

## Future Enhancements

- Group chats
- File and image sharing
- Voice and video calls (WebRTC)
- Push notifications
- Message search
- End-to-end encryption
