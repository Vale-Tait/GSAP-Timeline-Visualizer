import { ParsedTimeline, ParsedItem, TweenType } from "./types";

class MockTimeline {
  items: ParsedItem[] = [];
  labels: Record<string, number> = {};
  _duration: number = 0;
  idCounter: number = 0;
  _tlVars: any = {};
  _doc: Document | null = null;
  _hasRealDOM: boolean = false;

  constructor(vars?: any, doc?: Document | null, hasRealDOM: boolean = false) {
    this._tlVars = vars || {};
    this._doc = doc || null;
    this._hasRealDOM = hasRealDOM;
  }

  _parsePosition(position: any, defaultTime: number): number {
    if (position === undefined || position === null) return defaultTime;
    if (typeof position === "number") return position;
    if (typeof position === "string") {
      const pos = position.trim();

      // Relative to end of timeline "+=1", "-=0.5"
      if (pos.startsWith("+=")) return defaultTime + parseFloat(pos.slice(2));
      if (pos.startsWith("-=")) return defaultTime - parseFloat(pos.slice(2));

      // Recent tween references
      const recentTweens = this.items.filter((i) => i.type === "tween");
      const lastTween = recentTweens.length > 0 ? recentTweens[recentTweens.length - 1] : null;
      const lastStartTime = lastTween ? lastTween.startTime : 0;
      const lastEndTime = lastTween ? lastTween.endTime : 0;

      if (pos.startsWith("<")) {
        const offsetStr = pos.slice(1);
        if (!offsetStr) return lastStartTime;
        if (offsetStr.startsWith("+=")) return lastStartTime + parseFloat(offsetStr.slice(2));
        if (offsetStr.startsWith("-=")) return lastStartTime - parseFloat(offsetStr.slice(2));
        return lastStartTime + parseFloat(offsetStr);
      }
      if (pos.startsWith(">")) {
        const offsetStr = pos.slice(1);
        if (!offsetStr) return lastEndTime;
        if (offsetStr.startsWith("+=")) return lastEndTime + parseFloat(offsetStr.slice(2));
        if (offsetStr.startsWith("-=")) return lastEndTime - parseFloat(offsetStr.slice(2));
        return lastEndTime + parseFloat(offsetStr);
      }

      // Label reference (e.g., "myLabel", "myLabel+=1")
      const labelMatch = pos.match(/^([a-zA-Z0-9_-]+)([-+]=?[0-9.]+)?$/);
      if (labelMatch) {
        const labelName = labelMatch[1];
        const offsetStr = labelMatch[2];

        let baseTime = this.labels[labelName];
        if (baseTime === undefined) {
          this.labels[labelName] = defaultTime;
          baseTime = defaultTime;
        }
        if (offsetStr) {
          if (offsetStr.startsWith("+=")) baseTime += parseFloat(offsetStr.slice(2));
          else if (offsetStr.startsWith("-=")) baseTime -= parseFloat(offsetStr.slice(2));
          else baseTime += parseFloat(offsetStr);
        }
        return baseTime;
      }
    }
    return defaultTime;
  }

  addLabel(name: string, position?: any) {
    const time = this._parsePosition(position, this._duration);
    this.labels[name] = time;
    this.items.push({
      id: `label_${this.idCounter++}`,
      type: "label",
      labelName: name,
      startTime: time,
      endTime: time,
      duration: 0,
      originalPosition: position,
    });
    this._duration = Math.max(this._duration, time);
    return this;
  }

