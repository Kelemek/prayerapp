# Linter Cleanup Guide

## Current State
- **121 warnings** in the codebase (down from 123 after running `--fix`)
- All configured as warnings, so **CI/CD passes** ✅
- These are **pre-existing technical debt**, not new issues

## Should These Be Fixed?

### 🟢 Priority 1: Auto-Fixable (5 minutes)
**Command:** `npm run lint -- --fix`

**Already fixed (committed separately):**
- ✅ `prefer-const`: Changed `let` to `const` for variables that aren't reassigned (2 fixed)

**These will auto-fix if you run again:**
- Would need testing to see what else can be auto-fixed safely

---

### 🟡 Priority 2: Quick Manual Fixes (30-60 minutes)

#### A. Remove Unused Imports (~20 imports)
**Impact:** Reduces bundle size, cleaner code  
**Risk:** Very low  
**Examples:**
```typescript
// src/App.tsx
import { Plus, Heart } from 'lucide-react' // ❌ Never used

// src/components/BackupStatus.tsx
import { Clock } from 'lucide-react' // ❌ Never used

// src/components/PrayerCard.tsx
import { Calendar, User, CheckCircle } from 'lucide-react' // ❌ Never used
```

**Recommendation:** ✅ **Fix these** - Safe, improves performance slightly

---

#### B. Remove Unused Variables (~25 variables)
**Impact:** Prevents confusion, cleaner code  
**Risk:** Low (but verify they're truly unused)  
**Examples:**
```typescript
// src/App.tsx
const { data } = await supabase... // ❌ 'data' never used

// src/components/BackupStatus.tsx
const getTimeSince = (timestamp: string) => ... // ❌ Function never called
const skipped = []; // ❌ Variable never used

// src/setupTests.ts
import { expect } from 'vitest' // ❌ Never used (provided globally)
```

**Recommendation:** ✅ **Fix these** - But double-check they're not used dynamically

---

### 🟠 Priority 3: Type Safety Improvements (2-4 hours)

#### Replace `any` Types (~70 occurrences)
**Impact:** Catches bugs at compile time, better IDE support  
**Risk:** Medium (requires understanding the actual types)  
**Examples:**
```typescript
// Instead of:
const handleError = (error: any) => { ... }

// Use:
const handleError = (error: Error | { message: string }) => { ... }

// Or for Supabase errors:
const handleError = (error: PostgrestError) => { ... }
```

**Recommendation:** 🤔 **Fix incrementally** - Do this when working in each file, not all at once

**Supabase-specific types to use:**
- `PostgrestError` - For database errors
- `Database['public']['Tables']['table_name']['Row']` - For table rows
- Generate types with: `npx supabase gen types typescript --local > src/types/database.ts`

---

### 🔴 Priority 4: React Hooks Dependencies (~10 warnings)

#### Fix Missing Dependencies in useEffect/useMemo
**Impact:** Prevents stale closure bugs  
**Risk:** **HIGH** - Can change behavior if not careful  
**Examples:**
```typescript
// ⚠️ Warning: React Hook useEffect has missing dependencies
useEffect(() => {
  fetchPrayers(); // Uses fetchPrayers but not in deps
}, []); // Missing: 'fetchPrayers'
```

**Two approaches:**

1. **Add dependencies (preferred):**
```typescript
useEffect(() => {
  fetchPrayers();
}, [fetchPrayers]); // ✅ Add dependency
```

2. **Wrap function in useCallback:**
```typescript
const fetchPrayers = useCallback(async () => {
  // ... implementation
}, []); // Now stable reference

useEffect(() => {
  fetchPrayers();
}, [fetchPrayers]); // Won't re-run unnecessarily
```

**Recommendation:** ⚠️ **Fix carefully** - These warnings exist for good reason, but fixing them incorrectly can cause infinite loops or broken functionality. **Test thoroughly after each fix.**

---

### 🟣 Priority 5: Other Issues

#### A. Replace `@ts-ignore` with `@ts-expect-error` (4 occurrences)
**Impact:** Better error detection  
**Why:** `@ts-expect-error` fails if the error goes away (so you know to remove it)  
**Recommendation:** ✅ **Fix these** - Quick find/replace, safer than `@ts-ignore`

#### B. Fast Refresh Issues (3 warnings)
**Impact:** Better dev experience  
**Example:**
```typescript
// src/components/Toast.tsx
// ❌ Exports both components and non-components
export const ToastContext = createContext(...)
export const Toast = () => { ... }

// ✅ Split into separate files
// ToastContext.ts - exports context
// Toast.tsx - exports component
```
**Recommendation:** 🤔 **Low priority** - Only matters in development

#### C. Constant Binary Expression (3 warnings in PrayerCard.tsx line 661)
**Impact:** Likely a logic bug  
**Risk:** Medium - could be broken code  
**Recommendation:** 🔍 **Investigate** - This might be a real bug!

---

## Recommended Action Plan

### Option 1: Commit Testing Infrastructure Now, Fix Later ✅ (Recommended)
```bash
git add -A
git commit -m "Add testing infrastructure with linter configured for warnings"
git push origin main
```

**Then create cleanup branch:**
```bash
git checkout -b chore/linter-cleanup

# 1. Auto-fix what's safe
npm run lint -- --fix
git add -A
git commit -m "Auto-fix linter warnings (prefer-const, etc.)"

# 2. Remove unused imports/variables
# Manual cleanup in editor
git add -A
git commit -m "Remove unused imports and variables"

# 3. Push for review
git push origin chore/linter-cleanup
# Create PR, test in Netlify preview
```

### Option 2: Fix Critical Issues Now
If you want to fix the most important ones before committing:

```bash
# 1. Run auto-fix (already done)
npm run lint -- --fix

# 2. Quick manual fixes (10 minutes)
# - Remove obvious unused imports from lucide-react
# - Remove unused 'data' variables from destructuring
# - Fix the 'expect' import in setupTests.ts

# 3. Commit everything together
git add -A
git commit -m "Add testing infrastructure and fix critical linter warnings"
```

---

## Testing After Fixes

Always test after fixing warnings:

```bash
# Run tests
npm run test:run

# Run the app
npm run dev

# Test main features:
# - Prayer CRUD operations
# - Admin portal
# - Backup/restore
# - Email settings
```

---

## What NOT to Fix (Yet)

❌ **Don't fix `any` types in bulk** - Do these incrementally when touching files  
❌ **Don't fix all React Hooks deps at once** - High risk of breaking functionality  
❌ **Don't refactor Toast.tsx/hooks** - Low impact on functionality  

---

## Summary

**Recommendation:** Ship the testing infrastructure now with warnings. Then incrementally clean up:

1. ✅ **Now:** Auto-fix safe issues (`--fix`)
2. ✅ **Soon (1-2 days):** Remove unused imports/variables  
3. 🤔 **Later (1-2 weeks):** Replace `any` types when touching files
4. ⚠️ **Carefully:** Fix React Hooks dependencies with thorough testing

The current warning-based approach is **professional and pragmatic** - it lets you ship without blocking, while maintaining visibility for future cleanup.
