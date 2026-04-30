/**
 * API 配置系统
 * 用于前端管理用户自定义 API 配置（localStorage 持久化）
 */

export interface ApiConfig {
  // Gemini API 配置
  geminiApiKey: string;
  geminiApiUrl: string;

  // Doubao API 配置（可选）
  doubaoApiKey: string;
  doubaoApiUrl: string;
}

const STORAGE_KEY = 'nanobanana_api_config';

/**
 * 获取默认 API 配置 - 默认使用 Google 官方 Gemini API
 */
export function getDefaultApiConfig(): ApiConfig {
  return {
    geminiApiKey: '',
    geminiApiUrl: 'https://generativelanguage.googleapis.com',
    doubaoApiKey: '',
    doubaoApiUrl: '',
  };
}

/**
 * 从 localStorage 读取 API 配置
 */
export function loadApiConfig(): ApiConfig {
  if (typeof window === 'undefined') {
    return getDefaultApiConfig();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...getDefaultApiConfig(), ...parsed };
    }
  } catch (error) {
    console.error('Failed to load API config:', error);
  }

  return getDefaultApiConfig();
}

/**
 * 保存 API 配置到 localStorage
 */
export function saveApiConfig(config: ApiConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save API config:', error);
    throw new Error('保存配置失败');
  }
}

/**
 * 清除 API 配置
 */
export function clearApiConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API config:', error);
  }
}
