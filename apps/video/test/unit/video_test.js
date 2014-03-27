/*
  Video Media Info Tests
*/
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
require('/shared/js/media/media_utils.js');
require('/shared/js/media/video_stats.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('/video/js/video.js');
requireApp('/video/js/video_utils.js');
requireApp('/video/test/unit/mock_l10n.js');
requireApp('/video/test/unit/mock_thumbnail_group.js');
requireApp('/video/test/unit/mock_mediadb.js');
requireApp('/video/test/unit/mock_video_data.js');
requireApp('/video/js/thumbnail_list.js');

var metadataQueue;
var MediaDB;
var videodb;
var selectedVideo;
var selectedThumbnailItemName = 'test-video.webm';
var videoControlsAutoHidingMsOverride = 0;
var autoPlay, enterFullscreen, keepControls;
var videoDuration = 1.25;

function containsClass(element, value) {
  return element.classList.contains(value);
}

/**
 * Utility function for showPlayer tests to ensure
 * async functionality has finished before testing
 * asserts. Nested setTimeout functions simulate
 * polling semantics.
 */
var waitForDoneSeeking = function(player, callback) {
  if (player.hidden === false) {
    console.log('before timeouts');
    callback();
  }

  var abort = false;
  setTimeout(function() {
    if (player.hidden === false) {
      console.log('first setTimeout');
      abort = true;
      callback();
    }
    if (!abort) {
      setTimeout(function() {
        if (player.hidden === false) {
          console.log('second setTimeout');
          abort = true;
          callback();
        }
        if (!abort) {
          setTimeout(function() {
            if (player.hidden === false) {
              console.log('third setTimeout');
              abort = true;
              callback();
            }
            if (!abort) {
              setTimeout(function() {
                if (player.hidden === false) {
                  console.log('fourth setTimeout');
                  callback();
                }
              } , 500);
            }
          } , 100);
        }
      }, 50);
    }
  }, 25);
};

suite('Video App Unit Tests', function() {
  var nativeMozL10n;
  suiteSetup(function() {

    // Create DOM structure
    loadBodyHTML('/index.html');
    dom.infoView = document.getElementById('info-view');
    dom.player = document.getElementById('player');
    dom.durationText = document.getElementById('duration-text');
    dom.play = document.getElementById('play');
    dom.videoTitle = document.getElementById('video-title');
    dom.videoContainer = document.getElementById('video-container');
    dom.videoControls = document.getElementById('videoControls');
    dom.elapsedText = document.getElementById('elapsed-text');
    dom.elapsedTime = document.getElementById('elapsedTime');
    dom.playHead = document.getElementById('playHead');

    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    MediaUtils._ = MockL10n.get;

    selectedVideo = {
      'name': selectedThumbnailItemName,
      'type': 'video\/webm',
      'size': '19565',
      'date': '1395088917000',
      'metadata': {
          'isVideo': 'true',
          'title': 'test-video1',
          'duration': videoDuration,
          'width': '640',
          'height': '360',
          'rotation': '0',
          'currentTime': 0
      }
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  suite('#Video Info Populate Data', function() {
    before(function() {
      currentVideo = {
        metadata: {
          title: 'Small webm',
          duration: 5.568,
          width: 560,
          height: 320
        },
        type: 'video/webm',
        date: 1375873140000,
        size: 229455
      };
    });

    test('#Test Video details', function() {
      showInfoView();
      assert.equal(document.getElementById('info-name').textContent,
        'Small webm');
      assert.equal(document.getElementById('info-length').textContent,
        '00:05');
      assert.equal(document.getElementById('info-type').textContent,
        'webm');
      assert.equal(document.getElementById('info-date').textContent,
        '08/07/2013');
      assert.equal(document.getElementById('info-resolution').textContent,
        '560x320');
    });

    test('#Test show info view', function() {
      assert.isFalse(dom.infoView.classList[0] === 'hidden');
    });

    test('#Test hide info view', function() {
      hideInfoView();
      assert.isTrue(dom.infoView.classList[0] === 'hidden');
    });
  });

  suite('#Video Format Date', function() {

    test('#Test Video created date', function() {
      currentVideo = {
        metadata: {
          title: 'My test video'
        },
        date: 1376909940000
      };
      showInfoView();
      assert.equal(document.getElementById('info-date').textContent,
        '08/19/2013');
    });

    test('#Test Video date null', function() {
      currentVideo = {
        metadata: {
          title: 'Lorem Ipsum'
        },
        date: null
      };
      showInfoView();
      assert.equal(document.getElementById('info-date').textContent, '');
    });

    test('#Test Video date empty', function() {
      currentVideo = {
        metadata: {
          title: 'Video test'
        },
        date: ''
      };
      showInfoView();
      assert.equal(document.getElementById('info-date').textContent, '');
    });
  });


  suite('#Video Format Size', function() {

    test('#Test Video size', function() {
      currentVideo = {
        metadata: {
          title: 'My test video'
        },
        size: 229455
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent,
        '224 byteUnit-KB');
    });

    test('#Test Video size null', function() {
      currentVideo = {
        metadata: {
          title: 'Video title'
        },
        size: null
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent, '');
    });

    test('#Test Video size MB', function() {
      currentVideo = {
        metadata: {
          title: 'Video large size'
        },
        size: 4110000
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent,
        '4 byteUnit-MB');
    });
  });

  suite('#Update dialog tests', function() {
    var thumbnailItemName = 'dummy-file-name-09.3gp';
    MediaDB = {
      'OPENING': 'opening',
      'UPGRADING': 'upgrading',
      'READY': 'ready',
      'NOCARD': 'nocard',
      'UNMOUNTED': 'unmounted',
      'CLOSED': 'closed'
    };

    before(function() {
      MockThumbnailGroup.reset();
      var dummyContainer = document.createElement('div');

      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);

      dom.overlay = document.createElement('overlay');
      dom.overlayMenu = document.createElement('overlay-menu');
      dom.overlayActionButton = document.createElement('overlay-action-button');
      dom.overlayMenu = document.createElement('overlay-menu');
      dom.overlayTitle = document.createElement('overlay-title');
      dom.overlayText = document.createElement('overlay-text');
    });

    /**
     * If there is at least one thumbnail loaded, hide overlay
     */
    test('#Update dialog, hide overlay', function() {
      thumbnailList.addItem({'name': thumbnailItemName});
      updateDialog();
      assert.equal(dom.overlay.classList.contains('hidden'), true);
    });

    /**
     * DB being upraded
     */
    test('#Update dialog, db upgrade, \'upgrade\' title and text', function() {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.UPGRADING;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), true);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), true);
      assert.equal(dom.overlayTitle.textContent, 'upgrade-title');
      assert.equal(dom.overlayText.textContent, 'upgrade-text');
    });

    test('#Update dialog, pick activity, cancel overlay menu', function() {
      pendingPick = {'source': {'name': 'pick_name'}};
      storageState = MediaDB.UNMOUNTED;
      dom.overlayMenu.classList.add('hidden');
      dom.overlayActionButton.classList.add('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.textContent,
                   'overlay-cancel-button');
      assert.equal(dom.overlayTitle.textContent, 'pluggedin-title');
      assert.equal(dom.overlayText.textContent, 'pluggedin-text');
    });

    test('#Update dialog, empty list, \'empty\' overlay menu', function() {
      pendingPick = null;
      storageState = null;
      dom.overlayMenu.classList.add('hidden');
      dom.overlayActionButton.classList.add('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';
      firstScanEnded = true;
      metadataQueue = {'length': 0};

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.textContent,
                   'overlay-camera-button');
      assert.equal(dom.overlayTitle.textContent, 'empty-title');
      assert.equal(dom.overlayText.textContent, 'empty-text');
    });

    test('#Update dialog, no card, \'no card\' title and text', function() {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.NOCARD;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), true);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), true);
      assert.equal(dom.overlayTitle.textContent, 'nocard2-title');
      assert.equal(dom.overlayText.textContent, 'nocard3-text');
    });

    test('#Update dialog, media no mnt, \'no mount\' title/text', function() {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.UNMOUNTED;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), true);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), true);
      assert.equal(dom.overlayTitle.textContent, 'pluggedin-title');
      assert.equal(dom.overlayText.textContent, 'pluggedin-text');
    });
  });

  suite('#showPlayer flows', function() {

    before(function() {

      MockThumbnailGroup.reset();
      var dummyContainer = document.createElement('div');

      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);
    });

    /**
     * When device is tablet, changing screen orientation to landscape AND
     * when device is tablet, screen orientation is landscape, cancelling
     * "thumbnail select view" AND
     * when parsing metadata for new files is complete and there is at least
     * one video:
     * - autoPlay=false, enterFullscreen=false, keepControls=true
     *   + show, do not play, current video
     *   + do not show fullscreen
     *   + do not auto-hide controls
     *   + change focus from 'old' thumbnail to newly selected
     *   (if 'old' exists)
     */
    test('#showPlayer: !play, !fullscreen, show controls - curr video exists',
        function(done) {

      currentVideo = {
        'name': 'current video',
        'type': 'video\/webm',
        'size': '1048576',
        'date': '1395088917000',
        'metadata': {
            'isVideo': 'true',
            'title': 'test-video2',
            'duration': '5:00',
            'width': '640',
            'height': '360',
            'rotation': '0',
            'currentTime': 1.2
        }
      };

      // Mock that the 'current' thumbnail is focused
      MockThumbnailGroup._GroupID = '2014-03_current';
      thumbnailList.addItem(currentVideo);
      var currentThumbnail = thumbnailList.thumbnailMap[currentVideo.name];
      currentThumbnail.htmlNode.classList.add('focused');
      dom.play.classList.add('paused');

      // Thumbnail being selected is not focused
      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);
      var selectedThumbnail =
          thumbnailList.thumbnailMap[selectedVideo.name];

      assert.equal(containsClass(currentThumbnail.htmlNode,
                                 'focused'), true);
      assert.equal(containsClass(selectedThumbnail.htmlNode,
                                 'focused'), false);

      document.body.classList.add(LAYOUT_MODE.list); // Stage list layout
      dom.videoControls.classList.add('hidden'); // Stage controls being hidden

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo,
                 autoPlay,
                 enterFullscreen,
                 keepControls);

      assert.equal(containsClass(currentThumbnail.htmlNode,
                   'focused'), false);
      assert.equal(containsClass(selectedThumbnail.htmlNode,
                   'focused'), true);

      assert.equal(dom.player.preload, 'metadata');
      assert.equal(dom.player.hidden, true);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(dom.player.currentTime, currentVideo.metadata.currentTime);
        assert.equal(containsClass(dom.play, 'paused'), true);
        assert.equal(dom.durationText.textContent, '00:01');
        assert.equal(containsClass(dom.videoControls, 'hidden'), false);
        assert.equal(containsClass(document.body,
                                   LAYOUT_MODE.list), true);
        assert.equal(containsClass(document.body,
                                   LAYOUT_MODE.fullscreenPlayer), false);
        done();
      });
    });

    test('#showPlayer: !play, !fullscreen, show controls - no current video',
        function(done) {

      currentVideo = null;

      // Thumbnail being selected is not focused
      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);
      var selectedThumbnail =
          thumbnailList.thumbnailMap[selectedVideo.name];

      selectedThumbnail.htmlNode.classList.remove('focused');
      assert.equal(containsClass(selectedThumbnail.htmlNode,
                   'focused'), false);

      document.body.classList.add(LAYOUT_MODE.list); // Stage list layout
      dom.videoControls.classList.add('hidden'); // Stage controls being hidden
      assert.equal(containsClass(dom.videoControls, 'hidden'), true);

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      // currentVideo should be same as selectedVideo
      assert.equal(currentVideo.name, selectedVideo.name);
      assert.equal(currentVideo.type, selectedVideo.type);
      assert.equal(currentVideo.date, selectedVideo.date);
      assert.equal(currentVideo.metadata.isVideo,
                   selectedVideo.metadata.isVideo);
      assert.equal(currentVideo.metadata.title,
                   selectedVideo.metadata.title);
      assert.equal(currentVideo.metadata.duration,
                   selectedVideo.metadata.duration);
      assert.equal(currentVideo.metadata.width,
                   selectedVideo.metadata.width);
      assert.equal(currentVideo.metadata.height,
                   selectedVideo.metadata.height);
      assert.equal(currentVideo.metadata.rotation,
                   selectedVideo.metadata.rotation);
      assert.equal(currentVideo.metadata.currentTime,
                   selectedVideo.metadata.currentTime);

      assert.equal(containsClass(selectedThumbnail.htmlNode, 'focused'), true);
      assert.equal(dom.player.preload, 'metadata');
      assert.equal(dom.player.hidden, true);

      // Note: This test does not test setVideoUrl as none of the variables
      //       that affect that function have been changed from the previous
      //       test.

      // Wait for doneSeeking to finish to avoid complications with the
      // explicit doneSeeking tests
      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.durationText.textContent, '00:01');
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(containsClass(document.body,
                     LAYOUT_MODE.list), true);
        assert.equal(containsClass(document.body,
                     LAYOUT_MODE.fullscreenPlayer), false);
        assert.equal(dom.play.classList.contains('paused'), true);
        done();
      });
    });

    /*
     * Test
     *  - the video player is playing (not paused),
     *  - device is not fullscreen
     *  - video controls are shown.
     * This test does not test the body of show player as
     * that has already been tested fully by the previous
     * tests.
     */

    test('#showPlayer: play, !fullscreen, show controls',
        function(done) {

      currentVideo = null;

      // Thumbnail being selected is not focused
      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      document.body.classList.add(LAYOUT_MODE.list); // Not fullscreen
      dom.videoControls.classList.add('hidden');
      autoPlay = true;
      enterFullscreen = false;
      keepControls = true;
      videodb = new MockMediaDB(selectedVideo, mockVideo);

      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(containsClass(document.body, LAYOUT_MODE.list), true);
        assert.equal(containsClass(dom.play, 'paused'), false);
        assert.equal(containsClass(dom.videoControls, 'hidden'), false);
        done();
      });
    });

    /*
     * Test
     *  - the video player is playing (not paused),
     *  - device is fullscreen
     *  - video controls are shown.
     * This test does not test the body of show player as
     * that has already been tested fully by the previous
     * tests.
     */
    test('#showPlayer: play, fullscreen, show controls',
        function(done) {

      currentVideo = null;

      // Thumbnail being selected is not focused
      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      //
      // Not fullscreen, prepare to change layout made to fullscreen
      //
      currentLayoutMode = LAYOUT_MODE.list;
      document.body.classList.add(LAYOUT_MODE.list);

      dom.videoControls.classList.add('hidden');
      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = true;
      enterFullscreen = true;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(containsClass(document.body,
                     LAYOUT_MODE.list), false);
        assert.equal(containsClass(document.body,
                     LAYOUT_MODE.fullscreenPlayer), true);
        assert.equal(containsClass(dom.play, 'paused'), false);
        assert.equal(containsClass(dom.videoControls, 'hidden'), false);
        done();
      });
    });

    /*
     * Test
     *  - the video player is playing (not paused),
     *  - device is fullscreen
     *  - video controls are hidden.
     * This test does not test the body of show player as
     * that has already been tested fully by the previous
     * tests.
     */
    test('#showPlayer: play, fullscreen, !show controls',
        function(done) {

      currentVideo = null;

      // Thumbnail being selected is not focused
      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      //
      // Not fullscreen, prepare to change layout made to fullscreen
      //
      currentLayoutMode = LAYOUT_MODE.list;
      document.body.classList.add(LAYOUT_MODE.list);

      // In order to test 'setControlsVisibility(true)'
      isPhone = true;
      dom.videoControls.classList.remove('hidden');

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = true;
      enterFullscreen = true;
      keepControls = false;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(containsClass(document.body,
                     LAYOUT_MODE.list), false);
        assert.equal(containsClass(document.body,
                     LAYOUT_MODE.fullscreenPlayer), true);
        assert.equal(containsClass(dom.play, 'paused'), false);
        assert.equal(containsClass(dom.videoControls, 'hidden'), true);
        done();
      });
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video position is not at end
     */
    test('#showPlayer: selected video has metadata, not at end',
        function(done) {

      currentVideo = null;

      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(dom.player.currentTime,
                     selectedVideo.metadata.currentTime);
        assert.equal(dom.videoTitle.textContent,
            selectedVideo.metadata.title);
        done();
      });
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video position is at end
     */
    test('#showPlayer: selected video has metadata, at end',
        function(done) {

      currentVideo = null;
      selectedVideo.metadata.currentTime = videoDuration;

      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(dom.player.currentTime, 0);
        assert.equal(dom.videoTitle.textContent, currentVideo.metadata.title);
        done();
      });
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video has not been played before (metadata.currentTime
     *     has no value)
     */
    test('#showPlayer: selected video has metadata, first time played',
        function(done) {

      currentVideo = null;
      selectedVideo = {
        'name': selectedThumbnailItemName,
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000',
        'metadata': {
            'isVideo': 'true',
            'title': 'test-video1',
            'duration': videoDuration,
            'width': '640',
            'height': '360',
            'rotation': '0'
        }
      };

      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(dom.player.currentTime, 0);
        assert.equal(dom.videoTitle.textContent, currentVideo.metadata.title);
        done();
      });
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video does not have metadata
     *   - video does not have a title
     */
    test('#showPlayer: selected video has no metadata, no title',
        function(done) {

      currentVideo = null;
      selectedVideo = {
        'name': selectedThumbnailItemName,
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000'
      };

      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(dom.player.currentTime, 0);
        assert.equal(dom.videoTitle.textContent, '');
        done();
      });
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video does not have metadata
     *   - video does have a title
     */
    test('#showPlayer: selected video has no metadata, has title',
        function(done) {

      currentVideo = null;
      selectedVideo = {
        'name': selectedThumbnailItemName,
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000',
        'title': 'test-video1'
      };

      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);

      videodb = new MockMediaDB(selectedVideo, mockVideo);

      autoPlay = false;
      enterFullscreen = false;
      keepControls = true;
      showPlayer(selectedVideo, autoPlay, enterFullscreen, keepControls);

      waitForDoneSeeking(dom.player, function() {
        assert.equal(dom.player.duration, videoDuration);
        assert.equal(dom.player.currentTime, 0);
        assert.equal(dom.videoTitle.textContent, selectedVideo.title);
        done();
      });
    });
  });
});
