/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Web API 타입 보강
declare global {
  // Speech Recognition API
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    webkitAudioContext?: typeof AudioContext;
  }

  // SpeechRecognition 클래스 정의
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  // webkitSpeechRecognition 클래스 정의
  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    serviceURI: string;
    grammars: SpeechGrammarList;
    
    start(): void;
    stop(): void;
    abort(): void;
    
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message?: string;
  }

  // Performance API 보강
  interface PerformanceMeasure extends PerformanceEntry {
    readonly detail?: any;
  }

  // 누락된 Web API 타입들
  interface SpeechGrammarList {
    readonly length: number;
    item(index: number): SpeechGrammar;
    addFromURI(src: string, weight?: number): void;
    addFromString(string: string, weight?: number): void;
  }

  interface SpeechGrammar {
    src: string;
    weight: number;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  // Permission API 타입들
  type PermissionState = "granted" | "denied" | "prompt";
  type PermissionName = "microphone" | "camera" | "geolocation" | "notifications";

  // Fetch API 타입 보강
  type HeadersInit = Headers | string[][] | Record<string, string>;
  type BodyInit = Blob | BufferSource | FormData | URLSearchParams | string;
  type ReferrerPolicy = "" | "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
  type RequestMode = "cors" | "navigate" | "no-cors" | "same-origin";
  type RequestCredentials = "include" | "omit" | "same-origin";
  type RequestCache = "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
  type RequestRedirect = "error" | "follow" | "manual";

  interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    mode?: RequestMode;
    credentials?: RequestCredentials;
    cache?: RequestCache;
    redirect?: RequestRedirect;
    integrity?: string;
    keepalive?: boolean;
    signal?: AbortSignal | null;
    window?: any;
  }

  // Event Listener 타입들
  interface EventListener {
    (evt: Event): void;
  }

  interface EventListenerObject {
    handleEvent(object: Event): void;
  }

  type EventListenerOrEventListenerObject = EventListener | EventListenerObject;
}