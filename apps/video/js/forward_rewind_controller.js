/* exported ForwardRewindController */
/* globals pause */

/*
 * This file is used for forward and rewind funtionality of Gaia Video app.
 *
 * If the user taps the forward or rewind icons,
 * the video will jump forward or back by 10 seconds.
 *
 * When the user presses and holds on the forward or rewind icons,
 * the video time will move foward or back at 10 times the regular speed.
 */

'use strict';

var ForwardRewindController = (function() {

  var isLongPressing = false;
  var intervalId = null;
  var player;

  function init(video) {
    console.log('ForwardRewindController init');
    player = video;
  }

  function uninit(video) {
    player = null;
  }

  function handleSeekForward() {
    startFastSeeking(1);
  }

  function handleSeekBackward() {
    startFastSeeking(-1);
  }

  function handleLongPressForward() {
    isLongPressing = true;
    startFastSeeking(1);
  }

  function handleLongPressBackward() {
    isLongPressing = true;
    startFastSeeking(-1);
  }

  function startFastSeeking(direction) {

    // direction can be 1 or -1, 1 means forward and -1 means rewind.
    var offset = direction * 10;

    if (isLongPressing) {
      intervalId = window.setInterval(function() {
        seekVideo(player.currentTime + offset);
      }, 1000);
    } else {
      seekVideo(player.currentTime + offset);
    }
  }

  function stopFastSeeking() {
    if (isLongPressing && intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
      isLongPressing = false;
    }
  }

  function seekVideo(seekTime) {
    if (seekTime >= player.duration || seekTime < 0) {
      if (isLongPressing) {
        stopFastSeeking();
      }
      if (seekTime >= player.duration) {
        seekTime = player.duration;
        // If the user tries to seek past the end then pause playback
        // because otherwise when we get the 'ended' event we'll skip
        // to the beginning of the movie. Even though we pause, we'll
        // still get the ended event, but the handler sees that we're
        // paused and does not skip back to the beginning.
        pause();
      }
      else {
        seekTime = 0;
      }
    }

    player.fastSeek(seekTime);
  }

  return {
   init: init,
   uninit: uninit,
   handleSeekForward: handleSeekForward,
   handleSeekBackward: handleSeekBackward,
   handleLongPressForward: handleLongPressForward,
   handleLongPressBackward: handleLongPressBackward,
   handleLongPressStop: stopFastSeeking
  };

}());
