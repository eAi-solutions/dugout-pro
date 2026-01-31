# Scenario Playback UI Test Checklist
**Testing URL:** http://localhost:8081/

## Test Environment Setup
- [ ] Server running at http://localhost:8081/
- [ ] Browser DevTools open (F12)
- [ ] Responsive Design Mode enabled
- [ ] Clear browser cache if needed

---

## Device Size Tests

### iPhone SE (375x667)
- [ ] Open DevTools → Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
- [ ] Select "iPhone SE" preset (375x667)
- [ ] Navigate to Baseball Field Diagram
- [ ] Verify field is fully visible
- [ ] Verify home plate and catcher are visible
- [ ] Start scenario playback
- [ ] Verify field remains fully visible during playback
- [ ] Verify home plate and catcher remain visible
- [ ] Change playback speed (0.5x, 1x, 2x) while playing
- [ ] Verify speed changes work smoothly
- [ ] Verify Playback Dock height is constrained (~120-160px)
- [ ] Verify Playback Dock doesn't push field off-screen
- [ ] Verify all buttons are >=44px tall and tappable
- [ ] Verify timeline/progress bar is visible and usable

### iPhone Pro (390x844)
- [ ] Switch to "iPhone 12 Pro" preset (390x844)
- [ ] Navigate to Baseball Field Diagram
- [ ] Verify field is fully visible
- [ ] Verify home plate and catcher are visible
- [ ] Start scenario playback
- [ ] Verify field remains fully visible during playback
- [ ] Verify home plate and catcher remain visible
- [ ] Change playback speed (0.5x, 1x, 2x) while playing
- [ ] Verify speed changes work smoothly
- [ ] Verify Playback Dock height is constrained (~120-160px)
- [ ] Verify Playback Dock doesn't push field off-screen
- [ ] Verify all buttons are >=44px tall and tappable
- [ ] Verify timeline/progress bar is visible and usable

### iPad (768x1024)
- [ ] Switch to "iPad" preset (768x1024)
- [ ] Navigate to Baseball Field Diagram
- [ ] Verify wide layout is active (field on left, controls on right)
- [ ] Verify field is fully visible
- [ ] Verify home plate and catcher are visible
- [ ] Start scenario playback
- [ ] Verify Playback Dock appears at top of right panel
- [ ] Verify field remains fully visible during playback
- [ ] Verify home plate and catcher remain visible
- [ ] Verify scenario list appears below Playback Dock
- [ ] Change playback speed (0.5x, 1x, 2x) while playing
- [ ] Verify speed changes work smoothly
- [ ] Verify Playback Dock height is constrained (max 160px)
- [ ] Verify all buttons are >=44px tall and tappable
- [ ] Verify timeline/progress bar is visible and usable

### Desktop (1920x1080 or larger)
- [ ] Switch to "Desktop" or set custom size (1920x1080+)
- [ ] Navigate to Baseball Field Diagram
- [ ] Verify wide layout is active (field on left, controls on right)
- [ ] Verify field is fully visible
- [ ] Verify home plate and catcher are visible
- [ ] Start scenario playback
- [ ] Verify Playback Dock appears at top of right panel
- [ ] Verify field remains fully visible during playback
- [ ] Verify home plate and catcher remain visible
- [ ] Verify scenario list appears below Playback Dock
- [ ] Change playback speed (0.5x, 1x, 2x) while playing
- [ ] Verify speed changes work smoothly
- [ ] Verify Playback Dock height is constrained (max 160px)
- [ ] Verify all buttons are >=44px tall and clickable
- [ ] Verify timeline/progress bar is visible and usable

---

## Core Functionality Tests

### Field Visibility During Playback
- [ ] Start a scenario with player movements
- [ ] Verify entire field remains visible (no clipping)
- [ ] Verify field doesn't scroll or move during playback
- [ ] Verify field canvas maintains aspect ratio
- [ ] Verify no horizontal or vertical scrolling required

### Home Plate + Catcher Visibility
- [ ] Start scenario playback
- [ ] Verify home plate area is always visible
- [ ] Verify catcher (C) position is always visible
- [ ] Move players around during playback (if allowed)
- [ ] Verify home plate and catcher remain visible
- [ ] Test with different field sizes/resolutions

