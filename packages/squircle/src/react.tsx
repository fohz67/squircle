import * as React from "react";
// Imported through the package name (kept external at build) so the React
// entry shares the single observer and path cache with the core entry.
import { squircle, type SquircleHandle, type SquircleOptions } from "@fohz67/squircle";

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface SquircleProps extends SquircleOptions {
  /** Render the single child element instead of a `div` (props, className, style and ref are merged). */
  asChild?: boolean;
  /** Initial size before measurement, e.g. for SSR layouts. Not used for the shape. */
  defaultWidth?: number;
  defaultHeight?: number;
  children?: React.ReactNode;
}

type DivProps = Omit<React.ComponentPropsWithoutRef<"div">, keyof SquircleProps>;

/**
 * ```tsx
 * <Squircle cornerRadius={24} cornerSmoothing={1} className="bg-white p-6">…</Squircle>
 * <Squircle cornerRadius={24} borderWidth={1} border="#e4e4e7">…</Squircle>
 * <Squircle cornerRadius={24} borderWidth={2} border="linear-gradient(135deg,#f0f,#0ff)">…</Squircle>
 * ```
 *
 * The component never re-renders on resize: the shared observer writes the
 * clip-path straight to the DOM.
 */
export const Squircle = React.forwardRef<HTMLElement, SquircleProps & DivProps>(function Squircle(
  {
    cornerRadius,
    topLeftCornerRadius,
    topRightCornerRadius,
    bottomRightCornerRadius,
    bottomLeftCornerRadius,
    cornerSmoothing = 0.6,
    preserveSmoothing,
    borderWidth,
    border,
    width,
    height,
    settle,
    native,
    asChild,
    defaultWidth,
    defaultHeight,
    style,
    ...props
  },
  forwardedRef,
) {
  const ref = React.useRef<HTMLElement | null>(null);
  const handle = React.useRef<SquircleHandle | null>(null);

  // Every key is present (possibly undefined) so `update` can unset options.
  const options: SquircleOptions = {
    cornerRadius,
    topLeftCornerRadius,
    topRightCornerRadius,
    bottomRightCornerRadius,
    bottomLeftCornerRadius,
    cornerSmoothing,
    preserveSmoothing,
    borderWidth,
    border,
    width,
    height,
    settle,
    native,
  };

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    handle.current = squircle(el, options);
    return () => {
      handle.current?.destroy();
      handle.current = null;
    };
  }, []);

  useIsoLayoutEffect(() => {
    handle.current?.update(options);
  });

  const setRef = React.useCallback(
    (node: HTMLElement | null) => {
      ref.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  const hasCorners =
    topLeftCornerRadius !== undefined ||
    topRightCornerRadius !== undefined ||
    bottomRightCornerRadius !== undefined ||
    bottomLeftCornerRadius !== undefined;

  // SSR / no-JS fallback: a plain rounded rectangle with the same radii.
  const ownStyle: React.CSSProperties = {
    borderRadius: hasCorners
      ? `${topLeftCornerRadius ?? cornerRadius ?? 0}px ${topRightCornerRadius ?? cornerRadius ?? 0}px ${bottomRightCornerRadius ?? cornerRadius ?? 0}px ${bottomLeftCornerRadius ?? cornerRadius ?? 0}px`
      : cornerRadius,
    width: width ?? defaultWidth,
    height: height ?? defaultHeight,
  };
  if (borderWidth) {
    (ownStyle as Record<string, unknown>)["--squircle-border-width"] = borderWidth + "px";
    (ownStyle as Record<string, unknown>)["--squircle-border"] = border ?? "currentColor";
  }

  const merged = { ...props, "data-squircle": cornerRadius ?? "", "data-squircle-border": borderWidth ? "" : undefined };

  if (asChild) {
    const child = React.Children.only(props.children) as React.ReactElement<Record<string, any>>;
    const childProps = child.props;
    return React.cloneElement(child, {
      ...mergeProps(merged, childProps),
      style: { ...ownStyle, ...style, ...childProps.style },
      ref: composeRefs(setRef, childRef(child)),
      children: childProps.children,
    });
  }

  return <div {...merged} ref={setRef as React.Ref<HTMLDivElement>} style={{ ...ownStyle, ...style }} />;
});

// React 19 moved `ref` into props; reading `element.ref` there logs a warning.
function childRef(child: React.ReactElement<Record<string, any>>) {
  return parseInt(React.version, 10) >= 19 ? child.props.ref : (child as any).ref;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T>).current = value;
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => refs.forEach((r) => assignRef(r, node));
}

/** Minimal Slot merge: child props win, handlers are chained, classNames joined. */
function mergeProps(slot: Record<string, any>, child: Record<string, any>) {
  const out: Record<string, any> = { ...slot, ...child };
  for (const key in slot) {
    const a = slot[key];
    const b = child[key];
    if (/^on[A-Z]/.test(key) && typeof a === "function" && typeof b === "function") {
      out[key] = (...args: unknown[]) => {
        b(...args);
        a(...args);
      };
    } else if (key === "className" && a && b) out[key] = a + " " + b;
  }
  delete out.children;
  return out;
}

export { squircle, getSquirclePath } from "@fohz67/squircle";
export type { SquircleOptions, SquircleHandle, SquirclePathOptions } from "@fohz67/squircle";
