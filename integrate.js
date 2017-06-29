/*
 * Copyright 2015 Stephen Herbein <stephen272@gmail.com>
 * Copyright 2015 Steffen Coenen <steffen@steffen-coenen.de>
 * Copyright 2016 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

(function(Nuvola)
{

// Translations
var _ = Nuvola.Translate.gettext;
var C_ = Nuvola.Translate.pgettext;

var COUNTRY_VARIANT = "app.country_variant";
var HOME_PAGE = "https://music.amazon.{1}/";
var COUNTRY_VARIANTS = [
    ["de", C_("Amazon variant", "Germany")],
    ["fr", C_("Amazon variant", "France")],
    ["co.uk", C_("Amazon variant", "United Kingdom")],
    ["com", C_("Amazon variant", "United States")]
];

// Create media player component
var player = Nuvola.$object(Nuvola.MediaPlayer);

// Handy aliases
var PlaybackState = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;

// Create new WebApp prototype
var WebApp = Nuvola.$WebApp();

// Initialization routines
WebApp._onInitWebWorker = function(emitter)
{
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);
    Nuvola.config.setDefault(COUNTRY_VARIANT, "");
    this.state = PlaybackState.UNKNOWN;

    var state = document.readyState;
    if (state === "interactive" || state === "complete")
        this._onPageReady();
    else
        document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
}

// Page is ready for magic
WebApp._onPageReady = function()
{
    // TODO: only set this after the user has logged in
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);

    // Start update routine
    this.update();
}

WebApp._onInitializationForm = function(emitter, values, entries)
{
    if (!Nuvola.config.hasKey(COUNTRY_VARIANT))
        this.appendPreferences(values, entries);
}

WebApp.appendPreferences = function(values, entries)
{
    values[COUNTRY_VARIANT] = Nuvola.config.get(COUNTRY_VARIANT);
    entries.push(["header", _("Amazon Cloud Player")]);
    entries.push(["label", _("Preferred national variant")]);
    for (var i = 0; i < COUNTRY_VARIANTS.length; i++)
        entries.push(["option", COUNTRY_VARIANT, COUNTRY_VARIANTS[i][0], COUNTRY_VARIANTS[i][1]]);
}


WebApp._onInitAppRunner = function(emitter)
{
    Nuvola.core.connect("InitializationForm", this);
    Nuvola.core.connect("PreferencesForm", this);
}

WebApp._onPreferencesForm = function(emitter, values, entries)
{
    this.appendPreferences(values, entries);
}


WebApp._onHomePageRequest = function(emitter, result)
{
    result.url = Nuvola.format(HOME_PAGE, Nuvola.config.get(COUNTRY_VARIANT));
}

// Extract data from the web page
WebApp.update = function()
{
    var track = {
        title: null,
        artist: null,
        album: null,
        artLocation: null,
        length: null
    }

    var timeElapsed = null;
    try {
        var elm = document.querySelector("#dragonflyTransport .trackTitle");
        track.title = elm ? elm.textContent : null;
        elm = document.querySelector("#dragonflyTransport .trackArtist");
        track.artist = elm ? elm.textContent : null;
        elm = document.querySelector("#dragonflyTransport .trackAlbumArt img");
        track.artLocation = elm ? elm.src : null;
        elm = document.querySelector('tr.currentlyPlaying td.albumCell');
        track.album = elm ? elm.title : null;
        elm = document.querySelector('.timeRemaining');
        timeElapsed = document.querySelector('.timeElapsed');
        if (elm && timeElapsed) {
	    var time1 = elm.textContent.split(":")
	    var time2 = timeElapsed.textContent.split(":")
	    var secs = Number(time1[0])*60 + Number(time1[1]) + Number(time2[0])*60 + Number(time2[1]);
            track.length = Math.floor(secs/60).toString() + ":" + (secs%60);
	    timeElapsed = timeElapsed.textContent;
	}
    } catch (e) {
        //~ console.log("Failed to get track info");
        //~ console.log(e.message);
    }

    player.setTrack(track);

    var playButton = this._getPlayButton();
    var pauseButton = this._getPauseButton();
    if (pauseButton)
        this.state = PlaybackState.PLAYING;
    else if (playButton)
        this.state = PlaybackState.PAUSED;
    else
        this.state = PlaybackState.UNKNOWN;

    if (Nuvola.checkVersion && Nuvola.checkVersion(4, 4, 18)) { // @API 4.5
        player.setTrackPosition(timeElapsed);
        player.setCanSeek(this.state !== PlaybackState.UNKNOWN);
    }
    
    player.setPlaybackState(this.state);
    player.setCanPause(!!pauseButton);
    player.setCanPlay(!!playButton);
    player.setCanGoPrev(!!this._getPrevButton);
    player.setCanGoNext(!!this._getNextButton);
    
    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
}

WebApp._getButton = function(selector)
{
    var elm = document.querySelector(selector);
    return elm ? (elm.classList.contains("disabled") ? null : elm) : null;
}

WebApp._getPlayButton = function()
{
    return this._getButton(".playButton.playerIconPlay");
}

WebApp._getPauseButton = function()
{
    return this._getButton(".playButton.playerIconPause");
}

WebApp._getPrevButton = function()
{
    return this._getButton(".previousButton");
}

WebApp._getNextButton = function()
{
    return this._getButton(".nextButton");
}

WebApp._onActionActivated = function(emitter, name, param)
{
    switch (name) {
    /* Base media player actions */
    case PlayerAction.TOGGLE_PLAY:
        var button = this._getPauseButton();
        if (!button)
            button = this._getPlayButton(); 
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.PLAY:
        var button = this._getPlayButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.PAUSE:
    case PlayerAction.STOP:
        var button = this._getPauseButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.PREV_SONG:
        var button = this._getPrevButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.NEXT_SONG:
        var button = this._getNextButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.SEEK:  // @API 4.5: undefined & ignored in Nuvola < 4.5
        var timeRemaining = document.querySelector('.timeRemaining');
        var timeElapsed = document.querySelector('.timeElapsed');
        var total = Nuvola.parseTimeUsec(timeRemaining ? timeRemaining.textContent : null) 
		    + Nuvola.parseTimeUsec(timeElapsed ? timeElapsed.textContent : null);
        if (param > 0 && param <= total)
            Nuvola.clickOnElement(document.querySelector(".sliderTrack"), param/total, 0.5);
        break;
    }
}

WebApp.start();

})(this);  // function(Nuvola)
