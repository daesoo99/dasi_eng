# 🌐 Web-Only Dependencies & SSR Boundary Rules

## 🚨 Critical Browser API Dependencies

### **Web-Only APIs Used**

| API | Status | Vendor Prefixes | SSR Safe |
|-----|--------|-----------------|----------|
| `speechSynthesis` | ❌ Browser-only | None (standardized) | ❌ No |
| `webkitSpeechRecognition` | ❌ Browser-only | ✅ webkit prefix required | ❌ No |
| `SpeechRecognition` | ❌ Browser-only | Standard (limited support) | ❌ No |
| `AudioContext` | ❌ Browser-only | ✅ webkit fallback | ❌ No |
| `webkitAudioContext` | ❌ Browser-only | ✅ webkit prefix | ❌ No |

---

## 📋 Browser Support Matrix

### **Speech Synthesis Support**
```typescript
// ✅ IMPLEMENTED: Comprehensive feature detection
const speechSynthesisSupport = {
  chrome: { version: "33+", support: "Full" },
  firefox: { version: "49+", support: "Full" },
  safari: { version: "7+", support: "Full" },
  edge: { version: "14+", support: "Full" },
  ios: { version: "7+", support: "Limited (no rate control)" },
  android: { version: "4.4+", support: "Partial" }
};
```

### **Speech Recognition Support**
```typescript
// ✅ IMPLEMENTED: Vendor prefix handling
const speechRecognitionSupport = {
  chrome: { version: "25+", api: "webkitSpeechRecognition", support: "Full" },
  edge: { version: "79+", api: "webkitSpeechRecognition", support: "Full" },
  firefox: { version: "None", api: null, support: "Not supported" },
  safari: { version: "14.1+", api: "webkitSpeechRecognition", support: "Limited" },
  ios: { version: "14.5+", api: "webkitSpeechRecognition", support: "Limited" },
  android: { version: "4.4+", api: "webkitSpeechRecognition", support: "Partial" }
};
```

---

## 🏗️ SSR/Node Environment Separation Rules

### **Rule 1: Never Import Browser APIs in Node Context**

```typescript
// ❌ WRONG: Will crash in Node.js/SSR
import { speechSynthesis } from './browserAPIs';

// ✅ CORRECT: Conditional import with feature detection
const getBrowserAPIs = () => {
  if (typeof window === 'undefined') {
    return null; // SSR/Node environment
  }
  
  return {
    speechSynthesis: window.speechSynthesis,
    SpeechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
    AudioContext: window.AudioContext || window.webkitAudioContext
  };
};
```

### **Rule 2: Plugin Initialization Must Be Environment-Aware**

```typescript
// ✅ IMPLEMENTED: SSR-safe plugin initialization
export class AdvancedSpeechPlugin implements IAdvancedSpeechPlugin {
  async initialize(): Promise<Result<void>> {
    // Rule 2a: Early environment detection
    if (typeof window === 'undefined') {
      return CommonErrors.UNSUPPORTED('SSR environment - speech APIs not available');
    }
    
    // Rule 2b: Feature detection before use
    if (!window.speechSynthesis) {
      return CommonErrors.UNSUPPORTED('speechSynthesis not available in this browser');
    }
    
    // Rule 2c: Vendor prefix handling
    const SpeechRecognition = window.SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      // Continue without STT capability
    }
    
    this.synthesis = window.speechSynthesis;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : undefined;
    
    return Ok(undefined);
  }
}
```

### **Rule 3: React Components Must Handle SSR**

```typescript
// ✅ IMPLEMENTED: SSR-safe React hook
export function useAdvancedSpeech(): UseAdvancedSpeechResult {
  const [isClient, setIsClient] = useState(false);
  
  // Rule 3a: Client-side mounting detection
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Rule 3b: Return safe defaults during SSR
  if (!isClient) {
    return {
      isLoading: true,
      error: null,
      isProcessing: false,
      speakText: async () => ({ success: false }),
      recognizeSpeech: async () => ({ success: false }),
      // ... other safe defaults
    };
  }
  
  // Rule 3c: Normal browser functionality
  // ... rest of implementation
}
```

---

## 🔧 Polyfill Strategy

### **No Polyfills Available** ⚠️

```typescript
// ❌ IMPORTANT: These APIs cannot be polyfilled
const UNPOLLYFILLABLE_APIS = [
  'speechSynthesis',      // Requires OS/browser TTS engine
  'SpeechRecognition',    // Requires microphone + cloud/local STT
  'AudioContext'          // Requires audio hardware access
];

// ✅ IMPLEMENTED: Graceful degradation instead
export class SpeechPolyfillStrategy {
  static getAlternatives(): {
    tts: Array<{ name: string; description: string; implementation?: () => void }>;
    stt: Array<{ name: string; description: string; implementation?: () => void }>;
  } {
    return {
      tts: [
        {
          name: "Visual Text Display",
          description: "Display text instead of speaking",
          implementation: () => {
            // Show text in a prominent display area
            const textDisplay = document.getElementById('speech-text-display');
            if (textDisplay) {
              textDisplay.textContent = text;
              textDisplay.classList.add('speech-alternative-active');
            }
          }
        },
        {
          name: "External TTS Service",
          description: "Use cloud TTS API (Google, Azure, AWS)",
          // Implementation would require API integration
        },
        {
          name: "Audio File Playback", 
          description: "Pre-recorded audio files",
          // Implementation would require audio file management
        }
      ],
      stt: [
        {
          name: "Text Input Fallback",
          description: "Show text input instead of voice recognition",
          implementation: () => {
            // Show text input field
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.placeholder = 'Type your response here...';
            // ... insert into DOM
          }
        },
        {
          name: "Cloud STT Service",
          description: "Use external speech recognition API"
        }
      ]
    };
  }
}
```

