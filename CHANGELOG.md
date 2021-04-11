Changelog
=========

5.12 - April 11th, 2021
-----------------------

  * Add Japanese region support. Issue: tiliado/nuvola-app-amazon-cloud-player#46

5.11 - November 28th, 2020
--------------------------

  * Update integration following Amazon Music redesign. Issue: tiliado/nuvolaplayer#656

5.10 - September 28, 2020
-------------------------

  * Add Canadian, Indian and Brazilian region support.
  * Play action now will press "second" play button when button in header is disabled.

5.9 - February 24th, 2019
-------------------------

  * Switch from Flash to Widevine. Issue: tiliado/nuvola-app-amazon-cloud-player#33, tiliado/nuvolaruntime#497

5.8 - October 14th, 2018
------------------------

  * Nuvola 4.13 is required.
  * Add Italian region support.
  * A dark theme variant is used by default.
  * Add playlist repeat integration.
  * Add playlist shuffle integration.

5.7 - May 8th, 2018
-------------------

  * The Chromium-based backend is required to achieve audio playback without Flash plugin
    (when possible, e.g. in your own music library) or better stability of Flash plugin (for Amazon Prime streaming).
    Issue: tiliado/nuvola-app-amazon-cloud-player#34, tiliado/nuvolaruntime#354

5.6 - February 16th, 2017
-------------------------

  * Update album name extraction.
  * Update for Nuvola 4.9 API & Chromium.
  * Add actions for thumbs up and down.

5.5 - September 28th, 2017
-----------------------

  * Added track position reporting and seeking (Nuvola 4.5+ only).
  * Added volume control integration (Nuvola 4.5+ only).

5.4 - April 20th, 2017
----------------------

  * New maintainer: Andrew Stubbs
  * Fix login on Nuvola 3.1. Issue: tiliado/nuvola-app-amazon-cloud-player#20

5.3 - February 12th, 2017
-------------------------

  * Ported to Nuvola SDK.

5.2 - October 22, 2016
----------------------

  * New maintainer: Jiří Janoušek.
  * Added a complete icon set.
  * Added a license field to metadata.json.
  * Script now doesn't assume that it is always executed before a basic structure of a web page is
    loaded. This isn't guaranteed and it leads to an incompatibility with Nuvola Player 3.0.3.
  * Added information about contributing to the script.
  * Adapted to the change of Amazon Music address. Issue: tiliado/nuvola-app-amazon-cloud-player#13
  * Track info parsing has been fixed. Issue: tiliado/nuvola-app-amazon-cloud-player#17
