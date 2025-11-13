import MDXArticle from "@/components/about/mdx-article";
import { AboutScene } from "@/components/about/about-scene";
import { TopBar } from "@/components/ui/top-bar";
import type { Metadata } from "next";
import type { NextPage } from "next";

export const metadata: Metadata = {
  title: "About - DOOM INDEX",
  description: "DOOM INDEX プロジェクトについて",
};

const AboutPage: NextPage = async () => {
  return (
    <>
      <main style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
        <TopBar showProgress={false} />
        <AboutScene>
          <MDXArticle />
        </AboutScene>
      </main>
      {/* リーダーモード用の通常HTML（視覚的には非表示） */}
      <article className="sr-only" aria-label="About DOOM INDEX">
        <MDXArticle />
      </article>
    </>
  );
};

export default AboutPage;
