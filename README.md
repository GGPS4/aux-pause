# Quiet Button

**Live:** https://ggps4.github.io/aux-pause/

A one-button website for whoever is near my Echo Plus. If music starts playing late at night and nobody's home, anyone with the link can pause it. It does nothing else: no play, no skip, no volume.

## When the button works

The Pause button only turns on when all three are true:

1. **It's quiet hours**: between 10:30 PM and 7:15 AM, Eastern time. The time comes from the home's time zone, not the visitor's phone.
2. **Music is playing.** It can't start music, so nobody can use it to wake people up.
3. **It's playing on the Echo Plus.** Music on my phone, car or computer can't be paused from here.

The page shows a checklist of the three conditions so people can see why the button is grey. All three are checked again right before the pause is sent.

## Setup

There's nothing to set up. The Spotify keys are loaded from the main [aux-control](https://github.com/GGPS4/aux-control) site's `config.js`, so when that gets re-run every ~6 months this page keeps working too.

Change the times, time zone or speaker in `config.js`:

```js
"speakerName": "Echo Plus",
"quietStart": "22:30",
"quietEnd": "07:15",
"timeZone": "America/New_York"
```

## Notes

- The limits are enforced in the browser. They stop normal people, but someone who reads the source can get the same Spotify keys as aux-control. See the warning in that repo's README.
- To run it locally, serve the folder with any static server (`python3 -m http.server`).

```
index.html   the page and the button
app.js       the three checks and the pause call
style.css    styling
config.js    speaker name, quiet hours, time zone, where to load the Spotify keys from
```
