const sandbox = new Proxy({}, {
  has: (target, prop) => {
    if (['console', 'gsap', 'document', 'window', 'setTimeout', 'requestAnimationFrame'].includes(prop)) {
      return false; // Let it fall through
    }
    return true; // Catch everything else!
  },
  get: (target, prop) => {
    if (typeof prop !== 'symbol') console.log("get", prop);
    if (prop === Symbol.unscopables) return undefined;
    if (prop === Symbol.toPrimitive) return () => 1;
    if (prop === 'customProp') return 'custom';
    
    // Return a recursive proxy for deep property access
    return new Proxy(function(){}, {
      get: (t, p) => p === Symbol.toPrimitive ? () => 1 : t,
      apply: function(t) { return new Proxy(function(){}, this); },
      construct: function(t) { return new Proxy(function(){}, this); }
    });
  }
});

const code = `
  console.log(customProp);
  gsap.registerPlugin(CustomEase, SplitText);
  CustomEase.create('abc', 'def');
  const x = new UnknownClass().foo().bar;
  console.log("Success");
`;

const runner = new Function('sandbox', 'console', 'gsap', `
  with(sandbox) {
    ${code}
  }
`);

runner(sandbox, console, { registerPlugin: () => {} });
