// Global declarations for browser environment
interface Window {
  localStorage: Storage;
  dispatchEvent(event: Event): boolean;
  open(url?: string, target?: string, features?: string): Window | null;
}

interface Document {
  getElementById(elementId: string): HTMLElement | null;
}

interface HTMLTextAreaElement extends HTMLElement {
  value: string;
}

// Declare global variables
declare var window: Window;
declare var document: Document; 