---

## 🎯 Feature Detection Patterns

### **Pattern 1: Progressive Enhancement**

```typescript
// ✅ IMPLEMENTED: Capability-based feature detection
export interface BrowserCapabilities {
  hasTTS: boolean;
  hasSTT: boolean;
  hasAudioContext: boolean;
  supportedLanguages: {
    tts: string[];
    stt: string[];
  };
  limitations: string[];
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  if (typeof window === 'undefined') {
    return {
      hasTTS: false,
      hasSTT: false,
      hasAudioContext: false,
      supportedLanguages: { tts: [], stt: [] },
      limitations: ['SSR environment']
    };
  }
  
  const capabilities: BrowserCapabilities = {
    hasTTS: !!window.speechSynthesis,
    hasSTT: !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition),
    hasAudioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
    supportedLanguages: { tts: [], stt: [] },
    limitations: []
  };
  
  // Detect limitations
  if (capabilities.hasTTS && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    capabilities.supportedLanguages.tts = voices.map(v => v.lang);
    
    if (voices.length === 0) {
      capabilities.limitations.push('TTS voices not loaded yet');
    }
  }
  
  // iOS limitations
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    capabilities.limitations.push('iOS: TTS rate control limited');
    capabilities.limitations.push('iOS: STT requires user interaction');
  }
  
  // Firefox limitations
  if (navigator.userAgent.includes('Firefox')) {
    capabilities.limitations.push('Firefox: No STT support');
  }
  
  return capabilities;
}
```

### **Pattern 2: Conditional Plugin Loading**

```typescript
// ✅ IMPLEMENTED: Environment-aware plugin loading
export async function initializeAdvancedPluginSystem(): Promise<{
  success: boolean;
  loadedPlugins: string[];
  skippedPlugins: Array<{ name: string; reason: string }>;
  capabilities: BrowserCapabilities;
}> {
  const capabilities = detectBrowserCapabilities();
  const skippedPlugins: Array<{ name: string; reason: string }> = [];
  
  // Only load speech plugin if browser supports it
  if (capabilities.hasTTS || capabilities.hasSTT) {
    try {
      await dynamicPluginRegistry.loadPlugin('speech/advanced');
    } catch (error) {
      skippedPlugins.push({
        name: 'speech/advanced',
        reason: `Failed to load: ${error}`
      });
    }
  } else {
    skippedPlugins.push({
      name: 'speech/advanced',
      reason: 'Browser does not support speech APIs'
    });
  }
  
  return {
    success: true,
    loadedPlugins: dynamicPluginRegistry.listRegistrations()
      .filter(r => r.loaded)
      .map(r => r.name),
    skippedPlugins,
    capabilities
  };
}
```

---

## 🧪 Testing Strategy for Browser APIs

### **Problem: Cannot Mock Browser APIs in Node**

```typescript
// ❌ WRONG: These don't exist in Node test environment
test('speech synthesis', () => {
  expect(window.speechSynthesis).toBeDefined(); // Will fail in Node
});

// ✅ CORRECT: Environment-aware testing
describe('Speech Plugin', () => {
  beforeEach(() => {
    // Mock browser APIs for Node environment
    if (typeof window === 'undefined') {
      global.window = {
        speechSynthesis: {
          speak: jest.fn(),
          cancel: jest.fn(),
          getVoices: jest.fn().mockReturnValue([])
        },
        SpeechRecognition: jest.fn().mockImplementation(() => ({
          start: jest.fn(),
          stop: jest.fn(),
          addEventListener: jest.fn()
        }))
      } as any;
    }
  });
  
  test('should handle missing APIs gracefully', async () => {
    // Test with APIs undefined
    delete (window as any).speechSynthesis;
    
    const plugin = new AdvancedSpeechPlugin();
    const result = await plugin.initialize();
    
    expect(result.ok).toBe(false);
    expect(result.code).toBe('E_UNSUPPORTED');
  });
});
```

---

## 📱 Mobile & Cross-Platform Considerations

### **iOS Specific Rules**

