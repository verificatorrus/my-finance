# My Finance

Modern finance management application built with React, TypeScript, Material UI, and Cloudflare Workers.

## 🚀 Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Material UI v7** - Comprehensive component library following Material Design
- **Vite** - Fast build tool and dev server
- **Emotion** - CSS-in-JS styling solution

### Backend
- **Cloudflare Workers** - Serverless backend runtime
- **Cloudflare D1** - SQL database (SQLite-based)
- **Cloudflare KV** - Key-value storage for JWT caching
- **Firebase Authentication** - User authentication

### Mobile
- **Capacitor 8** - Cross-platform native runtime for Android

## 📦 Installation

```bash
# Install dependencies
npm install

# Generate Cloudflare types
npm run cf-typegen
```

## 🛠️ Development

### Web Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Mobile Development (Android)

```bash
# Sync web assets to Android
npm run android:sync

# Open project in Android Studio
npm run android:open

# Build debug APK
npm run android:build

# Build release APK
npm run android:release
```

### Cloudflare Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## 🗂️ Project Structure

```
my-finance/
├── src/                    # Frontend React application
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── assets/            # Static assets
├── worker/                # Cloudflare Worker (API backend)
│   └── index.ts          # Worker entry point
├── android/              # Capacitor Android project
├── capacitor.config.ts   # Capacitor configuration
├── wrangler.jsonc        # Cloudflare Workers configuration
└── vite.config.ts        # Vite build configuration
```

## 🔧 Configuration

### Environment Setup

Create `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
```

### Cloudflare Bindings

The project is configured with the following Cloudflare bindings:

- **D1 Database**: `DB`
  - Production: `my-finace-prod`
  - Development: `my-finance-dev`

- **KV Namespace**: `PUBLIC_JWK_CACHE_KV`
  - Used for caching Firebase Authentication public keys

### Capacitor Configuration

Update the server URL in `capacitor.config.ts` to match your production domain:

```typescript
server: {
  url: 'https://your-production-domain.pages.dev',
  cleartext: false
}
```

## 🌿 Git Workflow

The project uses a two-branch strategy:

- **master** - Stable production-ready code
- **develop** - Active development branch

```bash
# Current branch
git branch --show-current

# Switch to develop
git checkout develop

# Switch to master
git checkout master
```

## 🎨 Material UI Theme

The application uses a custom Material UI theme configured in `src/main.tsx`. You can customize colors, typography, and other design tokens by modifying the theme configuration.

```typescript
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
})
```

## 📱 Android Development

### Prerequisites

- Android Studio
- Java Development Kit (JDK) 17 or higher
- Android SDK

### First Time Setup

1. Build the web application:
   ```bash
   npm run build
   ```

2. Sync with Android:
   ```bash
   npx cap sync android
   ```

3. Open in Android Studio:
   ```bash
   npm run android:open
   ```

4. Run on emulator or physical device from Android Studio

## 🔐 Authentication

The application uses Firebase Authentication with public key caching in Cloudflare KV for token verification. JWT public keys are cached using the key defined in `wrangler.jsonc`:

```json
"vars": {
  "PUBLIC_JWK_CACHE_KEY": "firebase-auth-jwk-cache"
}
```

## 📚 Resources

- [React Documentation](https://react.dev)
- [Material UI Documentation](https://mui.com/material-ui/getting-started/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Vite Documentation](https://vite.dev)

## 📄 License

Private project

## 🤝 Contributing

This is a private project. Contact the repository owner for collaboration opportunities.
