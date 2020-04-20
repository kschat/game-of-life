
export const repeat = <T>(
  times: number, 
  callback: (i: number) => T,
): T[] => {
  return [...Array(times)].map((_, i) => callback(i));
};
