/// <reference types="nativewind/types" />

// NativeWind's own types don't declare the CSS side-effect import
// (`import '../global.css'` in app/_layout.tsx) — this makes that import
// type-check without pulling in a generic CSS-modules typing setup we
// don't otherwise need.
declare module '*.css';
