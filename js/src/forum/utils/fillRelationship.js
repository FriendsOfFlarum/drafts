export default (data, map) => {
  if (Array.isArray(data)) {
    return data.filter(Boolean).map(map).filter(Boolean).sort();
  }

  return data ? map(data) : null;
};
