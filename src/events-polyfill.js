if (typeof window !== "undefined") {
  (function () {
    function CustomEvent(event, params) {
      debugger;
      params = params || {bubbles: false, cancelable: false, details: undefined};
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.details);
      return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
  })();
}