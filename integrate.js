/*
 * Copyright 2017-2018  Andrew Stubbs <andrew.stubbs@gmail.com>
 * Copyright 2018 Simon Dierl <simon.dierl@cs.tu-dortmund.de>
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

'use strict'

/* global maestro */

;(function (Nuvola) {
// Translations
  const _ = Nuvola.Translate.gettext
  const C_ = Nuvola.Translate.pgettext

  const COUNTRY_VARIANT = 'app.country_variant'
  const HOME_PAGE = 'https://music.amazon.{1}/'
  const COUNTRY_VARIANTS = [
    ['de', C_('Amazon variant', 'Germany')],
    ['fr', C_('Amazon variant', 'France')],
    ['co.uk', C_('Amazon variant', 'United Kingdom')],
    ['com', C_('Amazon variant', 'United States')],
    ['it', C_('Amazon variant', 'Italy')],
    ['ca', C_('Amazon variant', 'Canada')],
    ['in', C_('Amazon variant', 'India')],
    ['com.br', C_('Amazon variant', 'Brazil')]
  ]

  const ACTION_THUMBS_UP = 'thumbs-up'
  const ACTION_THUMBS_DOWN = 'thumbs-down'

  // Create media player component
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  const WebApp = Nuvola.$WebApp()

  // Have we read the volume yet?
  WebApp.volumeKnown = false

  // Countdown number of "update" cycles before closing volume controls.
  WebApp.autoCloseVolume = 0

  // The repeat button is tristate, so we have to update it over multiple ticks
  WebApp.targetRepeat = -1

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)
    Nuvola.config.setDefaultAsync(COUNTRY_VARIANT, '').catch(console.log.bind(console))
    this.state = PlaybackState.UNKNOWN

    const state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // TODO: only set this after the user has logged in
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    const actions = [ACTION_THUMBS_UP, ACTION_THUMBS_DOWN]
    player.addExtraActions(actions)

    // Start update routine
    this.update()
  }

  WebApp._onInitializationForm = function (emitter, values, entries) {
    if (!Nuvola.config.hasKey(COUNTRY_VARIANT)) {
      this.appendPreferences(values, entries)
    }
  }

  WebApp.appendPreferences = function (values, entries) {
    values[COUNTRY_VARIANT] = Nuvola.config.get(COUNTRY_VARIANT)
    entries.push(['header', _('Amazon Cloud Player')])
    entries.push(['label', _('Preferred national variant')])
    for (let i = 0; i < COUNTRY_VARIANTS.length; i++) {
      entries.push(['option', COUNTRY_VARIANT, COUNTRY_VARIANTS[i][0], COUNTRY_VARIANTS[i][1]])
    }
  }

  WebApp._onInitAppRunner = function (emitter) {
    Nuvola.core.connect('InitializationForm', this)
    Nuvola.core.connect('PreferencesForm', this)

    Nuvola.actions.addAction('playback', 'win', ACTION_THUMBS_UP, C_('Action', 'Thumbs up'), null, null, null, true)
    Nuvola.actions.addAction('playback', 'win', ACTION_THUMBS_DOWN, C_('Action', 'Thumbs down'), null, null, null, true)
  }

  WebApp._onPreferencesForm = function (emitter, values, entries) {
    this.appendPreferences(values, entries)
  }

  WebApp._onHomePageRequest = function (emitter, result) {
    result.url = Nuvola.format(HOME_PAGE, Nuvola.config.get(COUNTRY_VARIANT))
  }

  // Extract data from the web page
  WebApp.update = function () {
    const track = {
      title: null,
      artist: null,
      album: null,
      artLocation: null,
      length: null
    }

    let elm
    let timeElapsed = null
    try {
      elm = document.querySelector('music-horizontal-item')
      track.title = elm ? elm.primaryText : null
      track.artist = elm ? elm.secondaryText : null
      track.artLocation = elm ? elm.imageSrc : null
      track.album = elm ? elm.secondaryText2 : null
      track.length = maestro.getDuration() * 1000000
      timeElapsed = maestro.getCurrentTime() * 1000000
    } catch (e) {
      // ~ console.log("Failed to get track info");
      // ~ console.log(e.message);
    }

    player.setTrack(track)

    const playButton = this._getPlayButton()
    const pauseButton = this._getPauseButton()
    if (pauseButton) {
      this.state = PlaybackState.PLAYING
    } else if (playButton) {
      this.state = PlaybackState.PAUSED
    } else {
      this.state = PlaybackState.UNKNOWN
    }

    player.setTrackPosition(timeElapsed)
    player.setCanSeek(this.state !== PlaybackState.UNKNOWN)

    elm = document.querySelector('#volume-range')
    if (elm) {
      player.updateVolume(elm.value)
      player.setCanChangeVolume(true)

      // Close volume control, if we opened it.
      if (!this.volumeKnown) {
        elm = this._getVolumeButton()
        if (elm) Nuvola.clickOnElement(elm)
        this.volumeKnown = true
      }
    } else if (!this.volumeKnown) {
      // Open volume control to read the setting.
      elm = this._getVolumeButton()
      if (elm) Nuvola.clickOnElement(elm)
    }
    if (this.autoCloseVolume > 0) {
      this.autoCloseVolume--
      if (this.autoCloseVolume === 0) {
        // Close volume slider now
        elm = this._getVolumeButton()
        if (elm) Nuvola.clickOnElement(elm)
      }
    }

    player.setPlaybackState(this.state)
    player.setCanPause(!!pauseButton)
    player.setCanPlay(!!playButton)
    player.setCanGoPrev(!!this._getPrevButton)
    player.setCanGoNext(!!this._getNextButton)

    try {
      const actionsEnabled = {}
      const actionsStates = {}

      elm = this._getThumbsUpButton()
      actionsEnabled[ACTION_THUMBS_UP] = !!elm
      actionsStates[ACTION_THUMBS_UP] = (elm ? elm.attributes.variant.value === 'accent' : false)

      elm = this._getThumbsDownButton()
      actionsEnabled[ACTION_THUMBS_DOWN] = !!elm
      actionsStates[ACTION_THUMBS_DOWN] = (elm ? elm.attributes.variant.value === 'accent' : false)

      elm = this._getShuffleButton()
      actionsEnabled[PlayerAction.SHUFFLE] = !!elm
      actionsStates[PlayerAction.SHUFFLE] = (elm ? elm.attributes.variant.value === 'accent' : false)

      elm = this._getRepeatButton()
      actionsEnabled[PlayerAction.REPEAT] = !!elm
      actionsStates[PlayerAction.REPEAT] = this._getRepeatState()
      if (this.targetRepeat > -1 &&
          actionsStates[PlayerAction.REPEAT] !== this.targetRepeat) {
        Nuvola.clickOnElement(elm)
      } else {
        this.targetRepeat = -1
      }

      Nuvola.actions.updateEnabledFlags(actionsEnabled)
      Nuvola.actions.updateStates(actionsStates)
    } catch (e) {}

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  WebApp._getButton = function (selector) {
    const elm = document.querySelector(selector)
    return elm
  }

  WebApp._getPlayButton = function () {
    // If there's a pause button then ignore other play buttons (other tracks)
    if (this._getPauseButton()) {
      return null
    }

    // We want the last play button on the page
    return this._getButton('#transport music-button[icon-name=play]')
  }

  WebApp._getPauseButton = function () {
    return this._getButton('#transport music-button[icon-name=pause]')
  }

  WebApp._getPrevButton = function () {
    return this._getButton('#transport music-button[icon-name=previous]')
  }

  WebApp._getNextButton = function () {
    return this._getButton('#transport music-button[icon-name=next]')
  }

  WebApp._getThumbsUpButton = function () {
    return this._getButton('#transport music-button[icon-name=like]')
  }

  WebApp._getThumbsDownButton = function () {
    return this._getButton('#transport music-button[icon-name=dislike]')
  }

  WebApp._getShuffleButton = function () {
    return this._getButton('#transport music-button[icon-name=shuffle]')
  }

  WebApp._getRepeatButton = function () {
    let elm = this._getButton('#transport music-button[icon-name=repeat]')
    if (!elm) {
      elm = this._getButton('#transport music-button[icon-name=repeatone]')
    }
    return elm
  }

  WebApp._getRepeatState = function () {
    const button = this._getRepeatButton()
    let state = Nuvola.PlayerRepeat.NONE
    if (button) {
      if (button.attributes['icon-name'].value === 'repeat' &&
          button.attributes.variant.value === 'accent') {
        state = Nuvola.PlayerRepeat.PLAYLIST
      } else if (button.attributes['icon-name'].value === 'repeatone') {
        state = Nuvola.PlayerRepeat.TRACK
      }
    }
    return state
  }

  WebApp._getVolumeButton = function () {
    return this._getButton('#transport music-button[icon-name=volumeon]')
  }

  WebApp._getVolumeSlider = function () {
    return this._getButton('#transport #volume-range')
  }

  WebApp._onActionActivated = function (emitter, name, param) {
    let button = null
    switch (name) {
    /* Base media player actions */
      case PlayerAction.TOGGLE_PLAY:
        button = this._getPauseButton()
        if (!button) button = this._getPlayButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.PLAY:
        button = this._getPlayButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        button = this._getPauseButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.PREV_SONG:
        button = this._getPrevButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.NEXT_SONG:
        button = this._getNextButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.SEEK:
        maestro.seekTo(param / 1000000.0)
        break
      case PlayerAction.CHANGE_VOLUME: {
        let control = this._getVolumeSlider()
        if (!control) {
          // Try opening the control, and try again.
          const elm = this._getVolumeButton()
          if (elm) Nuvola.clickOnElement(elm)
          control = this._getVolumeSlider()

          // Start the close count down
          this.autoCloseVolume = 1
        }
        if (control) {
          // Setting the volume control doesn't change the player
          // Setting the player doesn't move the visual control
          // ... so, set it both ways here.
          maestro.volume(param)
          control.value = param

          // Reset the close count down every time the volume changes
          if (this.autoCloseVolume > 0) this.autoCloseVolume = 5
        }
        break
      }
      case ACTION_THUMBS_UP:
        button = this._getThumbsUpButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case ACTION_THUMBS_DOWN:
        button = this._getThumbsDownButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.SHUFFLE:
        button = this._getShuffleButton()
        if (button) Nuvola.clickOnElement(button)
        break
      case PlayerAction.REPEAT:
        this.targetRepeat = param
        break
    }
  }

  WebApp.start()
})(this) // function(Nuvola)
