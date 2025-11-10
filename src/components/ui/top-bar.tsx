import type { FC } from "react";

import { TopBarProgress } from "./top-bar-progress";

export const TopBar: FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold font-cinzel-decorative">DOOM INDEX</h1>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm font-cinzel-decorative">Next Generation</span>
            <TopBarProgress />
          </div>
        </div>
      </div>
    </div>
  );
};
