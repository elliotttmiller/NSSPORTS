/**
 * API Integration Helper for NorthStar Sports Frontend
 *
 * This module provides:
 * - Centralized API configuration
 * - Request/response interceptors
 * - Error handling
 * - Type-safe API calls
 * - Development utilities
 */

import { useState } from "react";

// Environment configuration
const config = {
  development: {
    apiBaseUrl: "http://localhost:4000",
    timeout: 10000,
    retries: 3,
    logRequests: true,
  },
  production: {
    apiBaseUrl:
      process.env.VITE_API_BASE_URL || "https://api.northstarsports.com",
    timeout: 15000,
    retries: 2,
    logRequests: false,
  },
  test: {
    apiBaseUrl: "http://localhost:4000",
    timeout: 5000,
    retries: 1,
    logRequests: false,
  },
};

const env = process.env.NODE_ENV || "development";
const apiConfig = config[env as keyof typeof config] || config.development;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// Request Options
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

// API Client Class
export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = apiConfig.apiBaseUrl;
    this.defaultTimeout = apiConfig.timeout;
    this.maxRetries = apiConfig.retries;
  }

  // Set authentication token
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  // Get authentication token
  getAuthToken(): string | null {
    return this.authToken;
  }

  // Build request headers
  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
      ...options?.headers,
    };

    if (this.authToken && !options?.skipAuth) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Log request (development only)
  private logRequest(method: string, url: string, data?: any) {
    if (apiConfig.logRequests) {
      console.group(`🌐 API ${method.toUpperCase()} ${url}`);
      if (data) {
        console.log("📤 Request Data:", data);
      }
      console.log("🕒 Timestamp:", new Date().toISOString());
      console.groupEnd();
    }
  }

  // Log response (development only)
  private logResponse(
    method: string,
    url: string,
    response: any,
    duration: number,
  ) {
    if (apiConfig.logRequests) {
      console.group(`📡 API Response ${method.toUpperCase()} ${url}`);
      console.log("📥 Response:", response);
      console.log("⏱️ Duration:", `${duration}ms`);
      console.log("✅ Status:", response.success ? "Success" : "Error");
      console.groupEnd();
    }
  }

  // Generic request method with retry logic
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options?.timeout || this.defaultTimeout;
    const maxRetries = options?.retries ?? this.maxRetries;

    let lastError: Error = new Error("Unknown error");

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now();

        this.logRequest(method, endpoint, data);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestInit: RequestInit = {
          method,
          headers: this.buildHeaders(options),
          signal: controller.signal,
          ...(data && method !== "GET" ? { body: JSON.stringify(data) } : {}),
        };

        const response = await fetch(url, requestInit);
        clearTimeout(timeoutId);

        const responseData = (await response.json()) as ApiResponse<T>;
        const duration = performance.now() - startTime;

        this.logResponse(method, endpoint, responseData, duration);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${responseData.message || response.statusText}`,
          );
        }

        if (!responseData.success && responseData.error) {
          throw new Error(responseData.error);
        }

        return responseData.data as T;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && !error.name.includes("AbortError")) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.warn(
            `🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms:`,
            error.message,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        break;
      }
    }

    const apiError: ApiError = {
      status: 0,
      message: lastError.message,
      details: lastError,
    };

    throw apiError;
  }

  // HTTP Methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, undefined, options);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>("POST", endpoint, data, options);
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>("PUT", endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, undefined, options);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get("/health");
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Specific API service methods
export class ApiService {
  // User APIs
  static async getUsers() {
    return apiClient.get("/api/users");
  }

  static async getUserById(id: string) {
    return apiClient.get(`/api/users/${id}`);
  }

  static async createUser(userData: any) {
    return apiClient.post("/api/users", userData);
  }

  static async updateUser(id: string, userData: any) {
    return apiClient.put(`/api/users/${id}`, userData);
  }

  static async deleteUser(id: string) {
    return apiClient.delete(`/api/users/${id}`);
  }

  // Game APIs
  static async getGames() {
    return apiClient.get("/api/games");
  }

  static async getGameById(id: string) {
    return apiClient.get(`/api/games/${id}`);
  }

  static async createGame(gameData: any) {
    return apiClient.post("/api/games", gameData);
  }

  static async updateGame(id: string, gameData: any) {
    return apiClient.put(`/api/games/${id}`, gameData);
  }

  static async deleteGame(id: string) {
    return apiClient.delete(`/api/games/${id}`);
  }

  // Bet APIs
  static async getBets() {
    return apiClient.get("/api/bets");
  }

  static async getBetById(id: string) {
    return apiClient.get(`/api/bets/${id}`);
  }

  static async createBet(betData: any) {
    return apiClient.post("/api/bets", betData);
  }

  static async updateBet(id: string, betData: any) {
    return apiClient.put(`/api/bets/${id}`, betData);
  }

  static async deleteBet(id: string) {
    return apiClient.delete(`/api/bets/${id}`);
  }

  // Redis/KV APIs
  static async getKVValue(key: string) {
    return apiClient.get(`/api/kv/${key}`);
  }

  static async setKVValue(key: string, value: any) {
    return apiClient.post(`/api/kv/${key}`, { value });
  }

  static async deleteKVValue(key: string) {
    return apiClient.delete(`/api/kv/${key}`);
  }

  // Redis Hash APIs
  static async getHashValue(hash: string, field: string) {
    return apiClient.get(`/api/redis/hash/${hash}/${field}`);
  }

  static async setHashValue(hash: string, field: string, value: any) {
    return apiClient.post(`/api/redis/hash/${hash}`, { field, value });
  }

  static async getHashAll(hash: string) {
    return apiClient.get(`/api/redis/hash/${hash}`);
  }
}

// React hooks for API integration
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const executeRequest = async <T>(
    apiCall: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      console.error("API Error:", apiError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    executeRequest,
    clearError: () => setError(null),
  };
}

// Environment utilities
export const EnvUtils = {
  isDevelopment: () => env === "development",
  isProduction: () => env === "production",
  isTesting: () => env === "test",

  getApiBaseUrl: () => apiConfig.apiBaseUrl,

  // Debug utilities for development
  enableDebugMode: () => {
    if (EnvUtils.isDevelopment()) {
      (window as any).__NORTHSTAR_DEBUG__ = true;
      console.log("🐛 Debug mode enabled");
    }
  },

  // Connection testing utility
  testBackendConnection: async (): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> => {
    const startTime = performance.now();
    try {
      const connected = await apiClient.testConnection();
      const latency = performance.now() - startTime;
      return { connected, latency };
    } catch (error) {
      const latency = performance.now() - startTime;
      return {
        connected: false,
        latency,
        error: (error as Error).message,
      };
    }
  },
};

// Export everything
export { apiConfig };
export default ApiService;
