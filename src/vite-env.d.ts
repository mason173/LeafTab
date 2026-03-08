/// <reference types="vite/client" />

declare module '*.png?url' {
  const content: string;
  export default content;
}

