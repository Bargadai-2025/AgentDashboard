"use client";
// NavbarWrapper.jsx — thin Client Component shell
// layout.js is a Server Component and can't use ssr:false dynamic imports
// This wrapper lives in Client-land and owns the dynamic import safely.
import dynamic from "next/dynamic";
const Navbar = dynamic(() => import("./navbar"), { ssr: false });
export default function NavbarWrapper() {
  return <Navbar />;
}
