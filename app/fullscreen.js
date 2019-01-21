'use strict';

function toggleFullScreen() { // eslint-disable-line no-unused-vars
  // reference: https://stackoverflow.com/questions/3900701/onclick-go-full-screen
  if ((document.fullScreenElement && document.fullScreenElement !== null) ||
   (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen)
      document.documentElement.requestFullScreen();
    else if (document.documentElement.mozRequestFullScreen)
      document.documentElement.mozRequestFullScreen();
    else if (document.documentElement.webkitRequestFullScreen)
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  } else {
    if (document.cancelFullScreen)
      document.cancelFullScreen();
    else if (document.mozCancelFullScreen)
      document.mozCancelFullScreen();
    else if (document.webkitCancelFullScreen)
      document.webkitCancelFullScreen();
  }
}
