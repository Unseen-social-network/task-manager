# Planner Frontend

Modern React + TypeScript frontend for the Planner task management application.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Date Utilities**: date-fns

## Features

- ✅ JWT Authentication with auto-refresh
- ✅ Task Management (CRUD with filters, search, sorting)
- ✅ Contact Book Management
- ✅ File Attachments Upload/Download
- ✅ Responsive Design
- ✅ Modern UI with Tailwind CSS
- ✅ Type-safe with TypeScript
- ✅ Protected Routes
- ✅ Toast Notifications

## Quick Start

### Development

#### Option 1: Local Node.js

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

#### Option 2: Docker (Development with hot-reload)

```bash
docker compose --profile dev up frontend-dev
```

### Production

#### Build for production

```bash
npm run build
```

#### Run production build with Docker

```bash
docker compose up frontend
```

## Project Structure

```
src/
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── tasks/             # Task-related components
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TaskFilters.tsx
│   │   └── TaskDetailsModal.tsx
│   ├── contacts/          # Contact-related components
│   │   ├── ContactCard.tsx
│   │   ├── ContactForm.tsx
│   │   └── ContactDetailsModal.tsx
│   └── PrivateRoute.tsx   # Protected route wrapper
├── pages/
│   ├── LoginPage.tsx
│   ├── TasksPage.tsx
│   └── ContactsPage.tsx
├── services/              # API services
│   ├── api.ts             # Axios instance & interceptors
│   ├── auth.service.ts
│   ├── tasks.service.ts
│   └── contacts.service.ts
├── contexts/              # Global state
│   └── authStore.ts       # Zustand auth store
├── hooks/                 # Custom hooks
│   └── useAuth.tsx
├── types/                 # TypeScript types
│   └── index.ts
├── utils/                 # Utility functions
│   └── helpers.ts
├── App.tsx                # Main app component
├── main.tsx               # App entry point
└── index.css              # Global styles
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_YANDEX_METRIKA_ID=12345678
```

For production, update the URL to your backend server.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Integration

The frontend connects to the Django backend API. Make sure the backend is running at the URL specified in `VITE_API_BASE_URL`.

### API Endpoints Used

- `POST /api/v1/auth/jwt/create/` - Login
- `POST /api/v1/auth/jwt/refresh/` - Refresh token
- `GET/POST /api/v1/tasks/` - List/Create tasks
- `GET/PATCH/DELETE /api/v1/tasks/:id/` - Task details
- `GET/POST /api/v1/tasks/:id/attachments/` - Task attachments
- `GET/POST /api/v1/contacts/` - List/Create contacts
- `GET/PATCH/DELETE /api/v1/contacts/:id/` - Contact details

## Authentication Flow

1. User logs in with username/password
2. Backend returns JWT access and refresh tokens
3. Tokens stored in localStorage
4. Access token sent with every API request
5. Auto-refresh when access token expires
6. Redirect to login if refresh fails

## Features in Detail

### Tasks

- **Create** tasks with title, description, urgency, status, due date
- **Link contacts** from contact book or enter freeform contact info
- **Filter** by status, urgency, due date range
- **Search** by title, description, contact
- **Sort** by due date, created date, urgency
- **Upload files** as attachments
- **Update** task status and details
- **Delete** tasks

### Contacts

- **Create** contacts with name, company, phone, email, Telegram
- **Search** contacts by name, company, email
- **View** all contact details
- **Update** contact information
- **Delete** contacts
- **Use in tasks** - link tasks to contacts

### UI/UX

- Clean, modern interface with Tailwind CSS
- Responsive design (mobile, tablet, desktop)
- Loading states and error handling
- Toast notifications for user feedback
- Modal dialogs for forms and details
- Color-coded urgency and status badges
- Icons for better visual communication

## Development Tips

### Hot Reload

Vite provides instant hot module replacement. Changes to components will reflect immediately without full page reload.

### Type Safety

All API responses and form inputs are typed with TypeScript interfaces. VS Code will provide autocomplete and type checking.

### Code Style

- Use functional components with hooks
- Follow the existing component structure
- Run `npm run format` before committing
- Ensure `npm run lint` passes

### Adding New Features

1. Create types in `src/types/index.ts`
2. Add API service in `src/services/`
3. Create UI components in `src/components/`
4. Create page in `src/pages/`
5. Add route in `src/App.tsx`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Docker Deployment

### Development

```bash
docker compose --profile dev up frontend-dev
```

### Production

```bash
# Build image
docker compose build frontend

# Run container
docker compose up frontend
```

The production build is served by Nginx with optimized caching and compression.

## Troubleshooting

**CORS errors:**
- Make sure backend CORS settings include your frontend URL
- Check `CORS_ALLOWED_ORIGINS` in backend `.env`

**API connection refused:**
- Verify backend is running
- Check `VITE_API_BASE_URL` in frontend `.env`

**Build errors:**
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`

**TypeScript errors:**
- Run `npm run build` to see all type errors
- Check type definitions in `src/types/`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linter and formatter
4. Test thoroughly
5. Submit a pull request

## License

Private and proprietary.
