if (__BROWSER_ENV__) {
  require("./bell.scss");
  var Drop = require('tether-drop');
  var log = require('loglevel');;

  function showBell() {
    document.getElementsByTagName('body')[0]
      .insertAdjacentHTML('beforeend', `<div id="onesignal-bell"></div>`);

    let dropInstance = new Drop({
      target: document.querySelector('#onesignal-bell'),
      content: 'Welcome sdfsdfto the future',
      classes: 'drop-theme-arrows',
      position: 'right middle',
      openOn: 'hover',
      tetherOptions: {
        offset: '10px 8px',
        constraints: [
          {
            to: 'scrollParent',
            pin: ['top']
          }
        ]
      }
    });
  }

  module.exports = showBell;
}