import * as React from 'react';

type AssignableRef<T> = React.Ref<T> | undefined;

function assignRef<T>(ref: AssignableRef<T>, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  (ref as React.MutableRefObject<T | null>).current = value;
}

type UseStableElementStateOptions<T> = {
  ref?: AssignableRef<T>;
};

export function useStableElementState<T>({
  ref,
}: UseStableElementStateOptions<T> = {}) {
  const [element, setElement] = React.useState<T | null>(null);
  const lastElementRef = React.useRef<T | null>(null);

  const handleElementRef = React.useCallback((node: T | null) => {
    if (lastElementRef.current !== node) {
      lastElementRef.current = node;
      setElement(node);
    }
    assignRef(ref, node);
  }, [ref]);

  return [element, handleElementRef] as const;
}
