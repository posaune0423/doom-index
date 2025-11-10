import { GalleryScene } from "@/components/gallery/gallery-scene";
import { TopBar } from "@/components/ui/top-bar";

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <TopBar />
      <GalleryScene />
    </div>
  );
}
