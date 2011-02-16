////////////////////////////////////////////////////////////////////////////////
// Element Behaviors
// Tell elements how to act or react
////////////////////////////////////////////////////////////////////////////////

/* Player Behaviors - How VideoJS reacts to what the video is doing.
================================================================================ */
VideoJS.player.newBehavior("player", function(player){
    this.onError(this.playerOnVideoError);
    // Listen for when the video is played
    this.onPlay(this.playerOnVideoPlay);
    this.onPlay(this.trackCurrentTime);
    // Listen for when the video is paused
    this.onPause(this.playerOnVideoPause);
    this.onPause(this.stopTrackingCurrentTime);
    // Listen for when the video ends
    this.onEnded(this.playerOnVideoEnded);
    // Set interval for load progress using buffer watching method
    // this.trackCurrentTime();
    this.trackBuffered();
    // Buffer Full
    this.onBufferedUpdate(this.isBufferFull);
  },{
    playerOnVideoError: function(event){
      this.log(event);
      this.log(this.video.error);
    },
    playerOnVideoPlay: function(event){ this.hasPlayed = true; },
    playerOnVideoPause: function(event){},
    playerOnVideoEnded: function(event){
      this.currentTime(0);
      this.pause();
    },

    /* Load Tracking -------------------------------------------------------------- */
    // Buffer watching method for load progress.
    // Used for browsers that don't support the progress event
    trackBuffered: function(){
      this.bufferedInterval = setInterval(this.triggerBufferedListeners.context(this), 500);
    },
    stopTrackingBuffered: function(){ clearInterval(this.bufferedInterval); },
    bufferedListeners: [],
    onBufferedUpdate: function(fn){
      this.bufferedListeners.push(fn);
    },
    triggerBufferedListeners: function(){
      this.isBufferFull();
      this.each(this.bufferedListeners, function(listener){
        (listener.context(this))();
      });
    },
    isBufferFull: function(){
      if (this.bufferedPercent() == 1) { this.stopTrackingBuffered(); }
    },

    /* Time Tracking -------------------------------------------------------------- */
    trackCurrentTime: function(){
      if (this.currentTimeInterval) { clearInterval(this.currentTimeInterval); }
      this.currentTimeInterval = setInterval(this.triggerCurrentTimeListeners.context(this), 100); // 42 = 24 fps
      this.trackingCurrentTime = true;
    },
    // Turn off play progress tracking (when paused or dragging)
    stopTrackingCurrentTime: function(){
      clearInterval(this.currentTimeInterval);
      this.trackingCurrentTime = false;
    },
    currentTimeListeners: [],
    // onCurrentTimeUpdate is in API section now
    triggerCurrentTimeListeners: function(late, newTime){ // FF passes milliseconds late as the first argument
      this.each(this.currentTimeListeners, function(listener){
        (listener.context(this))(newTime || this.currentTime());
      });
    },

    /* Resize Tracking -------------------------------------------------------------- */
    resizeListeners: [],
    onResize: function(fn){
      this.resizeListeners.push(fn);
    },
    // Trigger anywhere the video/box size is changed.
    triggerResizeListeners: function(){
      this.each(this.resizeListeners, function(listener){
        (listener.context(this))();
      });
    }
  }
);
/* Focus Video Reporter Behaviors - i.e. Controls hiding based on keyboard focus
================================================================================ */
VideoJS.player.newBehavior("focusVideoReporter", function(element){
    // Listen for the mouse moving out of the video. Used to hide the controller.
    _V_.addListener(element, "blur", this.focusVideoReporterOnBlur.context(this));
	// Listen for the mouse move the video. Used to reveal the controller.
    _V_.addListener(element, "focus", this.focusVideoReporterOnFocus.context(this));
  },{
    focusVideoReporterOnFocus: function(event){
		this.showControlBars();
		clearInterval(this.mouseMoveTimeout);
		clearInterval(this.focusTimeout);
		this.focusTimeout = setTimeout(this.hideControlBars.context(this), 8000);
    },
    focusVideoReporterOnBlur: function(event){
		// Prevent flicker by making sure mouse hasn't left the video
		var parent = event.relatedTarget;
		if(!parent && event.originalTarget) parent = event.originalTarget;
		while (parent && parent !== this.box) {
			parent = parent.parentNode;
		}
		if (parent !== this.box) {
			this.hideControlBars.context(this);
		}
	}
  }
);
/* Mouse Over Video Reporter Behaviors - i.e. Controls hiding based on mouse location
================================================================================ */
VideoJS.player.newBehavior("mouseOverVideoReporter", function(element){
    // Listen for the mouse move the video. Used to reveal the controller.
    _V_.addListener(element, "mousemove", this.mouseOverVideoReporterOnMouseMove.context(this));
    // Listen for the mouse moving out of the video. Used to hide the controller.
    _V_.addListener(element, "mouseout", this.mouseOverVideoReporterOnMouseOut.context(this));
  },{
    mouseOverVideoReporterOnMouseMove: function(){
      this.showControlBars();
      clearInterval(this.mouseMoveTimeout);
      this.mouseMoveTimeout = setTimeout(this.hideControlBars.context(this), 4000);
    },
    mouseOverVideoReporterOnMouseOut: function(event){
      // Prevent flicker by making sure mouse hasn't left the video
      var parent = event.relatedTarget;
      while (parent && parent !== this.box) {
        parent = parent.parentNode;
      }
      if (parent !== this.box) {
        this.hideControlBars();
      }
    }
  }
);
/* Mouse Over Video Reporter Behaviors - i.e. Controls hiding based on mouse location
================================================================================ */
VideoJS.player.newBehavior("box", function(element){
    this.positionBox();
    _V_.addClass(element, "vjs-paused");
    this.activateElement(element, "mouseOverVideoReporter");
    this.onPlay(this.boxOnVideoPlay);
    this.onPause(this.boxOnVideoPause);
  },{
    boxOnVideoPlay: function(){
      _V_.removeClass(this.box, "vjs-paused");
      _V_.addClass(this.box, "vjs-playing");
    },
    boxOnVideoPause: function(){
      _V_.removeClass(this.box, "vjs-playing");
      _V_.addClass(this.box, "vjs-paused");
    }
  }
);
/* Poster Image Overlay
================================================================================ */
VideoJS.player.newBehavior("poster", function(element){
    this.activateElement(element, "mouseOverVideoReporter");
    this.activateElement(element, "playButton");
    this.onPlay(this.hidePoster);
    this.onEnded(this.showPoster);
    this.onResize(this.positionPoster);
  },{
    showPoster: function(){
      if (!this.poster) { return; }
      this.poster.style.display = "block";
      this.positionPoster();
    },
    positionPoster: function(){
      // Only if the poster is visible
      if (!this.poster || this.poster.style.display == 'none') { return; }
      this.poster.style.height = this.height() + "px"; // Need incase controlsBelow
      this.poster.style.width = this.width() + "px"; // Could probably do 100% of box
    },
    hidePoster: function(){
      if (!this.poster) { return; }
      this.poster.style.display = "none";
    },
    // Update poster source from attribute or fallback image
    // iPad breaks if you include a poster attribute, so this fixes that
    updatePosterSource: function(){
      if (!this.video.poster) {
        var images = this.video.getElementsByTagName("img");
        if (images.length > 0) { this.video.poster = images[0].src; }
      }
    }
  }
);
/* Control Bar Behaviors
================================================================================ */
VideoJS.player.newBehavior("controlBar", function(element){
    if (!this.controlBars) { 
      this.controlBars = []; 
      this.onResize(this.positionControlBars);
    }
    this.controlBars.push(element);
    _V_.addListener(element, "mousemove", this.onControlBarsMouseMove.context(this));
    _V_.addListener(element, "mouseout", this.onControlBarsMouseOut.context(this));
  },{
    showControlBars: function(){
      if (!this.options.controlsAtStart && !this.hasPlayed) { return; }
      this.each(this.controlBars, function(bar){
        bar.style.display = "block";
      });
      if(this.subtitleDisplays){
		  this.each(this.subtitleDisplays, function(disp){
			  _V_.removeClass(disp,'vjs-controls-hidden');
		  });
	   }
    },
    // Place controller relative to the video's position (now just resizing bars)
    positionControlBars: function(){
      this.updatePlayProgressBars();
      this.updateLoadProgressBars();
    },
    hideControlBars: function(){
      if (this.options.controlsHiding && !this.mouseIsOverControls) { 
        this.each(this.controlBars, function(bar){
          bar.style.display = "none";
        });
        if(this.subtitleDisplays){
          this.each(this.subtitleDisplays, function(disp){
             _V_.removeClass(disp,'vjs-controls-hidden');
             _V_.addClass(disp,'vjs-controls-hidden');
          });
        }
      }
    },
    // Block controls from hiding when mouse is over them.
    onControlBarsMouseMove: function(){ this.mouseIsOverControls = true; },
    onControlBarsMouseOut: function(event){ 
      this.mouseIsOverControls = false; 
    }
  }
);
/* PlayToggle, PlayButton, PauseButton Behaviors
================================================================================ */
// Play Toggle
VideoJS.player.newBehavior("playToggle", function(element){
    if (!this.elements.playToggles) {
      this.elements.playToggles = [];
      this.onPlay(this.playTogglesOnPlay);
      this.onPause(this.playTogglesOnPause);
    }
    this.elements.playToggles.push(element);
    _V_.addListener(element, "click", this.onPlayToggleClick.context(this));
    _V_.addListener(element, "keydown", this.onPlayToggleKeyDown.context(this));
  },{
    onPlayToggleClick: function(event){
      if (this.paused()) {
        this.play();
      } else {
        this.pause();
      }
    },
	 onPlayToggleKeyDown: function(event){
      	switch(event.keyCode){
			case 13:
			case 32:
				this.onPlayToggleClick(event);
				this.focusVideoReporterOnFocus(event);
				break;
		}

    },
    playTogglesOnPlay: function(event){
      this.each(this.elements.playToggles, function(toggle){
        _V_.removeClass(toggle, "vjs-paused");
        _V_.addClass(toggle, "vjs-playing");
		  toggle.setAttribute('aria-label','PAUSE');
      });
    },
    playTogglesOnPause: function(event){
      this.each(this.elements.playToggles, function(toggle){
        _V_.removeClass(toggle, "vjs-playing");
        _V_.addClass(toggle, "vjs-paused");
		  toggle.setAttribute('aria-label','PLAY');
      });
    }
  }
);
// Play
VideoJS.player.newBehavior("playButton", function(element){
    _V_.addListener(element, "click", this.onPlayButtonClick.context(this));
	 _V_.addListener(element, "keydown", this.onPlayButtonKeyDown.context(this));
  },{
    onPlayButtonClick: function(event){ this.play(); },
	 onPlayButtonKeyDown: function(event){
		switch(event.keyCode){
			case 13:
			case 32:
				this.onPlayButtonClick(event);
				this.focusVideoReporterOnFocus(event);
				break;
		}
	 }
  }
);
// Pause
VideoJS.player.newBehavior("pauseButton", function(element){
    _V_.addListener(element, "click", this.onPauseButtonClick.context(this));
	 _V_.addListener(element, "keydown", this.onPauseButtonKeyUp.context(this));
  },{
	onPauseButtonClick: function(event){ this.pause(); },
	onPauseButtonKeyDown: function(event){ 
		switch(event.keyCode){
			case 13:
			case 32:
				this.onPauseButtonClick(event);
				this.focusVideoReporterOnFocus(event);
				break;
		}
	}
  }
);
/* Play Progress Bar Behaviors
================================================================================ */
VideoJS.player.newBehavior("playProgressBar", function(element){
    if (!this.playProgressBars) { 
      this.playProgressBars = [];
      this.onCurrentTimeUpdate(this.updatePlayProgressBars);
    }
    this.playProgressBars.push(element);
	 _V_.addListener(element, "keydown", this.playProgressBarKeyDown.context(this));
  },{
    // Ajust the play progress bar's width based on the current play time
    updatePlayProgressBars: function(newTime){
      newTime = (newTime !== undefined) ? newTime : this.currentTime();
      var progress = newTime / this.duration();
      if (isNaN(progress)) { progress = 0; }
      this.each(this.playProgressBars, function(bar){
        if (bar.style) { 
			bar.style.width = _V_.round(progress * 100, 2) + "%";
			bar.setAttribute('aria-valuemin',0);
			bar.setAttribute('aria-valuemax',this.duration());
			bar.setAttribute('aria-valuenow',newTime);
			bar.setAttribute('aria-valuetext',_V_.formatTime(newTime));
		}
      });
    },
	 playProgressBarKeyDown: function(event){
		if(!this.duration()) return;
		var newTime = this.currentTime();
		switch(event.keyCode){
			case 32:
				if (this.paused()) {
				  this.play();
				} else {
				  this.pause();
				}
				break;
			case 37:
				event.preventDefault();
				newTime =Math.max(0, this.currentTime()-5);
				break;
			case 39:
				event.preventDefault();
				if(this.duration()){
					newTime =Math.min(this.bufferedPercent()*this.duration(), Math.min(this.currentTime()+5,this.duration()-0.1));
				}
				break;
		}
		if(newTime!==this.currentTime()){
		      this.stopTrackingCurrentTime(); // Allows for smooth scrubbing
			  
			  this.videoWasPlaying = !this.paused();
			  this.pause();
			  
			  _V_.blockTextSelection();
	  
			  this.triggerCurrentTimeListeners(0, newTime); // Allows for smooth scrubbing
			  // Don't let video end while scrubbing.
			  if (newTime == this.duration()) { newTime = newTime - 0.1; }
			  this.currentTime(newTime);
			  
			   _V_.unblockTextSelection();
			  if (this.videoWasPlaying) {
				this.play();
				this.trackCurrentTime();
			  }
			  
		}
		event.currentTarget.focus();
		this.focusVideoReporterOnFocus(event);
	}
  }
);
/* Load Progress Bar Behaviors
================================================================================ */
VideoJS.player.newBehavior("loadProgressBar", function(element){
    if (!this.loadProgressBars) { this.loadProgressBars = []; }
    this.loadProgressBars.push(element);
    this.onBufferedUpdate(this.updateLoadProgressBars);
  },{
    updateLoadProgressBars: function(){
      this.each(this.loadProgressBars, function(bar){
			if (bar.style) {
				var percent = _V_.round(this.bufferedPercent() * 100, 2);
				bar.style.width = percent+ "%";
				bar.setAttribute('aria-valuenow',percent);
				bar.setAttribute('aria-valuetext',percent+'%');
			}
      });
    }
  }
);

