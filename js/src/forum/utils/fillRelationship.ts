export default <T, R>(items: T | T[] | null | undefined, mapFn: (item: T) => R): R[] | R | null => {
  if (Array.isArray(items)) {
    return (items.filter(Boolean) as T[]).map(mapFn).filter(Boolean).sort();
  }

  return items ? mapFn(items) : null;
};
