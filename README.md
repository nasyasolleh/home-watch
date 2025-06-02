# HomeWatch - Malaysia Housing Sentiment Analytics Platform

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/homewatch/homewatch)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-purple.svg)](manifest.json)

HomeWatch is a comprehensive web-based sentiment analytics dashboard for Malaysia's affordable housing policies. The platform combines real-time social media sentiment analysis, community discussions, surveys, and housing resources to provide insights into public opinion on housing policies.

## 🏠 Features

### Core Features
- **Real-time Sentiment Analytics** - Monitor social media sentiment about housing policies
- **Interactive Dashboard** - Visualize trends with advanced charts and analytics
- **Community Platform** - Discussion forums for housing-related topics
- **Survey System** - Collect public opinion through polls and questionnaires
- **Housing Resources** - Comprehensive information about Malaysian housing programs
- **Loan Calculator** - Interactive tool for housing loan calculations
- **User Profiles** - Personal activity tracking and engagement metrics

### Technical Features
- **Progressive Web App (PWA)** - Installable on mobile and desktop
- **Offline Support** - Core functionality available without internet
- **Responsive Design** - Optimized for all device sizes
- **Real-time Updates** - Live data synchronization
- **Advanced Analytics** - Predictive insights and trend analysis
- **Accessibility** - WCAG 2.1 compliant design

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- Internet connection for initial setup
- Firebase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/homewatch/homewatch.git
   cd homewatch
   ```

2. **Configure Firebase**
   - Update `js/firebase-config.js` with your Firebase credentials
   - Enable Authentication, Firestore, and Storage in Firebase Console

3. **Serve the application**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Access the application**
   - Open http://localhost:8000 in your browser
   - The app will be available as a PWA after first visit

## 📱 Installation as PWA

HomeWatch can be installed as a Progressive Web App:

1. **On Desktop**: Look for the install button in the address bar or use the in-app install prompt
2. **On Mobile**: Use "Add to Home Screen" from the browser menu
3. **Features when installed**:
   - Standalone app experience
   - Offline functionality
   - Push notifications
   - Background sync

## 🏗️ Project Structure

```
homewatch/
├── index.html              # Landing page
├── dashboard.html           # Analytics dashboard
├── community.html           # Discussion forum
├── survey.html             # Surveys and polls
├── resources.html          # Housing resources
├── profile.html            # User profile
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   ├── style.css          # Global styles
│   ├── dashboard.css      # Dashboard-specific styles
│   ├── community.css      # Community page styles
│   ├── survey.css         # Survey page styles
│   ├── resources.css      # Resources page styles
│   └── profile.css        # Profile page styles
└── js/
    ├── config.js          # App configuration
    ├── utils.js           # Utility functions
    ├── main.js            # Core JavaScript
    ├── auth.js            # Authentication
    ├── firebase-config.js # Firebase setup
    ├── dashboard.js       # Dashboard functionality
    ├── community.js       # Community features
    ├── survey.js          # Survey management
    ├── resources.js       # Resources and calculator
    └── profile.js         # Profile management
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file or update `js/config.js`:

```javascript
// Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your_app_id

// Third-party Services
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key

// Analytics
GA_TRACKING_ID=UA-XXXXXXXXX-X
HOTJAR_ID=your_hotjar_id

// Social Media APIs
TWITTER_BEARER_TOKEN=your_twitter_token
FACEBOOK_ACCESS_TOKEN=your_facebook_token
```

### Feature Flags

Enable/disable features in `js/config.js`:

```javascript
features: {
    enablePWA: true,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enableSocialLogin: false,
    enableRealTimeUpdates: false,
    enableAdvancedAnalytics: true,
    enableBetaFeatures: false
}
```

## 📊 Housing Programs Supported

- **PR1MA** - Middle-income housing scheme
- **Rumah Selangorku** - Selangor state housing program
- **My First Home Scheme** - Federal first-time buyer assistance
- **Rent-to-Own** - Gradual homeownership program
- **PPR Housing** - Public housing program
- **RUMAWIP** - Kuala Lumpur affordable housing

## 🛠️ Development

### Local Development

1. **Install dependencies** (if using build tools)
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

### Code Style

- Follow ESLint configuration
- Use Prettier for code formatting
- Maintain accessibility standards (WCAG 2.1)
- Write semantic HTML
- Use CSS custom properties for theming

### Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run accessibility tests
npm run test:a11y
```

## 🔒 Security

- **Authentication**: Firebase Auth with email/password
- **Data Validation**: Client and server-side validation
- **CSRF Protection**: Enabled by default
- **Content Security Policy**: Configured for security
- **HTTPS Only**: Required for production

## 📈 Analytics & Monitoring

### Built-in Analytics
- User engagement tracking
- Feature usage metrics
- Performance monitoring
- Error tracking
- Sentiment analysis results

### External Services
- Google Analytics (optional)
- Hotjar for user behavior (optional)
- Firebase Analytics
- Custom event tracking

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 80+     | ✅ Full |
| Firefox | 75+     | ✅ Full |
| Safari  | 13+     | ✅ Full |
| Edge    | 80+     | ✅ Full |
| IE      | 11      | ⚠️ Limited |

## 📱 Mobile Support

- **iOS**: Safari 13+, Chrome 80+
- **Android**: Chrome 80+, Firefox 75+
- **PWA Features**: Full support on modern browsers
- **Touch Optimized**: 44px minimum touch targets
- **Responsive**: Mobile-first design approach

## 🚀 Deployment

### Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize project**
   ```bash
   firebase init hosting
   ```

3. **Deploy**
   ```bash
   firebase deploy
   ```

### Other Platforms

- **Netlify**: Connect GitHub repo for auto-deployment
- **Vercel**: Import project and deploy
- **GitHub Pages**: Enable in repository settings
- **Traditional Hosting**: Upload files via FTP

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation
- Ensure accessibility compliance
- Test on multiple browsers/devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chart.js** - Data visualization
- **Font Awesome** - Icons
- **Firebase** - Backend services
- **Malaysia Government** - Housing program data
- **Community Contributors** - Feedback and suggestions

## 📞 Support

- **Documentation**: [docs.homewatch.my](https://docs.homewatch.my)
- **Issues**: [GitHub Issues](https://github.com/homewatch/homewatch/issues)
- **Email**: support@homewatch.my
- **Community**: [Discord](https://discord.gg/homewatch)

## 🗺️ Roadmap

### Version 1.1 (Q2 2024)
- [ ] Real-time WebSocket connections
- [ ] Advanced AI sentiment analysis
- [ ] Mobile app (React Native)
- [ ] Multi-language support

### Version 1.2 (Q3 2024)
- [ ] API for third-party integrations
- [ ] Advanced reporting features
- [ ] Machine learning predictions
- [ ] Government dashboard

### Version 2.0 (Q4 2024)
- [ ] Blockchain integration
- [ ] Smart contracts for housing
- [ ] VR property tours
- [ ] IoT device integration

---

Made with ❤️ for Malaysia's housing future
