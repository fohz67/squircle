// Controllable ResizeObserver stand-in: tests call `resizeTo(el, w, h)`.
type Cb = (entries: ResizeObserverEntry[], ro: ResizeObserver) => void;
export const created: MockRO[] = [];

export class MockRO {
  targets = new Set<Element>();
  constructor(public cb: Cb) {
    created.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
}

export function resizeTo(el: Element, inlineSize: number, blockSize: number) {
  for (const ro of created)
    if (ro.targets.has(el))
      ro.cb([{ target: el, borderBoxSize: [{ inlineSize, blockSize }] } as unknown as ResizeObserverEntry], ro as unknown as ResizeObserver);
}

(globalThis as any).ResizeObserver = MockRO;
