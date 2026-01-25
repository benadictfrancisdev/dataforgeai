

# Implementation Plan: Enhanced UX Features

This plan covers adding Excel support, interactive onboarding, loading skeletons, virtual scrolling for 100K+ rows, and an interactive tutorial system.

---

## Overview

| Feature | Priority | Complexity | New Dependencies |
|---------|----------|------------|------------------|
| Excel (XLSX) Support | High | Low | `xlsx` (SheetJS) |
| Loading Skeletons | High | Low | None |
| Virtual Scrolling (100K+ rows) | High | Medium | `@tanstack/react-virtual` |
| Interactive Onboarding | Medium | Medium | None |
| Interactive Tutorial | Medium | Medium | None |

---

## 1. Excel (XLSX) File Support

**Current State**: Only CSV and JSON are supported in `DataUpload.tsx` (lines 55-60).

**Changes**:

### A. Install SheetJS Library
```bash
npm install xlsx
```

### B. Update DataUpload.tsx
- Add `parseExcel` function using SheetJS
- Update file input to accept `.xlsx, .xls` extensions
- Update UI text to reflect Excel support

```text
File: src/components/data-agent/DataUpload.tsx

Changes:
1. Import xlsx library
2. Add parseExcel function:
   - Read file as ArrayBuffer
   - Parse workbook with XLSX.read()
   - Extract first sheet data with XLSX.utils.sheet_to_json()
3. Update processFile() to handle .xlsx/.xls extensions
4. Update accept attribute: ".csv,.json,.xlsx,.xls"
5. Update UI text: "Supports CSV, Excel, and JSON formats"
```

---

## 2. Loading Skeletons

**Current State**: Basic spinner used during loading. Skeleton component exists but unused.

**Changes**:

### A. Create Reusable Skeleton Components
```text
New File: src/components/data-agent/skeletons/index.ts
New File: src/components/data-agent/skeletons/TableSkeleton.tsx
New File: src/components/data-agent/skeletons/ChartSkeleton.tsx
New File: src/components/data-agent/skeletons/DashboardSkeleton.tsx
```

### B. TableSkeleton Component
- Skeleton header row with animated cells
- 8-10 skeleton body rows
- Shimmer animation matching table structure

### C. ChartSkeleton Component
- Skeleton for bar/line/pie charts
- Animated placeholder for chart area
- Skeleton legend items

### D. DashboardSkeleton Component
- Grid of KPI card skeletons
- Chart placeholder skeletons
- Sidebar skeleton

### E. Integration Points
```text
Files to Update:
- src/components/data-agent/DataPreview.tsx (add TableSkeleton)
- src/components/data-agent/VisualizationDashboard.tsx (add ChartSkeleton)
- src/components/data-agent/PowerBIDashboard.tsx (add DashboardSkeleton)
- src/pages/DataAgent.tsx (loading state skeleton)
```

---

## 3. Virtual Scrolling for Large Datasets

**Current State**: Table displays only 10 rows (hardcoded slice). Cannot handle large datasets.

**Changes**:

### A. Install TanStack Virtual
```bash
npm install @tanstack/react-virtual
```

### B. Create VirtualTable Component
```text
New File: src/components/data-agent/VirtualTable.tsx

Features:
- Uses useVirtualizer hook from @tanstack/react-virtual
- Fixed row height (40px) for performance
- Overscan of 10 rows for smooth scrolling
- Sticky header support
- Column width auto-sizing
- Row count display in footer
```

### C. Implementation Details
```typescript
// Key implementation pattern
const rowVirtualizer = useVirtualizer({
  count: data.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 40,
  overscan: 10,
});
```

### D. Update DataPreview.tsx
- Replace static table with VirtualTable component
- Add "Show All" toggle (virtual vs preview mode)
- Display accurate row counts
- Add performance indicator for large datasets

### E. Performance Optimizations
- Memoize row components with React.memo
- Use CSS containment for better rendering
- Lazy column rendering for wide tables
- Debounced search/filter within virtual list

---

## 4. Interactive Onboarding System

**Current State**: Demo modal exists but no first-login detection or guided flow.

**Changes**:

### A. Create Onboarding Hook
```text
New File: src/hooks/useOnboarding.tsx

Features:
- Track if user has completed onboarding (localStorage + database)
- Step-by-step state machine
- Progress tracking
- Skip/complete functionality
```

### B. Create OnboardingProvider Component
```text
New File: src/components/onboarding/OnboardingProvider.tsx

Manages:
- Global onboarding state
- Step transitions
- Completion tracking
```

### C. Create OnboardingOverlay Component
```text
New File: src/components/onboarding/OnboardingOverlay.tsx

Features:
- Spotlight effect on target elements
- Tooltip with step instructions
- Progress indicators (dots)
- Next/Skip/Back buttons
- Keyboard navigation (arrows, Esc)
```

