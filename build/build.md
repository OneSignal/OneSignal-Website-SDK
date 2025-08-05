# OneSignal SDK Build Analysis

## Build Files Overview

The OneSignal Web SDK generates several build files for different purposes:

### Generated Files:
- **Dev-OneSignalSDK.page.js** (57 lines, 2.0KB) - Shim loader for feature detection
- **Dev-OneSignalSDK.page.es6.js** (14,410 lines, 518KB) - Main SDK functionality
- **Dev-OneSignalSDK.sw.js** (7,766 lines, 277KB) - Service Worker implementation
- **Dev-OneSignalSDK.page.styles.css** (2,397 lines, 96KB) - UI styles

## Code Structure Analysis

### Shim Loader (page.js)
```javascript
// Feature detection and loading logic
function isPushNotificationsSupported() {
  return supportsVapidPush() || supportsSafariLegacyPush();
}

class OneSignalShimLoader {
  static VERSION = "160500";
  static addScriptToPage(url) { /* script injection */ }
  static getPathAndPrefix() { /* URL building */ }
  static loadFullPageSDK() { /* ES6 loader */ }
  static start() { /* main entry */ }
  static printEnvironmentNotSupported() { /* error messaging */ }
}
```

### Main Classes (Combined Analysis)

#### Core Infrastructure Classes:
- **ServiceWorker** - Main SW handler
- **OneSignal2** - Primary SDK interface
- **CoreModuleDirector** - Module orchestration
- **UserDirector** - User management
- **RequestService** - HTTP requests
- **Database** - IndexedDB wrapper
- **SessionManager** - Session handling

#### Operation Classes:
- **OperationRepo** - Operation queue management
- **UpdateUserOperationExecutor** - User updates
- **SubscriptionOperationExecutor** - Subscription ops
- **IdentityOperationExecutor** - Identity ops
- **RefreshUserOperationExecutor** - User refresh
- **LoginUserOperationExecutor** - Login ops
- **CustomEventsOperationExecutor** - Custom events

#### UI/UX Classes:
- **SlidedownManager** - Prompt slidedowns
- **PromptsManager** - Permission prompts
- **Bell** - Notification bell widget
- **TagManager** - User tag management
- **DynamicResourceLoader** - Dynamic loading

#### Model Classes:
- **UserState** - User state model
- **SubscriptionModel** - Subscription data
- **IdentityModel** - Identity data
- **PropertiesModel** - User properties

## Potential Unused Code Analysis

### 1. Duplicate Functionality
- **Browser Detection**: Both `bowser` library and custom detection functions exist
- **Logging**: Multiple logging classes (`Log`, `Log2`) with overlapping functionality
- **API Wrappers**: Multiple API classes with similar interfaces

### 2. Legacy Support Code
```javascript
// Potentially unused legacy Safari support
function supportsSafariLegacyPush() {
  return typeof window.safari !== "undefined" && 
         typeof window.safari.pushNotification !== "undefined";
}

// Legacy subscription types that may not be used
const SubscriptionType = {
  SafariLegacyPush: "SafariLegacyPush", // Potentially unused
  FirefoxPush: "FirefoxPush"           // May be redundant with ChromePush
};
```

### 3. Commented Out Code
```javascript
// Multiple commented subscription types in both files:
// macOSPush: 'macOSPush',
// AndroidPush: 'AndroidPush', 
// FireOSPush: 'FireOSPush',
// HuaweiPush: 'HuaweiPush',
// iOSPush: 'iOSPush',
// WindowsPush: 'WindowsPush',
```

### 4. Development-Only Code
- Error classes that may only be used during development
- Extensive validation logic that could be simplified in production
- Debug namespace functionality (`DebugNamespace` class)

### 5. Potentially Over-Engineered Patterns
- **Complex inheritance**: Base classes with single implementations
- **Excessive abstraction**: Multiple wrapper classes for simple operations
- **Redundant validators**: Similar validation logic in multiple places

## Recommendations for Code Reduction

### High Impact:
1. **Remove legacy browser support** - Safari legacy push, old Firefox handling
2. **Consolidate logging** - Use single logging implementation
3. **Simplify API layers** - Combine similar API wrapper classes
4. **Remove development debugging** - Strip debug-only code for production

### Medium Impact:
1. **Optimize browser detection** - Use single detection library
2. **Simplify validation** - Consolidate duplicate validation logic
3. **Reduce abstraction layers** - Remove unnecessary base classes

### Low Impact:
1. **Clean up comments** - Remove commented-out code blocks
2. **Optimize imports** - Tree-shake unused utility functions
3. **Simplify error handling** - Reduce number of specific error classes

## File Size Breakdown
- **Total Build Size**: ~24,630 lines across all files
- **Service Worker**: 7,766 lines (31.5%)
- **Main Page Logic**: 14,410 lines (58.5%)
- **Styles**: 2,397 lines (9.7%)
- **Shim Loader**: 57 lines (0.2%)

The main opportunities for size reduction are in the service worker and main page logic files, which together account for 90% of the codebase.

## Specific Unused Code Examples

### 1. TODO Comments Indicating Incomplete Features
Found 4 TODO comments suggesting unfinished or legacy code:

```javascript
// TODO: ModelName is a legacy property, could be removed sometime after web refactor launch
// TODO: no batching of custom events until finalized  
// TODO: had a hard to debug bug here due to "any" type bypassing typescript validation
```

### 2. Bowser Library Integration
The build includes the entire Bowser browser detection library (~1000+ lines) but may only use a small subset:

```javascript
// Full bowser library included for minimal browser detection
var bowser$2 = { exports: {} };
// Large browser detection object with many unused browser checks
```

### 3. Legacy Safari Push Support
```javascript
// Safari legacy push may be unused in modern implementations
function supportsSafariLegacyPush() {
  return typeof window.safari !== "undefined" && 
         typeof window.safari.pushNotification !== "undefined";
}
```

### 4. Unused Subscription Types
```javascript
const SubscriptionType = {
  ChromePush: "ChromePush",
  Email: "Email",           // May not be used in web context
  SMS: "SMS",              // May not be used in web context
  SafariPush: "SafariPush",
  SafariLegacyPush: "SafariLegacyPush", // Legacy support
  FirefoxPush: "FirefoxPush"            // May be redundant
};
```

### 5. Multiple API Implementation Classes
```javascript
// Multiple similar API classes that could be consolidated:
class OneSignalApi { /* main implementation */ }
class OneSignalApiSW { /* service worker variant */ }
class OneSignalApiShared { /* shared functionality */ }
class OneSignalApiBase { /* base class */ }
```

### 6. Development Debugging Classes
```javascript
// Debug-only functionality that should be stripped in production
class DebugNamespace {
  // Development debugging methods
}

// Extensive logging that could be minimized
class Log2 {
  // Duplicate of Log class functionality
}
```

## Bundle Size Optimization Opportunities

### Immediate Wins (Estimated Savings):
1. **Remove Bowser library**: ~15KB (use custom minimal detection)
2. **Strip TODO/legacy code**: ~5KB 
3. **Consolidate API classes**: ~10KB
4. **Remove debug code**: ~8KB
5. **Clean commented code**: ~2KB

### Total Potential Savings: ~40KB (14% reduction)

### Tree Shaking Opportunities:
- JSONP library (may be partially unused)
- UUID generation (potentially oversized for needs)
- Extensive validation utilities
- Multiple error class hierarchies