export default <T, R>(items: T | T[], mapFn: (item: T) => R): R | R[] => (Array.isArray(items) ? items.map(mapFn).sort() : mapFn(items));
