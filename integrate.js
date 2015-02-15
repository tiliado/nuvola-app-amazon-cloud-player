/*
 * Copyright 2014 Your name <your e-mail>
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

    this.state = PlaybackState.UNKNOWN;

    document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
}

// Page is ready for magic
WebApp._onPageReady = function()
{
    //TODO: only set this after the user has logged in
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);

    // Start update routine
    this.update();
}

// Extract data from the web page
WebApp.update = function()
{
    var track = {
        title: null,
        artist: null,
        album: null,
        artLocation: null
    }

    try
    {
        var songDetails = document.getElementsByClassName("currentSongDetails")[0];
        track.title = songDetails.getElementsByClassName("title")[0].innerText;
        track.artist = songDetails.getElementsByClassName("artistLink")[0].innerText;
    }
    catch (e)
    {
    }

    try
    {
        var albumImage = document.getElementsByClassName("albumImage")[0];
        track.artLocation = albumImage.src;
        if (track.album === null)
            track.album = albumImage.title;
    }
    catch (e)
    {
    }

    try
    {
        player.setTrack(track);
    }
    catch (e)
    {
    }

    this.state = PlaybackState.UNKNOWN;
    var prevSong, nextSong;
    try
    {
        var groupClassList = document.getElementsByClassName("mp3MasterPlayGroup")[0].classList;

        if (groupClassList.contains("playing")) {
            this.state = PlaybackState.PLAYING;
        } else if (groupClassList.contains("paused")) {
            this.state = PlaybackState.PAUSED;
        } 

        nextSong = groupClassList.contains("hasNext");
        prevSong = groupClassList.contains("hasPrevious");
    }
    catch (e)
    {
        prevSong = nextSong = false;
    }

    try
    {
        player.setPlaybackState(this.state);
        player.setCanPause(this.state === PlaybackState.PLAYING);
        player.setCanPlay(this.state === PlaybackState.PAUSED);
        player.setCanGoPrev(prevSong);
        player.setCanGoNext(nextSong);
    }
    catch (e)
    {
    }

    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
}

WebApp._onActionActivated = function(emitter, name, param)
{
    var playGroup = document.getElementsByClassName("mp3MasterPlayGroup")[0];
    if (playGroup)
    {
        var prev_song = playGroup.getElementsByClassName("mp3PlayPrevious")[0];
        var play_pause = playGroup.getElementsByClassName("mp3MasterPlay")[0];
        var next_song = playGroup.getElementsByClassName("mp3PlayNext")[0];
    }
    else
    {
        var prev_song = null;
        var play_pause = null;
        var next_song = null;
    }
    
    switch (name)
    {
    /* Base media player actions */
    case PlayerAction.TOGGLE_PLAY:
        if (play_pause)
            Nuvola.clickOnElement(play_pause);
        break;
    case PlayerAction.PLAY:
        if (this.state != PlaybackState.PLAYING && play_pause)
            Nuvola.clickOnElement(play_pause);
        break;
    case PlayerAction.PAUSE:
    case PlayerAction.STOP:
        if (this.state == PlaybackState.PLAYING && play_pause)
            Nuvola.clickOnElement(play_pause);
        break;
    case PlayerAction.PREV_SONG:
        if (prev_song)
            Nuvola.clickOnElement(prev_song);
        break;
    case PlayerAction.NEXT_SONG:
        if (next_song)
            Nuvola.clickOnElement(next_song);
        break;
    }
}

WebApp.start();

})(this);  // function(Nuvola)
