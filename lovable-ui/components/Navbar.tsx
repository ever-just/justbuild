import React from "react";

export default function Navbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
      {/* Logo & main navigation */}
      <div className="flex items-center gap-10">
        <a
          href="/"
          className="flex items-center gap-2 text-2xl font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {/* EverJust logo */}
          <img src="/everjust-logo.svg" alt="EverJust" className="h-8 w-auto" />
          EverJust
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          <a href="#" className="hover:text-white transition-colors">
            Community
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Enterprise
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Learn
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Shipped
          </a>
        </div>
      </div>

      {/* Auth buttons */}
      <div className="flex items-center gap-4 text-sm">
        <a
          href="#"
          className="text-gray-300 hover:text-white transition-colors"
        >
          Log in
        </a>
        <a
          href="#"
          className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Get started
        </a>
      </div>
    </nav>
  );
}
