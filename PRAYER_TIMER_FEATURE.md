# Prayer Timer Feature

## Overview
Added a prayer timer feature to the presentation screens that allows users to set a timer for their prayer time and receive notifications when the time is up.

## Features Implemented

### 1. Timer Controls (Settings Panel)
- **Duration Input**: Set prayer timer from 1-120 minutes
- **Start/Stop Buttons**: Control timer with clear visual feedback
- **Live Display**: Shows remaining time in MM:SS format when timer is active
- **Help Text**: Explains feature to users

### Active Timer Display
- **Hidden During Prayer**: Timer runs silently in background without visual distraction
- **Settings Panel Display**: Live timer countdown shown in settings panel while timer is active

### 3. Timer Complete Notifications

#### Browser Notification
- Requests permission on first timer start
- Sends system notification when timer completes
- Works even when browser is in background
- Shows "Prayer Timer Complete!" message

#### Visual Notification
- **Full-screen overlay**: Prominent notification on the presentation screen
- **Animated**: Pulse animation draws attention
- **Icon**: Large bell icon (80px)
- **Message**: "Prayer Timer Complete! 🙏"
- **Auto-dismiss**: Notification disappears after 10 seconds

## Technical Implementation

### State Management
```typescript
const [prayerTimerMinutes, setPrayerTimerMinutes] = useState(10); // Timer duration
const [prayerTimerActive, setPrayerTimerActive] = useState(false); // Timer running state
const [prayerTimerRemaining, setPrayerTimerRemaining] = useState(0); // Seconds remaining
const [showTimerNotification, setShowTimerNotification] = useState(false); // Visual notification
```

### Timer Logic
- **Countdown Effect**: useEffect with 1-second interval
- **Browser API**: Uses Notification API for system notifications
- **Permission Handling**: Requests notification permission gracefully
- **Auto-cleanup**: Clears interval and resets state when timer completes

### Helper Functions
- `startPrayerTimer()`: Starts timer and requests notification permission
- `stopPrayerTimer()`: Stops active timer and resets state
- `formatTime(seconds)`: Converts seconds to MM:SS format

## User Flow

1. **Open Settings**: Click settings icon in presentation controls
2. **Set Duration**: Enter desired prayer time (1-120 minutes)
3. **Start Timer**: Click "Start Timer" button
4. **See Timer**: Timer appears in top-right corner
5. **Continue Praying**: Timer runs silently in background (no on-screen countdown)
6. **Get Notified**: When timer completes:
   - Browser notification (if permitted)
   - Full-screen visual notification
   - Both auto-dismiss after 10 seconds
7. **Stop Early** (optional): Can stop timer before completion

## UI Design

### Settings Panel Section
- Border separator from other settings
- Clear heading with Timer icon
- Number input with validation (1-120 range)
- Conditional rendering (shows duration input OR active timer display)
- Color-coded buttons (green for start, red for stop)
- Responsive design matches existing settings style

### Active Timer Display
- Runs silently in background without visual distraction
- Timer countdown visible only in settings panel
- Allows users to focus on prayer without distraction

### Completion Notification
- Full-screen overlay (blocks view intentionally)
- Green gradient background (positive/complete feeling)
- Large bell icon and emoji (🙏)
- Pulse animation for attention
- Auto-dismisses so it doesn't block indefinitely

## Browser Compatibility
- Notification API supported in all modern browsers
- Gracefully handles denied permissions
- Visual notification always works (no permission needed)
- Timer logic uses standard JavaScript intervals

## Accessibility
- Clear labels for screen readers
- Large, easy-to-read fonts
- High contrast colors
- Keyboard accessible (settings can be navigated with Tab/Enter)
- Visual and audio notification options

## Future Enhancements (Optional)
- [ ] Sound notification option
- [ ] Custom timer presets (5, 10, 15, 30 minutes)
- [ ] Timer history/statistics
- [ ] Multiple sequential timers
- [ ] Pause/resume functionality
- [ ] Different notification sounds

## Files Modified
- `src/components/PrayerPresentation.tsx`: Complete timer implementation
  - Added state variables
  - Added timer logic and effects
  - Added UI controls in settings
  - Added active timer display
  - Added completion notification overlay
  - Added helper functions

## Testing Checklist
- [x] TypeScript compiles without errors
- [ ] Set timer to 1 minute and verify countdown
- [ ] Verify browser notification appears (if permitted)
- [ ] Verify visual notification appears
- [ ] Verify notification auto-dismisses after 10 seconds
- [ ] Test stop timer button
- [ ] Test timer with different durations
- [ ] Test timer doesn't interfere with prayer navigation
- [ ] Test timer persists through prayer changes
- [ ] Test on different screen sizes