  _addTween(method: TweenType, target: any, vars: any = {}, position?: any) {
    let duration = vars.duration !== undefined ? parseFloat(vars.duration) : 0.5;
    if (method === "set") duration = 0;

    let delay = vars.delay !== undefined ? parseFloat(vars.delay) : 0;
    
    let baseTime = this._parsePosition(position, this._duration);
    let startTime = baseTime + delay;

    // Basic Stagger Mock
    const stagger = vars.stagger;
    const isStagger = stagger !== undefined && stagger !== null;

    let targetDesc = "Target";
    let resolvedElements: any[] = [];
    
    if (typeof target === 'string') {
        targetDesc = target;
        if (this._doc && this._hasRealDOM) {
            try {
                resolvedElements = Array.from(this._doc.querySelectorAll(target));
            } catch (e) {
                // Ignore invalid selector errors
            }
        }
    } else if (target && typeof target === 'object' && 'tagName' in target) { // Element
        const el = target as Element;
        const classNameStr = typeof el.className === 'string' ? el.className : ((el as any).className?.baseVal || '');
        targetDesc = `<${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}${classNameStr ? '.' + classNameStr.split(' ').join('.') : ''}>`;
        resolvedElements = [target];
    } else if (Array.isArray(target) || target instanceof NodeList || target instanceof HTMLCollection) {
        resolvedElements = Array.from(target as any);
        if (resolvedElements.length > 0 && typeof resolvedElements[0] === 'object' && 'tagName' in resolvedElements[0]) {
            targetDesc = `[Elements x${resolvedElements.length}]`;
        } else {
            targetDesc = `[Array x${resolvedElements.length}]`;
        }
    } else if (typeof target === 'object') {
        targetDesc = "Object";
    }

    let counts = 1;
    let staggerStep = 0;

    if (isStagger) {
        staggerStep = typeof stagger === 'number' ? stagger : (stagger.each || 0.1);
        if (this._hasRealDOM) {
            counts = Math.max(1, resolvedElements.length); 
        } else if (resolvedElements.length > 0) {
            counts = resolvedElements.length;
        } else {
            counts = 3; // mock 3 items if no DOM provided and string target
        }
    }

    const startIdx = this.idCounter;
    for (let i = 0; i < counts; i++) {
        const currentStartTime = startTime + i * staggerStep;
        const currentEndTime = currentStartTime + duration;
        
        let displayTargetName = targetDesc;
        if (isStagger && resolvedElements[i] && 'tagName' in resolvedElements[i]) {
            const el = resolvedElements[i] as Element;
            const classNameStr = typeof el.className === 'string' ? el.className : ((el as any).className?.baseVal || '');
            displayTargetName = `<${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}${classNameStr ? '.' + classNameStr.split(' ')[0] : ''}>`;
        } else if (isStagger) {
            displayTargetName = `${targetDesc} (Mock Element ${i + 1})`;
        } else if (!isStagger && resolvedElements.length > 1) {
            displayTargetName = `${targetDesc} (${resolvedElements.length} items)`;
        }

        this.items.push({
          id: `tween_${this.idCounter++}`,
          type: "tween",
          method,
          target: displayTargetName,
          duration,
          startTime: currentStartTime,
          endTime: currentEndTime,
          vars: { ...vars, stagger: undefined },
          originalPosition: position,
        });
        
        // Update timeline duration to the absolute end time of the latest tween
        // Note: position calculates based on the timeline's _duration prior to the tween's *own* delay!
        this._duration = Math.max(this._duration, currentEndTime);
    }
    return this;
  }

  to(target: any, vars: any, position?: any) { return this._addTween("to", target, vars, position); }
  from(target: any, vars: any, position?: any) { return this._addTween("from", target, vars, position); }
  fromTo(target: any, fromVars: any, toVars: any, position?: any) {
    const vars = { ...toVars, duration: toVars.duration ?? fromVars.duration ?? 0.5 };
    return this._addTween("fromTo", target, vars, position);
  }
  set(target: any, vars: any, position?: any) { return this._addTween("set", target, vars, position); }
  call(fn: any, params?: any, position?: any) {
      // call doesn't take time
      return this;
  }
}