/* Current Time Display Behaviors
================================================================================ */
VideoJS.player.newBehavior("currentTimeDisplay", function(element){
    if (!this.currentTimeDisplays) { 
      this.currentTimeDisplays = []; 
      this.onCurrentTimeUpdate(this.updateCurrentTimeDisplays);
    }
    this.currentTimeDisplays.push(element);
  },{
    // Update the displayed time (00:00)
    updateCurrentTimeDisplays: function(newTime){
      if (!this.currentTimeDisplays) { return; }
      // Allows for smooth scrubbing, when player can't keep up.
      var time = (newTime) ? newTime : this.currentTime();
      this.each(this.currentTimeDisplays, function(dis){
        dis.innerHTML = _V_.formatTime(time);
      });
    }
  }
);

/* Duration Display Behaviors
================================================================================ */
VideoJS.player.newBehavior("durationDisplay", function(element){
    if (!this.durationDisplays) { 
      this.durationDisplays = []; 
      this.onCurrentTimeUpdate(this.updateDurationDisplays);
    }
    this.durationDisplays.push(element);
  },{
    updateDurationDisplays: function(){
      if (!this.durationDisplays) { return; }
      this.each(this.durationDisplays, function(dis){
        if (this.duration()) { dis.innerHTML = _V_.formatTime(this.duration()); }
      });
    }
  }
);