### Speed Control During Playback
- [ ] Start scenario playback at 1x speed
- [ ] Verify playback is smooth
- [ ] Change to 0.5x speed while playing
- [ ] Verify playback slows down smoothly
- [ ] Verify no stuttering or jumps
- [ ] Change to 2x speed while playing
- [ ] Verify playback speeds up smoothly
- [ ] Verify no stuttering or jumps
- [ ] Switch between speeds multiple times
- [ ] Verify all speed changes work correctly
- [ ] Verify active speed button is highlighted

### Playback Dock Layout
- [ ] Verify Playback Dock appears below field (compact) or in right panel (wide)
- [ ] Verify Playback Dock never overlays the field
- [ ] Verify Playback Dock pushes content down (normal layout flow)
- [ ] Verify Playback Dock height is constrained appropriately
- [ ] Verify Playback Dock is scrollable if content exceeds max height
- [ ] Verify Playback Dock disappears when scenario is closed

### Button Accessibility
- [ ] Verify all buttons (Reset, Play/Pause, Speed, Close) are >=44px tall
- [ ] Verify all buttons are easily tappable/clickable
- [ ] Verify button text is readable
- [ ] Verify button states (pressed, active) are visible
- [ ] Test button interactions on touch devices

### Timeline/Progress Bar
- [ ] Verify progress bar is visible
- [ ] Verify progress bar updates during playback
- [ ] Verify progress bar shows correct progress percentage
- [ ] Verify progress bar is at least 4px tall (usable)
- [ ] Verify progress bar color contrast is sufficient

---

## Edge Cases

### Long Scenario Names
- [ ] Create/select scenario with very long name
- [ ] Verify name doesn't break layout
- [ ] Verify name is readable (truncated or wrapped appropriately)

### Long Scenario Descriptions
- [ ] Create/select scenario with long description
- [ ] Verify description doesn't break layout
- [ ] Verify description is readable

### Multiple Speed Changes
- [ ] Rapidly change speeds (0.5x → 1x → 2x → 0.5x)
- [ ] Verify no errors or crashes
- [ ] Verify playback continues smoothly

### Playback While Field is Scrolling
- [ ] On compact layout, scroll to see controls
- [ ] Start playback
- [ ] Verify field remains visible and playback works

### Close During Playback
- [ ] Start scenario playback
- [ ] Click "Close" button while playing
- [ ] Verify playback stops
- [ ] Verify Playback Dock disappears
- [ ] Verify field returns to normal state

---

## Visual Regression Checks

### Compact Layout (<768px)
- [ ] Field takes up appropriate space
- [ ] Playback Dock appears directly below field
- [ ] Playback Dock is full-width
- [ ] Controls appear below Playback Dock
- [ ] No overlapping elements
- [ ] Proper spacing between elements

### Wide Layout (>=768px)
- [ ] Field on left side
- [ ] Playback Dock at top of right panel
- [ ] Scenario list below Playback Dock
- [ ] No overlapping elements
- [ ] Proper spacing between elements

---

## Performance Checks

- [ ] Playback is smooth (no lag or stuttering)
- [ ] Speed changes are responsive (no delay)
- [ ] UI updates smoothly during playback
- [ ] No memory leaks (check DevTools Performance tab)
- [ ] No console errors or warnings

---

## Notes Section

**Issues Found:**
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]
- [ ] Issue 3: [Description]

**Browser/Device:**
- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [Version number]
- OS: [Windows/Mac/Linux/iOS/Android]

**Test Date:** [Date]
**Tester:** [Name]

---

## Quick Test Summary

**Critical Path (Must Pass):**
1. ✅ Field remains fully visible during playback
2. ✅ Home plate + catcher always visible
3. ✅ Speed changes work smoothly during playback
4. ✅ Playback Dock doesn't push field off-screen
5. ✅ All buttons are >=44px tall and usable

**Device Coverage:**
- ✅ iPhone SE (375x667)
- ✅ iPhone Pro (390x844)
- ✅ iPad (768x1024)
- ✅ Desktop (1920x1080+)

