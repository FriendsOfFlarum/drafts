export default (data, map) => (Array.isArray(data) ? data.map(map).sort() : map(data));
