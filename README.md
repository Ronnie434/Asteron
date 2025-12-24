# 🤖 Asteron - AI Personal Assistant

A premium, AI-powered personal assistant mobile application built with Expo and React Native. Features a beautiful glassmorphic UI, intelligent task management, and voice-powered capture.

## ✨ Features

- **🎙️ Voice Input** - Capture tasks and notes hands-free with AI-powered voice recognition
- **📋 Daily Brief** - Smart dashboard showing today's priorities and upcoming tasks
- **📅 Calendar View** - Visualize your schedule with an intelligent upcoming tasks view
- **✍️ Quick Capture** - Instantly capture thoughts, tasks, and reminders
- **🎨 Premium Design** - Modern glassmorphic UI with smooth animations
- **🌙 Optimized UX** - Floating navigation bar with gesture-aware interactions

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) ~54.0
- **Language**: TypeScript
- **Navigation**: Expo Router v6
- **UI**: React Native with custom design system
- **State**: Zustand
- **Database**: Expo SQLite
- **Fonts**: Manrope & DM Sans (Google Fonts)
- **Icons**: Expo Vector Icons (Ionicons)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone git@github.com:Ronnie434/Asteron.git
cd asteron

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Devices

```bash
# iOS (Simulator)
npm run ios

# Android (Emulator)
npm run android

# Expo Go (Physical Device)
npm start
# Scan the QR code with Expo Go app
```

## 📁 Project Structure

```
asteron/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── brief.tsx        # Daily brief/home
│   │   ├── capture.tsx      # Quick capture
│   │   ├── upcoming.tsx     # Calendar view
│   │   └── settings.tsx     # App settings
│   ├── voice.tsx            # Voice input screen
│   ├── confirm.tsx          # Confirmation modal
│   └── _layout.tsx          # Root layout with floating nav
├── src/
│   ├── ui/                  # UI components & theme
│   │   ├── components/      # Reusable components
│   │   └── theme.ts         # Design system tokens
│   ├── db/                  # Database schema & queries
│   ├── store/               # Zustand state management
│   └── data/                # Mock data & utilities
└── assets/                  # Images, fonts, etc.
```

## 🎨 Design System

The app uses a custom design system with:
- **Typography**: Manrope (headings) & DM Sans (body)
- **Color Palette**: Modern Indigo primary (#6366F1) with semantic colors
- **Spacing**: 4px base unit with consistent scale
- **Components**: Fully typed, reusable UI components

## 🔧 Key Components

- **FloatingTabBar** - Custom glassmorphic bottom navigation
- **Typography** - Type-safe text component with variants
- **Card** - Elevated content containers
- **Button** - Interactive buttons with loading states
- **Chip** - Tag/category indicators

## 📱 Screenshots

*Coming soon*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 👤 Author

**Ronak Patel**
- GitHub: [@Ronnie434](https://github.com/Ronnie434)

## 🙏 Acknowledgments

- Expo team for the incredible framework
- React Native community
- Google Fonts for beautiful typography

---

Built with ❤️ using Expo & React Native
