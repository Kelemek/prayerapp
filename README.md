# Church Prayer Manager

A modern, responsive web application for managing prayer requests in your church community. Built with React, TypeScript, Vite, and Supabase.

## 📚 Documentation

**Complete documentation available in [`docs/`](docs/)**

Quick links:
- **[Setup Guide](docs/SETUP.md)** - Installation and configuration
- **[Features Guide](docs/FEATURES.md)** - Complete feature overview and usage
- **[Email System](docs/EMAIL.md)** - Email notifications and configuration
- **[Database Guide](docs/DATABASE.md)** - Schema, migrations, and RLS policies
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy to production
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Features

### 🙏 Prayer Management
- **Add Prayer Requests**: Create new prayer requests with titles, descriptions, categories, and requester information
- **Status Tracking**: Mark prayers as Active, Ongoing, Answered, or Closed
- **Updates**: Add prayer updates to track progress and answered prayers
- **Categories**: Organize prayers by type (Healing, Guidance, Thanksgiving, Protection, Family, Finances, Salvation, Missions, Other)

### 📱 User Experience

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Statistics**: View prayer counts by status at a glance
- **Advanced Filtering**: Search and filter prayers by category, status, or keywords
- **Local Storage**: All data persists locally in your browser

### 🎨 Modern Interface
- Clean, intuitive design focused on readability and accessibility
- Color-coded prayer categories and statuses
- Modal forms for adding new prayers
- Expandable prayer cards with detailed information

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage Guide

### Adding a Prayer Request
1. Click the "New Prayer Request" button in the header
2. Fill out the form with prayer details
3. Select appropriate category and enter requester name
4. Click "Add Prayer Request"

### Managing Prayer Status
- Use the status dropdown on each prayer card to update progress
- Available statuses: Active, Ongoing, Answered, Closed

### Adding Prayer Updates
1. Click "Add Update" on any prayer card
2. Enter your name and update details
3. Click "Add Update" to save

### Filtering Prayers
Use the filter panel to search and filter prayers by category, status, or keywords.

## Technical Details

Built with React 19, TypeScript, and Vite for a modern development experience.

---

*Built with ❤️ for church communities*
```
