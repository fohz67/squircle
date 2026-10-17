import "./setup-ro";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { resizeTo } from "./setup-ro";
import { Squircle } from "../src/react";

describe("<Squircle>", () => {
  it("renders a rounded-rect fallback on the server", () => {
    const html = renderToString(<Squircle cornerRadius={24} borderWidth={1} border="#ddd" />);
    expect(html).toContain("border-radius:24px");
    expect(html).toContain("--squircle-border:#ddd");
    expect(html).toContain("data-squircle-border");
  });

  it("clips without re-rendering on resize", () => {
    let renders = 0;
    function Probe() {
      renders++;
      return null;
    }
    const { container } = render(
      <Squircle cornerRadius={24} cornerSmoothing={1} className="card">
        <Probe />
      </Squircle>,
    );
    const el = container.firstElementChild as HTMLElement;
    const start = renders;
    act(() => {
      for (let w = 100; w < 160; w++) resizeTo(el, w, 80);
    });
    expect(el.style.clipPath).toMatch(/^path/);
    expect(renders).toBe(start);
  });

  it("asChild merges onto the child and forwards refs", () => {
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const { container } = render(
      <Squircle asChild ref={ref} cornerRadius={10} className="a">
        <a href="#x" ref={childRef} className="b">
          link
        </a>
      </Squircle>,
    );
    const a = container.querySelector("a")!;
    expect(a.className).toBe("a b");
    expect(ref.current).toBe(a);
    expect(childRef.current).toBe(a);
    expect(a.style.borderRadius).toBe("10px");
  });
});