/* Current Time Scrubber Behaviors
================================================================================ */
VideoJS.player.newBehavior("currentTimeScrubber", function(element){
    _V_.addListener(element, "mousedown", this.onCurrentTimeScrubberMouseDown.rEvtContext(this));
  },{
    // Adjust the play position when the user drags on the progress bar
    onCurrentTimeScrubberMouseDown: function(event, scrubber){
      event.preventDefault();
		
		if(this.playProgressBar) this.playProgressBar.focus();
		
      this.currentScrubber = scrubber;

      this.stopTrackingCurrentTime(); // Allows for smooth scrubbing

      this.videoWasPlaying = !this.paused();
      this.pause();

      _V_.blockTextSelection();
      this.setCurrentTimeWithScrubber(event);
      _V_.addListener(document, "mousemove", this.onCurrentTimeScrubberMouseMove.rEvtContext(this));
      _V_.addListener(document, "mouseup", this.onCurrentTimeScrubberMouseUp.rEvtContext(this));
    },
    onCurrentTimeScrubberMouseMove: function(event){ // Removeable
      this.setCurrentTimeWithScrubber(event);
    },
    onCurrentTimeScrubberMouseUp: function(event){ // Removeable
      _V_.unblockTextSelection();
		if(this.playProgressBar) this.playProgressBar.focus();
      document.removeEventListener("mousemove", this.onCurrentTimeScrubberMouseMove, false);
      document.removeEventListener("mouseup", this.onCurrentTimeScrubberMouseUp, false);
      if (this.videoWasPlaying) {
        this.play();
        this.trackCurrentTime();
      }
    },
    setCurrentTimeWithScrubber: function(event){
      var newProgress = _V_.getRelativePosition(event.pageX, this.currentScrubber);
      var newTime = newProgress * this.duration();
      this.triggerCurrentTimeListeners(0, newTime); // Allows for smooth scrubbing
      // Don't let video end while scrubbing.
      if (newTime == this.duration()) { newTime = newTime - 0.1; }
      this.currentTime(newTime);
    }
  }
);
/* Volume Display Behaviors
================================================================================ */
VideoJS.player.newBehavior("volumeDisplay", function(element){
    if (!this.volumeDisplays) { 
      this.volumeDisplays = [];
      this.onVolumeChange(this.updateVolumeDisplays);
    }
    this.volumeDisplays.push(element);
    this.updateVolumeDisplay(element); // Set the display to the initial volume
  },{
    // Update the volume control display
    // Unique to these default controls. Uses borders to create the look of bars.
    updateVolumeDisplays: function(){
      if (!this.volumeDisplays) { return; }
      this.each(this.volumeDisplays, function(dis){
        this.updateVolumeDisplay(dis);
      });
    },
    updateVolumeDisplay: function(display){
      var volNum = Math.ceil(this.volume() * 6);
      this.each(display.children, function(child, num){
        if (num < volNum) {
          _V_.addClass(child, "vjs-volume-level-on");
        } else {
          _V_.removeClass(child, "vjs-volume-level-on");
        }
      });
		this.volumeControl.setAttribute('aria-valuenow',this.volume());
		this.volumeControl.setAttribute('aria-valuetext',_V_.round(this.volume()*100,2));
    }
  }
);
/* Volume Scrubber Behaviors
================================================================================ */
VideoJS.player.newBehavior("volumeScrubber", function(element){
    _V_.addListener(element, "mousedown", this.onVolumeScrubberMouseDown.rEvtContext(this));
	 _V_.addListener(element, "keydown", this.onVolumeScrubberKeyDown.rEvtContext(this));
  },{
    // Adjust the volume when the user drags on the volume control
    onVolumeScrubberMouseDown: function(event, scrubber){
      // event.preventDefault();
      _V_.blockTextSelection();
      this.currentScrubber = scrubber;
      this.setVolumeWithScrubber(event);
      _V_.addListener(document, "mousemove", this.onVolumeScrubberMouseMove.rEvtContext(this));
      _V_.addListener(document, "mouseup", this.onVolumeScrubberMouseUp.rEvtContext(this));
    },
    onVolumeScrubberMouseMove: function(event){ 
      this.setVolumeWithScrubber(event);
    },
    onVolumeScrubberMouseUp: function(event){
      this.setVolumeWithScrubber(event);
      _V_.unblockTextSelection();
      document.removeEventListener("mousemove", this.onVolumeScrubberMouseMove, false);
      document.removeEventListener("mouseup", this.onVolumeScrubberMouseUp, false);
    },
    setVolumeWithScrubber: function(event){
      var newVol = _V_.getRelativePosition(event.pageX, this.currentScrubber);
      this.volume(newVol);
    },
	onVolumeScrubberKeyDown: function(event){
		var diff = 0;
		switch(event.keyCode){
			case 32:
				if (this.paused()) {
				  this.play();
				} else {
				  this.pause();
				}
				break;
			case 40:
			case 37:
				event.preventDefault();
				// left/down arrow
				diff = -1/6;
				break;
			case 38:
			case 39:
				event.preventDefault();
				// up/right arrow
				diff =  1/6;
				break;
		}
		var newVol = Math.max(0,Math.min(this.volume()+diff, 1));
		this.volume(newVol);
		this.focusVideoReporterOnFocus(event);
  	}
  }
);

