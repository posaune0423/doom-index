/// <reference lib="dom" />

import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import WhitepaperViewer from "@/components/about/whitepaper-viewer";

describe("WhitepaperViewer", () => {
  it("should render children content", () => {
    const { container } = render(
      <WhitepaperViewer>
        <div>Test content</div>
      </WhitepaperViewer>,
    );
    expect(container.textContent).toContain("Test content");
  });

  it("should render container with paper styling", () => {
    const { container } = render(
      <WhitepaperViewer>
        <div>Test content</div>
      </WhitepaperViewer>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeDefined();
    expect(wrapper.style.background).toContain("linear-gradient");
    expect(wrapper.style.borderRadius).toBe("2px");
  });
});