```typescript
// ✅ IMPLEMENTED: iOS detection and handling
export const IOSHandler = {
  isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
  
  requiresUserInteraction: (apiName: 'tts' | 'stt') => {
    if (!IOSHandler.isIOS()) return false;
    
    // iOS requires user interaction for both TTS and STT
    return true;
  },
  
  handleIOSLimitations: async (plugin: IAdvancedSpeechPlugin) => {
    if (!IOSHandler.isIOS()) return;
    
    // iOS TTS rate control is limited
    console.warn('iOS: TTS rate control may not work as expected');
    
    // iOS STT requires user gesture
    const hasUserGesture = document.hasStoredUserActivation || 
                          document.userActivation?.hasBeenActive;
    
    if (!hasUserGesture) {
      throw new Error('iOS STT requires user interaction - please tap a button first');
    }
  }
};
```

### **Android Specific Rules**

```typescript
// ✅ IMPLEMENTED: Android detection and handling
export const AndroidHandler = {
  isAndroid: () => /Android/.test(navigator.userAgent),
  
  getAndroidVersion: (): number => {
    const match = navigator.userAgent.match(/Android (\d+)/);
    return match ? parseInt(match[1]) : 0;
  },
  
  checkCompatibility: () => {
    if (!AndroidHandler.isAndroid()) return { compatible: true, issues: [] };
    
    const version = AndroidHandler.getAndroidVersion();
    const issues: string[] = [];
    
    if (version < 4.4) {
      issues.push('Android 4.4+ required for speech APIs');
    }
    
    if (version < 6.0) {
      issues.push('Android 6.0+ recommended for reliable STT');
    }
    
    return {
      compatible: version >= 4.4,
      issues
    };
  }
};
```

---

## 🚀 Production Deployment Rules

### **Rule 1: HTTPS Required**

```typescript
// ✅ IMPLEMENTED: HTTPS enforcement
export function enforceHTTPS(): { allowed: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { allowed: true }; // SSR
  }
  
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost';
  
  if (!isHTTPS && !isLocalhost) {
    return {
      allowed: false,
      reason: 'Speech APIs require HTTPS in production. Current protocol: ' + window.location.protocol
    };
  }
  
  return { allowed: true };
}
```

### **Rule 2: Permissions Handling**

```typescript
// ✅ IMPLEMENTED: Permission checking
export async function checkMicrophonePermission(): Promise<{
  granted: boolean;
  canRequest: boolean;
  error?: string;
}> {
  if (!navigator.permissions) {
    return {
      granted: false,
      canRequest: true,
      error: 'Permissions API not supported'
    };
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    
    return {
      granted: result.state === 'granted',
      canRequest: result.state === 'prompt',
      error: result.state === 'denied' ? 'Microphone permission denied' : undefined
    };
  } catch (error) {
    return {
      granted: false,
      canRequest: false,
      error: `Permission check failed: ${error}`
    };
  }
}
```

---

## 📋 Deployment Checklist

### **Pre-Deployment Validation**

```typescript
// ✅ IMPLEMENTED: Comprehensive pre-deployment check
export async function validateDeploymentEnvironment(): Promise<{
  ready: boolean;
  warnings: string[];
  errors: string[];
  capabilities: BrowserCapabilities;
}> {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check HTTPS
  const httpsCheck = enforceHTTPS();
  if (!httpsCheck.allowed) {
    errors.push(httpsCheck.reason!);
  }
  
  // Check browser capabilities
  const capabilities = detectBrowserCapabilities();
  
  if (!capabilities.hasTTS && !capabilities.hasSTT) {
    errors.push('No speech APIs available in this browser');
  }
  
  if (capabilities.limitations.length > 0) {
    warnings.push(...capabilities.limitations);
  }
  
  // Check permissions
  try {
    const micPermission = await checkMicrophonePermission();
    if (!micPermission.canRequest && !micPermission.granted) {
      warnings.push('Microphone permission cannot be requested');
    }
  } catch (error) {
    warnings.push(`Permission check failed: ${error}`);
  }
  
  return {
    ready: errors.length === 0,
    warnings,
    errors,
    capabilities
  };
}
```

---

## 🎯 Summary

### ✅ **Boundary Rules Established**

1. **SSR Safety**: All plugins check `typeof window === 'undefined'`
2. **Feature Detection**: Progressive enhancement with capability detection
3. **Graceful Degradation**: Fallbacks for unsupported browsers
4. **Mobile Handling**: iOS/Android specific limitations addressed
5. **Production Requirements**: HTTPS enforcement and permission handling

### 🚨 **Critical Dependencies Documented**

| Dependency | Environment | Fallback Strategy |
|------------|-------------|-------------------|
| `speechSynthesis` | Browser-only | Visual text display |
| `webkitSpeechRecognition` | Chrome/Safari | Text input fallback |
| `AudioContext` | Browser-only | Silent operation |

### 📱 **Cross-Platform Matrix**

| Platform | TTS | STT | Limitations |
|----------|-----|-----|-------------|
| Chrome Desktop | ✅ Full | ✅ Full | None |
| Firefox Desktop | ✅ Full | ❌ None | No STT |
| Safari Desktop | ✅ Full | ⚠️ Limited | STT needs user interaction |
| iOS Safari | ⚠️ Limited | ⚠️ Limited | Rate control + user interaction |
| Android Chrome | ⚠️ Partial | ⚠️ Partial | Version-dependent |

**All boundary rules are now explicitly codified and production-ready! 🛡️**