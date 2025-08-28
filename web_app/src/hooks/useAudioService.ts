import { useCallback, useRef, useEffect } from 'react';

interface AudioConfig {
  volume?: number;
  autoCleanup?: boolean;
  maxInstances?: number;
}

interface AudioInstance {
  id: string;
  element: HTMLAudioElement;
  isPlaying: boolean;
  createdAt: number;
}

class AudioService {
  private instances = new Map<string, AudioInstance>();
  private maxInstances = 10;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: AudioConfig) {
    this.maxInstances = config?.maxInstances || 10;
    
    if (config?.autoCleanup !== false) {
      this.startCleanupInterval();
    }
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000); // Clean up every 30 seconds
  }

  private cleanup() {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    for (const [id, instance] of this.instances.entries()) {
      if (!instance.isPlaying && (now - instance.createdAt) > fiveMinutes) {
        this.destroy(id);
      }
    }

    // If we still have too many instances, remove the oldest inactive ones
    const inactiveInstances = Array.from(this.instances.entries())
      .filter(([, instance]) => !instance.isPlaying)
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    while (this.instances.size > this.maxInstances && inactiveInstances.length > 0) {
      const [id] = inactiveInstances.shift()!;
      this.destroy(id);
    }
  }

  create(src: string, config?: AudioConfig): string {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Clean up if we have too many instances
    if (this.instances.size >= this.maxInstances) {
      this.cleanup();
    }

    const audio = new Audio(src);
    audio.volume = config?.volume || 1;
    
    // Preload the audio
    audio.preload = 'auto';

    const instance: AudioInstance = {
      id,
      element: audio,
      isPlaying: false,
      createdAt: Date.now()
    };

    // Set up event listeners
    audio.addEventListener('play', () => {
      instance.isPlaying = true;
    });

    audio.addEventListener('pause', () => {
      instance.isPlaying = false;
    });

    audio.addEventListener('ended', () => {
      instance.isPlaying = false;
    });

    audio.addEventListener('error', (error) => {
      console.warn(`Audio error for instance ${id}:`, error);
      instance.isPlaying = false;
    });

    this.instances.set(id, instance);
    return id;
  }

  async play(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Audio instance ${id} not found`);
    }

    try {
      await instance.element.play();
    } catch (error) {
      console.warn(`Failed to play audio ${id}:`, error);
      throw error;
    }
  }

  pause(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.element.pause();
    }
  }

  stop(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.element.pause();
      instance.element.currentTime = 0;
    }
  }

  setVolume(id: string, volume: number): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.element.volume = Math.max(0, Math.min(1, volume));
    }
  }

  isPlaying(id: string): boolean {
    const instance = this.instances.get(id);
    return instance ? instance.isPlaying : false;
  }

  destroy(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.element.pause();
      instance.element.src = '';
      instance.element.load(); // Reset the element
      this.instances.delete(id);
    }
  }

  destroyAll(): void {
    for (const id of this.instances.keys()) {
      this.destroy(id);
    }
  }

  getActiveCount(): number {
    return Array.from(this.instances.values()).filter(instance => instance.isPlaying).length;
  }

  getTotalCount(): number {
    return this.instances.size;
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.destroyAll();
  }
}

// Global audio service instance
let globalAudioService: AudioService | null = null;

export function useAudioService(config?: AudioConfig) {
  const serviceRef = useRef<AudioService | null>(null);

  // Initialize service
  useEffect(() => {
    if (!globalAudioService) {
      globalAudioService = new AudioService(config);
    }
    serviceRef.current = globalAudioService;

    return () => {
      // Only dispose when the last component unmounts
      // This is handled by the global service cleanup
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Individual components don't dispose the global service
      // The service manages its own cleanup
    };
  }, []);

  const createAudio = useCallback((src: string, audioConfig?: AudioConfig) => {
    return serviceRef.current?.create(src, audioConfig) || '';
  }, []);

  const playAudio = useCallback(async (id: string) => {
    return serviceRef.current?.play(id);
  }, []);

  const pauseAudio = useCallback((id: string) => {
    serviceRef.current?.pause(id);
  }, []);

  const stopAudio = useCallback((id: string) => {
    serviceRef.current?.stop(id);
  }, []);

  const setAudioVolume = useCallback((id: string, volume: number) => {
    serviceRef.current?.setVolume(id, volume);
  }, []);

  const isAudioPlaying = useCallback((id: string) => {
    return serviceRef.current?.isPlaying(id) || false;
  }, []);

  const destroyAudio = useCallback((id: string) => {
    serviceRef.current?.destroy(id);
  }, []);

  const getStats = useCallback(() => {
    if (!serviceRef.current) return { active: 0, total: 0 };
    return {
      active: serviceRef.current.getActiveCount(),
      total: serviceRef.current.getTotalCount()
    };
  }, []);

  return {
    createAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    setAudioVolume,
    isAudioPlaying,
    destroyAudio,
    getStats
  };
}

// Export function to manually dispose the global service (for app cleanup)
export function disposeGlobalAudioService() {
  if (globalAudioService) {
    globalAudioService.dispose();
    globalAudioService = null;
  }
}