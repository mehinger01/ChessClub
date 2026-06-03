# ChessClub Roadmap

## Vision

Create a chess platform designed for schools, clubs, and coaches that combines:
- Online play
- Structured puzzle training
- Personalized improvement plans
- Coach/teacher dashboards
- Student engagement and competition

The long-term goal is to become a complete chess improvement platform rather than simply a chess board.

---

# Completed Features

## Core Chess
- Chess board
- Move validation
- Move history
- Undo support
- Game export
- Game archive foundation
- Custom boards
- Custom pieces
- Novice mode foundation

## Puzzle System
- Puzzle player
- Puzzle review workflow
- Certification queue
- Promotion to active pool
- Puzzle taxonomy
- Duplicate detection
- Batch verification
- Protection system

## Puzzle Importing
- Lichess CSV importer
- Theme mapping
- Difficulty mapping
- Rating mapping
- Import filters
- API importer
- Rate-limit handling
- Import summaries

## Administration
- Puzzle management dashboard
- Status tracking
- Import history
- Review tools

## Firebase Foundation
- Firebase project created
- Firebase Authentication enabled
- Cloud Firestore enabled
- Replit Secrets configured
- Firebase SDK installed
- Lazy Firebase initialization added
- Firebase diagnostics panel added
- Firestore read/write connection verified
- localStorage remains the default provider

---

# Current Sprint

## Student Account Foundation

Goals:
- Finalize Email Access Policy
- Add student signup/login flow
- Create Firebase-backed student profiles
- Keep localStorage as the default provider until Firebase is explicitly enabled
- Avoid moving puzzle/game data until authentication is stable

Success Criteria:
- Admin can choose school-only or any-email access
- oscodaschools.org is configured as the default school domain
- A student can create an account and log in
- A student profile is created in Firestore
- Existing puzzle and game functionality remains unchanged

---

# Phase 1 - Core Chess Experience

Status: Mostly Complete

### Remaining
- Full game archive UI
- Enhanced game review

---

# Phase 2 - Puzzle System

Status: Mostly Complete

### Remaining
- Theme accuracy improvements
- Puzzle analytics
- Admin reporting

---

# Phase 3 - Firebase + Student Accounts

Status: In Progress

### Completed
- Firebase project created
- Firebase Authentication enabled
- Cloud Firestore enabled
- Replit Secrets configured
- Firebase SDK installed
- Lazy Firebase initialization added
- Firebase diagnostics panel added
- Firestore read/write connection verified

### Authentication
- Student login
- Teacher login
- Admin login
- Email Access Policy
- Allowed domain management

### Student Profiles
- Rating
- Progress
- Puzzle history
- Training history

Collections:
- users
- studentProfiles
- puzzleAttempts
- games
- ratings
- assignments

Success Criteria:
- Students can log in from multiple devices
- Progress follows the user

---

# Phase 4 - Student-vs-Student Play

### Features
- Challenges
- Matchmaking
- Game invitations
- Online games

### Ratings
- Internal rating system
- Win/loss tracking
- Leaderboards

### School Features
- Classroom competitions
- Club competitions

Success Criteria:
- Students can play each other from different devices

---

# Phase 5 - Analytics & Personalized Training

### Game Analysis
- Stockfish integration
- Blunder detection
- Accuracy scores

### Weakness Identification
- Forks
- Skewers
- Pins
- Back-rank mates
- Endgames
- King safety

### Personalized Training
- Strengths
- Weaknesses
- Recommended puzzles
- Improvement trends

### Coach Dashboard
- Student growth
- Assignment tracking
- Weakness reports

Success Criteria:
- Training recommendations are individualized

---

# Phase 6 - Mobile & Platform Expansion

### Progressive Web App (PWA)
- Installable
- Offline support
- Chromebook friendly

### Android App
- Native packaging
- Firebase backend
- Mobile notifications

### Google Play Store
- Public distribution
- Automatic updates
- School deployment options

### Push Notifications
- New challenge
- Puzzle assignment
- Tournament reminder
- Training streak

Success Criteria:
- ChessClub available through Google Play

---

# Future Ideas

## AI Coach Mode
Explain mistakes, best moves, and tactical opportunities in student-friendly language.

## Parent Portal
- Progress
- Ratings
- Activity
- Assignments

## Teacher Dashboard
- Assign puzzles
- Track completion
- View class analytics

## Tournament Manager
- Pairings
- Standings
- Results
- School tournaments

## Classroom Mode
- Sections
- Teams
- Competitions

## Achievement System
- Streaks
- Puzzle milestones
- Tournament participation

## Custom Puzzle Generator
- Student games
- Uploaded PGNs
- Coach-selected positions

---

# Technical Debt

## High Priority
- Complete Firebase migration plan
- Separate storage layer from UI
- Improve theme validation
- Add Firebase security rules before student rollout

## Medium Priority
- API import monitoring
- Enhanced logging
- Test coverage

## Low Priority
- Additional board themes
- Additional piece packs

---

# Stretch Vision

Play → Analyze → Identify Weaknesses → Assign Training → Measure Improvement

Create a personalized chess improvement system for students, coaches, and schools.