### D. Onboarding Steps Definition
```typescript
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to DataForge AI',
    description: 'Let\'s take a quick tour of the platform',
    target: null, // Full screen
    position: 'center'
  },
  {
    id: 'upload',
    title: 'Upload Your Data',
    description: 'Start by uploading a CSV, Excel, or JSON file',
    target: '[data-onboarding="upload-zone"]',
    position: 'bottom'
  },
  {
    id: 'sample-data',
    title: 'Try Sample Data',
    description: 'No data? Click here to load a sample dataset',
    target: '[data-onboarding="sample-button"]',
    position: 'right'
  },
  {
    id: 'sidebar',
    title: 'Navigate Features',
    description: 'Use the sidebar to access different analysis tools',
    target: '[data-onboarding="sidebar"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Explore the features and analyze your data',
    target: null,
    position: 'center'
  }
];
```

### E. Sample Datasets Feature
```text
New File: src/data/sampleDatasets.ts

Sample Datasets:
1. Sales Data (500 rows) - Revenue, products, regions
2. Customer Analytics (300 rows) - Demographics, purchases
3. Stock Prices (1000 rows) - Time series data
4. Survey Results (200 rows) - Categorical data
```

### F. Update DataUpload.tsx
- Add "Load Sample Data" button
- Add `data-onboarding` attributes for targeting
- Trigger onboarding on first visit

---

## 5. Interactive Tutorial System

**Current State**: Static demo modal with step descriptions.

**Changes**:

### A. Create Interactive Tutorial Component
```text
New File: src/components/tutorial/InteractiveTutorial.tsx

Features:
- Step-by-step guided walkthrough
- Interactive elements (user must perform action)
- Progress tracking
- Video/GIF demonstrations embedded
- Accessible via Help menu anytime
```

### B. Tutorial Steps (Feature-Specific)
```typescript
const TUTORIALS = {
  'data-upload': {
    steps: [
      { action: 'click', target: 'upload-button', instruction: 'Click to upload' },
      { action: 'observe', content: 'Watch your data appear' },
    ]
  },
  'nlp-query': {
    steps: [
      { action: 'type', target: 'query-input', instruction: 'Type: "Show sales by region"' },
      { action: 'click', target: 'submit-button' },
      { action: 'observe', content: 'See AI-generated insights' },
    ]
  },
  // ... more tutorials
};
```

### C. Tutorial Trigger Points
- First time visiting each feature tab
- "?" help button in header
- Contextual help tooltips with "Learn more" links

### D. Update Navbar/Header
- Add "Help" dropdown menu
- Tutorial access for each feature
- "Restart Onboarding" option

---

## File Changes Summary

### New Files (11 files)
```
src/components/data-agent/skeletons/index.ts
src/components/data-agent/skeletons/TableSkeleton.tsx
src/components/data-agent/skeletons/ChartSkeleton.tsx
src/components/data-agent/skeletons/DashboardSkeleton.tsx
src/components/data-agent/VirtualTable.tsx
src/components/onboarding/OnboardingProvider.tsx
src/components/onboarding/OnboardingOverlay.tsx
src/components/onboarding/index.ts
src/components/tutorial/InteractiveTutorial.tsx
src/hooks/useOnboarding.tsx
src/data/sampleDatasets.ts
```

### Modified Files (6 files)
```
package.json (add xlsx, @tanstack/react-virtual)
src/components/data-agent/DataUpload.tsx (Excel + sample data)
src/components/data-agent/DataPreview.tsx (VirtualTable + skeletons)
src/pages/DataAgent.tsx (onboarding integration)
src/App.tsx (OnboardingProvider wrapper)
src/components/Navbar.tsx (Help menu)
```

---

## Technical Considerations

### Performance for 100K+ Rows
- Virtual scrolling only renders ~30 rows at a time
- Memory-efficient: No DOM bloat
- Smooth 60fps scrolling with overscan
- Search/filter operates on full dataset, renders virtually

### Excel File Size Limits
- Client-side parsing for files up to 10MB
- For larger files (10MB+): Show warning, suggest CSV
- Progressive parsing feedback with progress bar

### Onboarding State Persistence
- Stored in `user_session_state` table (already exists)
- Key: `onboarding-completed`
- Survives across devices when logged in

### Mobile Responsiveness
- Onboarding overlay adapts to screen size
- Virtual table scrolls horizontally on mobile
- Skeleton widths are responsive

---

## Implementation Order

1. **Excel Support** (30 min) - Quick win, high user value
2. **Loading Skeletons** (45 min) - Improves perceived performance
3. **Virtual Scrolling** (1 hour) - Unlocks large dataset handling
4. **Onboarding System** (1.5 hours) - First-user experience
5. **Interactive Tutorial** (1 hour) - Feature discovery

Total estimated time: ~5 hours

