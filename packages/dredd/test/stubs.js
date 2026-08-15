// esmock reads a replacement object once, when the module under test is loaded, so a stub
// installed later by sinon is invisible to that module. Tests therefore hand esmock a set of
// forwarders that dispatch through a mutable copy of the module, and stub the copy:
//
//   const [fs, fsForwarded] = stubbable(realFs)      // stub fs, mock with fsForwarded
//   esmock('../build/x.js', { fs: fsForwarded })

// Methods can live on the prototype (winston loggers, class instances), so the copy keeps the
// original prototype and the forwarders are built from the whole chain.
function methodNames(source) {
  const names = new Set();
  for (
    let object = source;
    object && object !== Object.prototype && object !== Function.prototype;
    object = Object.getPrototypeOf(object)
  ) {
    Object.getOwnPropertyNames(object).forEach((name) => {
      if (name !== 'constructor') names.add(name);
    });
  }
  return names;
}

export function mutableCopy(mod) {
  const source =
    mod && typeof mod.default === 'object' && mod.default !== null
      ? mod.default
      : mod;
  const copy = Object.create(Object.getPrototypeOf(source));
  // Defined rather than assigned: a prototype getter with no setter would reject assignment.
  Object.getOwnPropertyNames(source).forEach((name) => {
    Object.defineProperty(
      copy,
      name,
      Object.getOwnPropertyDescriptor(source, name),
    );
  });
  return copy;
}

export function forwarders(copy) {
  // A module whose default export is callable has to stay callable for `import x from '...'`.
  const forwarded =
    typeof copy.default === 'function'
      ? (...args) => copy.default(...args)
      : {};

  methodNames(copy).forEach((name) => {
    if (name === 'default') return;
    const own = Object.getOwnPropertyDescriptor(copy, name);
    if (own && !own.get && typeof own.value !== 'function') {
      // Values are shared by reference, so mutations by a test are still seen.
      forwarded[name] = own.value;
      return;
    }
    // Inherited state is left alone: esmock merges this object into the real module, and
    // a getter-only property (winston's `transports`) would make that merge throw.
    if (typeof copy[name] === 'function') {
      forwarded[name] = (...args) => copy[name](...args);
    }
  });

  // A default import of a CommonJS module resolves to the namespace itself.
  forwarded.default = forwarded;
  return forwarded;
}

export function stubbable(mod) {
  const copy = mutableCopy(mod);
  return [copy, forwarders(copy)];
}
