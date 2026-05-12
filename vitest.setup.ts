/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';

// ResizeObserver polyfill for jsdom (required by Radix UI Select + react-resizable-panels)
global.ResizeObserver = class ResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};
