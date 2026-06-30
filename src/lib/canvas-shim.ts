// Empty shim for the "canvas" package.
// pdfjs-dist optionally requires it for Node.js; we only use pdfjs client-side
// so the server build gets this no-op instead of the native binary.
export default {};
