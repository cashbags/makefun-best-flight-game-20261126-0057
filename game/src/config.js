// Emberwing Air — fixed world data: the archipelago, its five aircraft, its
// three weather fronts and its nine missions. Nothing here is random; the
// seeded layout in terrain.js places these islands, and missions.js runs these
// missions. Counts in the title come from this file: 12 islands, 5 aircraft,
// 3 fronts, 9 missions, 8 rings.
export const WORLD_SIZE = 6000;
export const WORLD_SEED = 20261126;
export const OCEAN_LEVEL = 0;
export const GRAVITY_PULL = 9.8;
export const FIXED_STEP = 1 / 60;

export const ISLANDS = [
  { name: 'Kalo', x: -2100, z: -1600, radius: 620, peak: 150, volcano: false, strip: true, stripHeading: 0.35 },
  { name: 'Tidepool', x: -900, z: -1900, radius: 430, peak: 90, volcano: false, strip: true, stripHeading: -0.5 },
  { name: 'Soot', x: 300, z: -2100, radius: 700, peak: 320, volcano: true, strip: false, stripHeading: 0 },
  { name: 'Marrow', x: 1500, z: -1500, radius: 480, peak: 120, volcano: false, strip: true, stripHeading: 1.1 },
  { name: 'Lantern', x: 2300, z: -400, radius: 380, peak: 70, volcano: false, strip: false, stripHeading: 0 },
  { name: 'Cinder', x: -1900, z: -200, radius: 540, peak: 210, volcano: true, strip: false, stripHeading: 0 },
  { name: 'Palmrest', x: -600, z: 200, radius: 460, peak: 80, volcano: false, strip: true, stripHeading: 0.9 },
  { name: 'Gullrock', x: 700, z: 500, radius: 340, peak: 60, volcano: false, strip: false, stripHeading: 0 },
  { name: 'Ember', x: 1900, z: 900, radius: 660, peak: 280, volcano: true, strip: false, stripHeading: 0 },
  { name: 'Saltpan', x: -1500, z: 1500, radius: 500, peak: 55, volcano: false, strip: false, stripHeading: 0 },
  { name: 'Tern', x: -200, z: 1700, radius: 420, peak: 95, volcano: false, strip: true, stripHeading: -1.2 },
  { name: 'Lastlight', x: 1200, z: 2100, radius: 580, peak: 140, volcano: false, strip: true, stripHeading: 0.15 },
];

// Five aircraft: a trainer, a short-strip specialist, a cargo hauler, a racer
// and a heavy lifter. Higher cruise speed costs fuel; lower stall speed forgives
// short strips; tougher frames forgive hard landings.
export const AIRCRAFT = [
  { id: 'kite', name: 'Kite', maker: 'Kite K-2 trainer', cruise: 62, maxSpeed: 85, stall: 26, climb: 7, burn: 0.55, toughness: 1.25, turn: 1.0, color: 0xe8a33d, trim: 0x2f6f6a, blurb: 'Forgiving trainer. Slow, steady, sips fuel.' },
  { id: 'gull', name: 'Gull', maker: 'Gull STOL-4', cruise: 58, maxSpeed: 80, stall: 19, climb: 8, burn: 0.6, toughness: 1.4, turn: 1.1, color: 0x3d7ea8, trim: 0xe8e4d8, blurb: 'Short-strip specialist. Lands where others cannot.' },
  { id: 'petrel', name: 'Petrel', maker: 'Petrel C-9 cargo', cruise: 70, maxSpeed: 95, stall: 32, climb: 6, burn: 0.8, toughness: 1.0, turn: 0.85, color: 0x7a4a3a, trim: 0xd8c98a, blurb: 'Cargo hauler. Carries the heavy loads, drinks fuel.' },
  { id: 'tern', name: 'Tern', maker: 'Tern R-1 racer', cruise: 88, maxSpeed: 118, stall: 34, climb: 9, burn: 1.05, toughness: 0.8, turn: 1.25, color: 0xc23b3b, trim: 0xf2e8d5, blurb: 'Ring-race rocket. Fast, thirsty, twitchy.' },
  { id: 'albatross', name: 'Albatross', maker: 'Albatross H-7 heavy', cruise: 66, maxSpeed: 88, stall: 30, climb: 5, burn: 0.9, toughness: 1.6, turn: 0.75, color: 0x4a5d3a, trim: 0xe8a33d, blurb: 'Heavy lifter. Shrugs off hard landings.' },
];

export const WEATHER_FRONTS = [
  { id: 'clear', name: 'Clear Trades', windSpeed: 3, gust: 1, fog: 0.00012, rain: 0, turbulence: 0.1, blurb: 'Calm trades, endless visibility.' },
  { id: 'trade', name: 'Trade Winds', windSpeed: 11, gust: 5, fog: 0.00025, rain: 0, turbulence: 0.5, blurb: 'Steady crosswind with sharp gusts.' },
  { id: 'storm', name: 'Storm Front', windSpeed: 19, gust: 10, fog: 0.0009, rain: 1, turbulence: 1.0, blurb: 'Rain, low cloud, air that shoves back.' },
];