export function parseGsapCode(code: string, htmlCode: string = ""): ParsedTimeline[] {
  const timelines: MockTimeline[] = [];

  const hasRealDOM = htmlCode.trim().length > 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(hasRealDOM ? htmlCode : "<div></div>", "text/html");

  const mockGsap = {
    timeline: (vars?: any) => {
      const tl = new MockTimeline(vars, doc, hasRealDOM);
      timelines.push(tl);
      return tl;
    },
    to: (t: any, v: any) => mockGsap.timeline().to(t, v),
    from: (t: any, v: any) => mockGsap.timeline().from(t, v),
    fromTo: (t: any, fv: any, tv: any) => mockGsap.timeline().fromTo(t, fv, tv),
    set: (t: any, v: any) => mockGsap.timeline().set(t, v),
    registerPlugin: (...args: any[]) => { /* Ignore plugins */ },
    utils: {
      toArray: (selector: any) => {
        if (typeof selector === 'string') {
          if (hasRealDOM) {
             try {
                return Array.from(doc.querySelectorAll(selector));
             } catch (e) {
                return [];
             }
          }
          // specific to the user's complex demo, if we don't have DOM, return mock elements
          return [
              doc.createElement('div'),
              doc.createElement('div'),
              doc.createElement('div')
          ];
        }
        if (selector instanceof NodeList || selector instanceof HTMLCollection) {
          return Array.from(selector);
        }
        if (Array.isArray(selector)) return selector;
        return [selector];
      }
    }
  };

  try {
    const run = new Function("gsap", "document", "window", "setTimeout", "requestAnimationFrame", `
      const globalObj = typeof window !== 'undefined' ? window : globalThis;
      const __local_store = {};
      
      const createMagicMock = (name) => {
          const handler = {
              get: (target, prop) => {
                  if (prop === Symbol.iterator) {
                      return function* () { 
                          yield createMagicMock(name + '_1'); 
                          yield createMagicMock(name + '_2'); 
                          yield createMagicMock(name + '_3'); 
                      };
                  }
                  if (prop === 'length') return 3;
                  if (prop === 'forEach') return (cb) => { 
                      ["_1", "_2", "_3"].forEach((suffix, i) => cb(createMagicMock(name + suffix), i)); 
                  };
                  if (prop === 'map') return (cb) => {
                      return ["_1", "_2", "_3"].map((suffix, i) => cb(createMagicMock(name + suffix), i));
                  };
                  if (prop === 'then') return (cb) => { cb({ready: true}); return createMagicMock(name + '.then'); };
                  
                  // Mock DOM element properties to prevent typical errors
                  if (prop === 'parentElement') return createMagicMock(name + '_parent');
                  if (prop === 'classList') return { contains: () => true, add: ()=>{}, remove: ()=>{} };
                  if (prop === 'style') return {};
                  if (prop === 'getBoundingClientRect') return () => ({ left: 0, top: 0, width: 100, height: 100 });
                  if (prop === 'tagName') return 'DIV';
                  if (prop === 'id') return name.replace(/[^a-zA-Z0-9]/g, '');
                  if (prop === 'className') return name.replace(/[^a-zA-Z0-9]/g, '');
                  if (prop === 'nodeType') return 1;
                  
                  if (typeof prop === 'symbol') return undefined;
                  
                  if (!isNaN(Number(prop))) {
                      return createMagicMock(\`\${name}[\${String(prop)}]\`);
                  }
                  
                  return createMagicMock(\`\${name}.\${String(prop)}\`);
              },
              apply: (target, thisArg, argumentsList) => {
                  argumentsList.forEach((arg) => {
                      if (typeof arg === 'function') {
                          if (!globalObj.__mock_depth) globalObj.__mock_depth = 0;
                          if (globalObj.__mock_depth < 10) {
                              globalObj.__mock_depth++;
                              try { arg(); } catch(e) {}
                              globalObj.__mock_depth--;
                          }
                      }
                  });
                  return createMagicMock(\`\${name}()\`);
              },
              construct: () => {
                  return createMagicMock(\`\${name}_instance\`);
              }
          };
          return new Proxy(function(){}, handler);
      };

      const sandbox = new Proxy({}, {
          has: () => true, 
          get: (target, prop) => {
              if (prop === 'gsap') return gsap;
              if (prop === 'console') return console;
              if (prop === 'Math') return Math;
              if (prop === 'Date') return Date;
              if (prop === 'document') return document;
              if (prop === 'window') return window;
              
              if (prop in globalObj) return globalObj[prop];
              if (typeof prop === 'symbol') return undefined; // e.g. Symbol.unscopables
              
              if (prop in __local_store) return __local_store[prop];
              
              // Return a magic deep-proxy for any undefined plugin like CustomEase or SplitText
              return createMagicMock(String(prop));
          },
          set: (target, prop, value) => {
             __local_store[prop] = value;
             return true;
          }
      });

      with (sandbox) {
          try {
            ${code}
          } catch (e) {
            console.error("User GSAP code execution error:", e);
            throw e;
          }
      }
    `);
    
    // Create a mock window
    const mockWindow = {
       innerWidth: 1920,
       innerHeight: 1080,
       document: doc,
       addEventListener: (event: string, callback: any) => {
           // Instantly execute all callbacks so animations bound to events are discovered
           if (typeof callback === 'function') {
               try { callback(); } catch(e) {}
           }
       },
       removeEventListener: () => {}
    };
    
    // Supplement doc with missing bits
    Object.defineProperty(doc, 'fonts', { 
        value: { 
            ready: { 
                then: (cb: any) => { 
                    if (typeof cb === 'function') {
                        try { cb(); } catch(e) { console.error("Error in then", e); } 
                    }
                    return { then: () => {} }; 
                } 
            } 
        },
        writable: true,
        configurable: true
    });
    
    Object.defineProperty(doc, 'readyState', {
        value: 'complete',
        writable: true,
        configurable: true
    });

    (doc as any).addEventListener = (event: string, callback: any) => {
         if (typeof callback === 'function') {
             try { callback(); } catch(e) {}
         }
    };

    const executeWithDepth = (cb: any) => {
        const glob = typeof window !== 'undefined' ? window : globalThis;
        if (!(glob as any).__mock_depth) (glob as any).__mock_depth = 0;
        if ((glob as any).__mock_depth < 10) {
            (glob as any).__mock_depth++;
            try { cb(); } catch(e) {}
            (glob as any).__mock_depth--;
        }
        return 1;
    };
    const mockSetTimeout = (cb: any) => executeWithDepth(cb);
    const mockRequestAnimationFrame = (cb: any) => executeWithDepth(cb);

    let originalGetTotalLength: any = null;
    let originalGetBBox: any = null;
    if (typeof SVGGeometryElement !== 'undefined') {
        originalGetTotalLength = SVGGeometryElement.prototype.getTotalLength;
        // Monkey patch to prevent "non-rendered element" error during mock execution
        SVGGeometryElement.prototype.getTotalLength = function() { return 100; };
    }
    if (typeof SVGGraphicsElement !== 'undefined') {
        originalGetBBox = SVGGraphicsElement.prototype.getBBox;
        SVGGraphicsElement.prototype.getBBox = function() { 
            return { x: 0, y: 0, width: 100, height: 100, bottom: 100, right: 100, left: 0, top: 0, toJSON: () => ({}) } as DOMRect;
        };
    }

    try {
      run(mockGsap, doc, mockWindow, mockSetTimeout, mockRequestAnimationFrame);
    } finally {
        if (typeof SVGGeometryElement !== 'undefined' && originalGetTotalLength) {
            SVGGeometryElement.prototype.getTotalLength = originalGetTotalLength;
        }
        if (typeof SVGGraphicsElement !== 'undefined' && originalGetBBox) {
            SVGGraphicsElement.prototype.getBBox = originalGetBBox;
        }
    }
  } catch (err: any) {
    throw new Error("Syntax error or invalid JS code. " + (err.message || ''));
  }

  return timelines.map(tl => {
      const tlDelay = tl._tlVars?.delay ? parseFloat(tl._tlVars.delay) : 0;
      
      // If the timeline itself has a delay, shift all items accordingly
      const shiftedItems = tl.items.map(item => ({
          ...item,
          startTime: item.startTime + tlDelay,
          endTime: item.endTime + tlDelay
      }));

      // Shift labels as well
      const shiftedLabels: Record<string, number> = {};
      Object.entries(tl.labels).forEach(([name, time]) => {
          shiftedLabels[name] = time + tlDelay;
      });

      return {
          items: shiftedItems,
          labels: shiftedLabels,
          totalDuration: tl._duration + tlDelay
      };
  }).filter(tl => {
      // Filter out implicit timelines created purely by `gsap.set()`
      // They have 0 duration and only 1 item (the set tween)
      if (tl.totalDuration === 0 && tl.items.length <= 1) return false;
      return tl.items.length > 0 || Object.keys(tl.labels).length > 0;
  });
}
