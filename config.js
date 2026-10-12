// Settings for the quiet button.
window.PAUSE_CONFIG = {
  // Spotify keys are read from the main aux-control site, so there's only one place to
  // update them when you re-run setup.html every ~6 months.
  "auxConfigUrl": "https://ggps4.github.io/aux-control/config.js",

  // The pause button only works on this speaker...
  "speakerName": "Echo Plus",
  // ...and only between these times (24-hour clock, in this time zone). The window can cross midnight.
  "quietStart": "22:30",
  "quietEnd": "07:15",
  "timeZone": "America/New_York"
};