// Times of day are legs, not ambience: dusk and night change what you can see.
export const TIMES_OF_DAY = {
  day: { sunElevation: 0.9, sunColor: 0xfff2d0, skyTop: 0x3f7ec2, skyBottom: 0xcfe8f2, ambient: 0.85, night: false },
  dusk: { sunElevation: 0.22, sunColor: 0xff9a4d, skyTop: 0x4a3a6e, skyBottom: 0xffb37a, ambient: 0.55, night: false },
  night: { sunElevation: -0.35, sunColor: 0x8fa8ff, skyTop: 0x0a1026, skyBottom: 0x1c2a4a, ambient: 0.3, night: true },
};

// Nine missions, each a different goal. `legs` are the waypoints in order;
// a leg is { island, altitude, action } where action is fly-over, land,
// pickup or ring-gate. Rewards are score; finishing all nine is the tour.
export const MISSIONS = [
  { id: 'first-hop', name: 'First Hop', kind: 'deliver', aircraft: 'kite', weather: 'clear', time: 'day', reward: 100, briefing: 'Carry the mail pouch from Kalo to Tidepool. Gentle first hop: land on the strip, nice and slow.', legs: [{ island: 'Tidepool', altitude: 40, action: 'land' }] },
  { id: 'medicine-run', name: 'Medicine Run', kind: 'deliver', aircraft: 'gull', weather: 'clear', time: 'dusk', reward: 160, briefing: 'Fever medicine for Marrow clinic, before dark. Marrow strip is short: come in slow, flaps of courage optional.', legs: [{ island: 'Marrow', altitude: 40, action: 'land' }] },
  { id: 'lighthouse-rescue', name: 'Lighthouse Rescue', kind: 'rescue', aircraft: 'gull', weather: 'trade', time: 'day', reward: 220, briefing: 'The Lantern keeper is stranded with a broken leg. Land on the beach flat, pick him up, bring him to Kalo.', legs: [{ island: 'Lantern', altitude: 25, action: 'pickup' }, { island: 'Kalo', altitude: 40, action: 'land' }] },
  { id: 'ring-rally', name: 'Ring Rally', kind: 'rings', aircraft: 'tern', weather: 'clear', time: 'day', reward: 300, briefing: 'Eight rings over the inner sea, in order, against the clock. Full throttle, clean lines, no shortcuts.', legs: [{ island: null, altitude: 120, action: 'rings' }] },
  { id: 'volcano-survey', name: 'Volcano Survey', kind: 'survey', aircraft: 'petrel', weather: 'trade', time: 'day', reward: 260, briefing: 'Photograph the craters of Soot, Cinder and Ember from 300 m, steady and level, then home to Palmrest.', legs: [{ island: 'Soot', altitude: 300, action: 'survey' }, { island: 'Cinder', altitude: 300, action: 'survey' }, { island: 'Ember', altitude: 300, action: 'survey' }, { island: 'Palmrest', altitude: 40, action: 'land' }] },
  { id: 'night-mail', name: 'Night Mail', kind: 'deliver', aircraft: 'kite', weather: 'clear', time: 'night', reward: 240, briefing: 'The night mail to Lastlight. Follow the runway lights; the sea is black and the instruments are your eyes.', legs: [{ island: 'Lastlight', altitude: 40, action: 'land' }] },
  { id: 'storm-crossing', name: 'Storm Crossing', kind: 'deliver', aircraft: 'albatross', weather: 'storm', time: 'dusk', reward: 320, briefing: 'Spare parts for the Tern strip, straight through the storm front. Hold your heading; the wind will try to steal it.', legs: [{ island: 'Tern', altitude: 40, action: 'land' }] },
  { id: 'fishermans-catch', name: "Fisherman's Catch", kind: 'deliver', aircraft: 'petrel', weather: 'trade', time: 'day', reward: 280, briefing: 'Ice-packed catch from Saltpan to Kalo, on half tanks. Throttle discipline pays: cruise, do not race.', legs: [{ island: 'Saltpan', altitude: 30, action: 'pickup' }, { island: 'Kalo', altitude: 40, action: 'land' }], fuelStart: 55 },
  { id: 'grand-tour', name: 'Grand Tour', kind: 'tour', aircraft: 'albatross', weather: 'trade', time: 'day', reward: 500, briefing: 'Every island in the Kaldera, in order, one sortie. Land at each strip, wave at the rest. The long way home.', legs: [{ island: 'Tidepool', altitude: 40, action: 'land' }, { island: 'Marrow', altitude: 40, action: 'land' }, { island: 'Palmrest', altitude: 40, action: 'land' }, { island: 'Tern', altitude: 40, action: 'land' }, { island: 'Lastlight', altitude: 40, action: 'land' }, { island: 'Kalo', altitude: 40, action: 'land' }] },
];

export const RING_COUNT = 8;
export const START_ISLAND = 'Kalo';
