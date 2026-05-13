/// <reference types="vite/client" />

// Allow `import wasmUrl from '.../foo.wasm?url'` style asset imports.
declare module '*.wasm?url' {
    const url: string;
    export default url;
}

