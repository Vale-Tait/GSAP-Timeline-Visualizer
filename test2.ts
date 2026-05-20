import { parseGsapCode } from './src/lib/gsapMock.ts';

if (typeof (globalThis as any).DOMParser === 'undefined') {
    (globalThis as any).DOMParser = class DOMParser {
        parseFromString() {
             return {
                 querySelectorAll: () => [],
                 createElement: () => ({tagName: 'DIV'}),
             };
        }
    };
    (globalThis as any).NodeList = class NodeList {};
    (globalThis as any).HTMLCollection = class HTMLCollection {};
}

const code = `gsap.registerPlugin(CustomEase, SplitText);

document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(() => {
    CustomEase.create('hop', '0.9,0,0.1,1');

    const tl = gsap.timeline();
    tl.to('.progress-bar', { scaleX: 1, duration: 4, ease: 'power3.inOut' });
  });
});
`;

console.log(JSON.stringify(parseGsapCode(code), null, 2));
