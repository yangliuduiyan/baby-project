import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

/** 仅 Web 端：通知 E2E/测试框架应用已挂载 */
export function useFrameworkReady() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.frameworkReady?.();
    }
  });
}
