export default (items, mapFn) => (Array.isArray(items) ? items.map(mapFn).sort() : mapFn(items));
