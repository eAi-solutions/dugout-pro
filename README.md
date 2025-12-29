# Dugout Pro

A comprehensive React Native/Expo app for baseball coaches to plan and organize practice sessions with interactive field diagrams and drill management.

## Features

### 🏟️ Interactive Baseball Field
- Visual field diagram with clickable positions
- Player placement and movement tracking
- Real-time field layout visualization

### 📋 Practice Planning
- Comprehensive drill library with 20+ pre-loaded drills
- Custom drill creation and management
- Practice plan builder with time allocation
- Drill categorization (Warm-up, Fielding, Hitting, Pitching, etc.)

### 🎯 Drill Management
- Add, edit, and delete custom drills
- Set duration and equipment requirements
- Organize drills by category and skill level
- Save and reuse practice plans

### 📱 User Experience
- Clean, intuitive interface
- Responsive design for various screen sizes
- Smooth animations and transitions
- Cross-platform compatibility (iOS, Android, Web)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dugout-pro.git
cd dugout-pro
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## Project Structure

```
dugout-pro/
├── App.tsx                 # Main application component
├── BaseballField.tsx       # Interactive field component
├── BaseballFieldImage.tsx  # Field image component
├── BaseballFieldSVG.tsx    # SVG field component
├── InteractiveField.tsx    # Field interaction logic
├── baseballDrills.ts       # Drill data and types
├── assets/                 # Images and static assets
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Key Components

### App.tsx
The main application component that manages:
- State for drills, practice plans, and UI
- Navigation between different views
- Drill selection and practice plan creation
- User interface and animations

### BaseballField Components
- **BaseballField.tsx**: Main field component with position management
- **BaseballFieldImage.tsx**: Image-based field display
- **BaseballFieldSVG.tsx**: SVG-based field rendering
- **InteractiveField.tsx**: Handles field interactions and player placement

### baseballDrills.ts
Contains:
- Drill type definitions
- Practice plan interfaces
- Pre-loaded drill database
- Drill management utilities

## Usage

### Creating Practice Plans
1. Navigate to the Practice Planning section
2. Select drills from the available library
3. Arrange drills in your preferred order
4. Set duration for each drill
5. Save your practice plan for future use

### Managing Drills
1. Access the drill library
2. Add custom drills with title, description, and duration
3. Edit existing drills as needed
4. Organize drills by category

### Using the Field Diagram
1. Open the field diagram view
2. Click on positions to place players
3. Visualize drill setups and player movements
4. Use for planning defensive alignments

## Technologies Used

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe JavaScript
- **React Native SVG**: Vector graphics rendering
- **React Native Web**: Web platform support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the 0BSD License - see the package.json file for details.

## Future Enhancements

- [ ] Player roster management
- [ ] Statistics tracking
- [ ] Weather integration
- [ ] Team communication features
- [ ] Advanced drill analytics
- [ ] Offline mode support

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team.

---

**Happy Coaching! ⚾**
