import 'fake-indexeddb/auto';

if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type, props = {}) {
      super(type, props);
      this.pointerId = props.pointerId || 1;
      this.pointerType = props.pointerType || '';
      this.isPrimary = props.isPrimary ?? true;
    }
  }
  global.PointerEvent = PointerEventPolyfill;
}
