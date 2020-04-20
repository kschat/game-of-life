export const $ = <E extends Element = Element>(selector: string) => Array.from(document.querySelectorAll<E>(selector));

export const onReady = (fn: () => Promise<void> | void): void => {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(fn, 1);
    return;
  } 

  document.addEventListener('DOMContentLoaded', fn);
};

