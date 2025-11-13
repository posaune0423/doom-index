"use client";

import React from "react";
import type { PropsWithChildren } from "react";

const paperStyles = `
  .whitepaper-article {
    max-width: 100%;
    margin: 0;
    padding: 48px 40px;
    background: transparent;
    color: #1a1a1a;
    font-family: 'Computer Modern', 'Latin Modern Roman', 'Times New Roman', Times, serif;
    font-size: 16px;
    line-height: 1.7;
  }

  .paper-header {
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 2px solid #333;
  }

  .paper-metadata {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 2.5rem;
    font-weight: 500;
  }

  .paper-date {
    text-align: left;
  }

  .paper-version {
    text-align: right;
  }

  .paper-title {
    font-size: 2.25rem;
    font-weight: bold;
    text-align: center;
    margin: 2rem 0 1.5rem 0;
    line-height: 1.3;
    letter-spacing: -0.02em;
  }

  .paper-authors {
    text-align: center;
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
    font-weight: 500;
  }

  .paper-author {
    margin: 0 0.5rem;
  }

  .paper-institution {
    text-align: center;
    font-size: 1rem;
    color: #555;
    font-style: italic;
    margin-bottom: 2rem;
  }

  .paper-epigraph {
    text-align: center;
    font-size: 1.05rem;
    color: #444;
    margin-top: 2rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    font-style: italic;
  }

  .abstract-section {
    background: #f8f8f8;
    padding: 2rem;
    margin: 2rem 0;
    border-left: 4px solid #333;
    border-radius: 4px;
  }

  .abstract-section h2 {
    text-align: center;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .abstract-section p {
    text-align: justify;
    hyphens: auto;
    font-size: 1.05rem;
    line-height: 1.8;
  }

  @media (max-width: 768px) {
    .paper-container {
      padding: 2rem 1.5rem;
      font-size: 15px;
    }

    .paper-title {
      font-size: 1.75rem;
    }

    .paper-metadata {
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }
  }

  @media print {
    .paper-container {
      max-width: 100%;
      padding: 1in;
      box-shadow: none;
      background: white;
    }
  }
`;

const baseStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "#ffffff",
  padding: 0,
  margin: 0,
  fontFamily: '"Times New Roman", Times, serif',
  lineHeight: 1.6,
  overflow: "visible",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

const WhitepaperViewer: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div style={baseStyle} data-scrollable="true">
      <style dangerouslySetInnerHTML={{ __html: paperStyles }} />
      {children}
    </div>
  );
};

export default WhitepaperViewer;
