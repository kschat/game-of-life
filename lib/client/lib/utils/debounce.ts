// ensure we're using the browser type definitions and not Node.JS
const { setTimeout, clearTimeout } = window;

type Milliseconds = number;

export interface DebounceOptions<P extends any[]> {
  readonly action: (...args: P) => void;
  readonly wait: Milliseconds;
  readonly immediate?: boolean;
}

export const debounce = <P extends any[]>({ 
  action, 
  wait, 
  immediate = false,
}: DebounceOptions<P>): typeof action => {
  let timeoutId: number | undefined;

  return (...args) => {
    const callNow = immediate && !timeoutId;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (!immediate) {
        action(...args);
      }
    }, wait);

    if (callNow) {
      action(...args);
    }
  };
};