/* Subtitle Toggle Behaviors
================================================================================ */
VideoJS.player.newBehavior("subtitlesToggle", function(element){
    _V_.addListener(element, "click", this.onSubtitlesToggleClick.context(this));
	 _V_.addListener(element, "keydown", this.subtitlesOnKeyDown.context(this));
  },{
	 // When the user clicks on the subtitles button, update subtitles setting
    onSubtitlesToggleClick: function(event){
      if (!this.showSubtitles) {
        this.subtitlesOn();
      } else {
		  this.subtitlesOff();
      }
    },
	 subtitlesOnKeyDown: function(event){
		switch(event.keyCode){
			case 13:
			case 32:
				this.onSubtitlesToggleClick(event);
				break;
		}
	 }
  }
);
/* Fullscreen Toggle Behaviors
================================================================================ */
VideoJS.player.newBehavior("fullscreenToggle", function(element){
    _V_.addListener(element, "click", this.onFullscreenToggleClick.context(this));
	 _V_.addListener(element, "keydown", this.fullscreenOnKeyDown.context(this));
  },{
    // When the user clicks on the fullscreen button, update fullscreen setting
    onFullscreenToggleClick: function(event){
      if (!this.videoIsFullScreen) {
        this.enterFullScreen();
      } else {
        this.exitFullScreen();
      }
    },

    fullscreenOnWindowResize: function(event){ // Removeable
      this.positionControlBars();
    },
    // Create listener for esc key while in full screen mode
    fullscreenOnEscKey: function(event){ // Removeable
      if (event.keyCode == 27) {
        this.exitFullScreen();
      }
    },
	 fullscreenOnKeyDown: function(event){
		switch(event.keyCode){
			case 13:
			case 32:
				this.onFullscreenToggleClick(event);
				break;
		}
	 }
  }
);
/* Big Play Button Behaviors
================================================================================ */
VideoJS.player.newBehavior("bigPlayButton", function(element){
    if (!this.elements.bigPlayButtons) {
      this.elements.bigPlayButtons = [];
      this.onPlay(this.bigPlayButtonsOnPlay);
      this.onEnded(this.bigPlayButtonsOnEnded);
    }
    this.elements.bigPlayButtons.push(element);
    this.activateElement(element, "playButton");
  },{
    bigPlayButtonsOnPlay: function(event){ this.hideBigPlayButtons(); },
    bigPlayButtonsOnEnded: function(event){ this.showBigPlayButtons(); },
    showBigPlayButtons: function(){
      this.each(this.elements.bigPlayButtons, function(element){
        element.style.display = "block"; 
      });
    },
    hideBigPlayButtons: function(){
      this.each(this.elements.bigPlayButtons, function(element){
        element.style.display = "none"; 
      });
    }
  }
);
/* Spinner
================================================================================ */
VideoJS.player.newBehavior("spinner", function(element){
    if (!this.spinners) {
      this.spinners = [];
      _V_.addListener(this.video, "loadeddata", this.spinnersOnVideoLoadedData.context(this));
      _V_.addListener(this.video, "loadstart", this.spinnersOnVideoLoadStart.context(this));
      _V_.addListener(this.video, "seeking", this.spinnersOnVideoSeeking.context(this));
      _V_.addListener(this.video, "seeked", this.spinnersOnVideoSeeked.context(this));
      _V_.addListener(this.video, "canplay", this.spinnersOnVideoCanPlay.context(this));
      _V_.addListener(this.video, "canplaythrough", this.spinnersOnVideoCanPlayThrough.context(this));
      _V_.addListener(this.video, "waiting", this.spinnersOnVideoWaiting.context(this));
      _V_.addListener(this.video, "stalled", this.spinnersOnVideoStalled.context(this));
      _V_.addListener(this.video, "suspend", this.spinnersOnVideoSuspend.context(this));
      _V_.addListener(this.video, "playing", this.spinnersOnVideoPlaying.context(this));
      _V_.addListener(this.video, "timeupdate", this.spinnersOnVideoTimeUpdate.context(this));
    }
    this.spinners.push(element);
  },{
    showSpinners: function(){
      this.each(this.spinners, function(spinner){
        spinner.style.display = "block";
      });
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = setInterval(this.rotateSpinners.context(this), 100);
    },
    hideSpinners: function(){
      this.each(this.spinners, function(spinner){
        spinner.style.display = "none";
      });
      clearInterval(this.spinnerInterval);
    },
    spinnersRotated: 0,
    rotateSpinners: function(){
      this.each(this.spinners, function(spinner){
        // spinner.style.transform =       'scale(0.5) rotate('+this.spinnersRotated+'deg)';
        spinner.style.WebkitTransform = 'scale(0.5) rotate('+this.spinnersRotated+'deg)';
        spinner.style.MozTransform =    'scale(0.5) rotate('+this.spinnersRotated+'deg)';
      });
      if (this.spinnersRotated == 360) { this.spinnersRotated = 0; }
      this.spinnersRotated += 45;
    },
    spinnersOnVideoLoadedData: function(event){ this.hideSpinners(); },
    spinnersOnVideoLoadStart: function(event){ this.showSpinners(); },
    spinnersOnVideoSeeking: function(event){ /* this.showSpinners(); */ },
    spinnersOnVideoSeeked: function(event){ /* this.hideSpinners(); */ },
    spinnersOnVideoCanPlay: function(event){ /* this.hideSpinners(); */ },
    spinnersOnVideoCanPlayThrough: function(event){ this.hideSpinners(); },
    spinnersOnVideoWaiting: function(event){
      // Safari sometimes triggers waiting inappropriately
      // Like after video has played, any you play again.
      this.showSpinners();
    },
    spinnersOnVideoStalled: function(event){},
    spinnersOnVideoSuspend: function(event){},
    spinnersOnVideoPlaying: function(event){ this.hideSpinners(); },
    spinnersOnVideoTimeUpdate: function(event){
      // Safari sometimes calls waiting and doesn't recover
      if(this.spinner.style.display == "block") { this.hideSpinners(); }
    }
  }
);
/* Subtitles
================================================================================ */
VideoJS.player.newBehavior("subtitlesDisplay", function(element){
    if (!this.subtitleDisplays) { 
      this.subtitleDisplays = [];
      this.onCurrentTimeUpdate(this.subtitleDisplaysOnVideoTimeUpdate);
      this.onEnded(function() { this.lastSubtitleIndex = 0; }.context(this))
    }
    this.subtitleDisplays.push(element);
  },{
    subtitleDisplaysOnVideoTimeUpdate: function(time){
      // Assuming all subtitles are in order by time, and do not overlap
      if (this.subtitles) {
        // If current subtitle should stay showing, don't do anything. Otherwise, find new subtitle.
        if (!this.currentSubtitle || this.currentSubtitle.start >= time || this.currentSubtitle.end < time) {
          var newSubIndex = false,
              // Loop in reverse if lastSubtitle is after current time (optimization)
              // Meaning the user is scrubbing in reverse or rewinding
              reverse = (this.subtitles[this.lastSubtitleIndex].start > time),
              // If reverse, step back 1 becase we know it's not the lastSubtitle
              i = this.lastSubtitleIndex - (reverse) ? 1 : 0;
          while (true) { // Loop until broken
            if (reverse) { // Looping in reverse
              // Stop if no more, or this subtitle ends before the current time (no earlier subtitles should apply)
              if (i < 0 || this.subtitles[i].end < time) { break; }
              // End is greater than time, so if start is less, show this subtitle
              if (this.subtitles[i].start < time) {
                newSubIndex = i;
                break;
              }
              i--;
            } else { // Looping forward
              // Stop if no more, or this subtitle starts after time (no later subtitles should apply)
              if (i >= this.subtitles.length || this.subtitles[i].start > time) { break; }
              // Start is less than time, so if end is later, show this subtitle
              if (this.subtitles[i].end > time) {
                newSubIndex = i;
                break;
              }
              i++;
            }
          }

          // Set or clear current subtitle
          if (newSubIndex !== false) {
            this.currentSubtitle = this.subtitles[newSubIndex];
            this.lastSubtitleIndex = newSubIndex;
            this.updateSubtitleDisplays(this.currentSubtitle.text);
          } else if (this.currentSubtitle) {
            this.currentSubtitle = false;
            this.updateSubtitleDisplays("");
          }
        }
      }
    },
    updateSubtitleDisplays: function(val){
      this.each(this.subtitleDisplays, function(disp){
        disp.innerHTML = val;
      });
    }
  }
);

