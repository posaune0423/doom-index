"use client";

import { useState } from "react";
import { GalleryScene } from "@/components/gallery/gallery-scene";
import { TopBar } from "@/components/ui/top-bar";

export default function Home() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <main style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <TopBar onAboutClick={() => setIsHelpOpen(true)} />
      <GalleryScene isHelpOpen={isHelpOpen} onHelpToggle={setIsHelpOpen} />
    </main>
  );
}
