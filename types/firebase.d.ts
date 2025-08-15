declare module 'firebase/firestore' {
  export interface DocumentData {
    [field: string]: any;
  }

  export interface Timestamp {
    seconds: number;
    nanoseconds: number;
    toDate(): Date;
    toMillis(): number;
    isEqual(other: Timestamp): boolean;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;
  }

  export function collection(db: any, path: string): any;
  export function getDocs(query: any): Promise<any>;
  export function query(collection: any, ...constraints: any[]): any;
  export function where(field: string, opStr: string, value: any): any;
  export function doc(db: any, path: string, ...pathSegments: string[]): any;
  export function getDoc(docRef: any): Promise<any>;
  export function addDoc(collectionRef: any, data: any): Promise<any>;
  export function updateDoc(docRef: any, data: any): Promise<void>;
  export function serverTimestamp(): any;
  export function increment(n: number): any;
}

declare module 'firebase/auth' {
  export function getAuth(): any;
  export function onAuthStateChanged(auth: any, callback: (user: any) => void): () => void;
  export function signOut(auth: any): Promise<void>;
}

declare module 'firebase/storage' {
  export function getStorage(): any;
  export function ref(storage: any, path: string): any;
  export function uploadBytes(ref: any, data: any): Promise<any>;
  export function getDownloadURL(ref: any): Promise<string>;
} 