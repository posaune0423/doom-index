/* eslint-disable @next/next/no-img-element */

import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }: { children?: ReactNode }) => (
      <h1 className="text-4xl font-bold mb-6 mt-8 text-center">{children}</h1>
    ),
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 className="text-2xl font-bold mt-12 mb-4 pb-2" style={{ borderBottom: "2px solid #333" }}>
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => <h3 className="text-xl font-semibold mt-8 mb-3">{children}</h3>,
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 className="text-lg font-semibold mt-6 mb-2 italic">{children}</h4>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p className="mb-4 leading-7 text-justify hyphens-auto">{children}</p>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="list-disc list-outside mb-4 space-y-1 ml-6">{children}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="list-decimal list-outside mb-4 space-y-1 ml-6">{children}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => <li className="leading-7">{children}</li>,
    code: ({ children }: { children?: ReactNode }) => (
      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-900 border border-gray-300">
        {children}
      </code>
    ),
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className="bg-gray-50 p-4 rounded overflow-x-auto mb-6 text-sm leading-6 border border-gray-300 text-gray-900">
        {children}
      </pre>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote
        className="pl-6 pr-4 py-2 italic mb-6"
        style={{ borderLeft: "4px solid #666", background: "#f5f5f5" }}
      >
        {children}
      </blockquote>
    ),
    a: ({ children, href }: { children?: ReactNode; href?: string }) => (
      <a
        href={href}
        className="underline decoration-1 underline-offset-2"
        style={{ color: "#0066cc" }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className="overflow-x-auto mb-6 my-6" style={{ width: "100%" }}>
        <table
          className="min-w-full border-collapse text-sm"
          style={{
            border: "1px solid #333",
            width: "100%",
            borderCollapse: "collapse",
            margin: "1rem 0",
          }}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => (
      <thead style={{ background: "#e8e8e8", borderBottom: "2px solid #333" }}>{children}</thead>
    ),
    tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children?: ReactNode }) => (
      <tr style={{ borderBottom: "1px solid #ddd" }}>{children}</tr>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th
        className="px-3 py-2 text-left font-semibold"
        style={{ border: "1px solid #333", padding: "0.5rem 0.75rem", textAlign: "left" }}
      >
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="px-3 py-2" style={{ border: "1px solid #ddd", padding: "0.5rem 0.75rem" }}>
        {children}
      </td>
    ),
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <div className="my-6 flex flex-col items-center">
        <img src={src} alt={alt} className="max-w-xs h-auto" style={{ border: "1px solid #ddd" }} />
        {alt && (
          <p className="text-sm mt-2 italic text-center" style={{ color: "#666" }}>
            {alt}
          </p>
        )}
      </div>
    ),
    hr: () => <hr className="my-8" style={{ borderTop: "1px solid #ccc" }} />,
    ...components,
  };
}
