// The HUD: altitude, speed and heading tapes, fuel and damage gauges, the
// mission card, a compass strip, an artificial horizon, and banners. Every
// readout is lit (glowing amber on dark glass) so the instruments read as
// flown, day or night.
import { headingDegrees } from './aircraft.js';
import { missionObjectiveText } from './missions.js';

function setText(id, text) {
  const element = document.getElementById(id);
  if (element && element.textContent !== text) element.textContent = text;
}

function setWidth(id, percent) {
  const element = document.getElementById(id);
  if (element) element.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

export function createHud() {
  const horizon = document.getElementById('horizon');
  const horizonContext = horizon ? horizon.getContext('2d') : null;
  return {
    drawHorizon(roll, pitch) {
      if (!horizonContext) return;
      const width = horizon.width;
      const height = horizon.height;
      horizonContext.save();
      horizonContext.clearRect(0, 0, width, height);
      horizonContext.translate(width / 2, height / 2);
      horizonContext.rotate(-roll);
      const pitchOffset = pitch * 90;
      horizonContext.fillStyle = '#2f6fb0';
      horizonContext.fillRect(-width, -height + pitchOffset, width * 2, height);
      horizonContext.fillStyle = '#7a5a34';
      horizonContext.fillRect(-width, pitchOffset, width * 2, height);
      horizonContext.strokeStyle = '#f2e8d5';
      horizonContext.lineWidth = 2;
      horizonContext.beginPath();
      horizonContext.moveTo(-width, pitchOffset);
      horizonContext.lineTo(width, pitchOffset);
      horizonContext.stroke();
      horizonContext.restore();
      horizonContext.strokeStyle = '#ffb020';
      horizonContext.lineWidth = 2;
      horizonContext.beginPath();
      horizonContext.moveTo(width / 2 - 26, height / 2);
      horizonContext.lineTo(width / 2 - 8, height / 2);
      horizonContext.moveTo(width / 2 + 8, height / 2);
      horizonContext.lineTo(width / 2 + 26, height / 2);
      horizonContext.stroke();
      horizonContext.fillStyle = '#ffb020';
      horizonContext.beginPath();
      horizonContext.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
      horizonContext.fill();
    },
    updateFlight(aircraft, missionRun, weather, target) {
      const heading = headingDegrees(aircraft);
      setText('hud-alt', `${Math.max(0, Math.round(aircraft.y))} m`);
      setText('hud-spd', `${Math.round(aircraft.speed * 3.6)} km/h`);
      setText('hud-hdg', `${String(Math.round(heading)).padStart(3, '0')}°`);
      setText('hud-vsi', `${aircraft.verticalSpeed >= 0 ? '+' : ''}${aircraft.verticalSpeed.toFixed(1)} m/s`);
      setText('hud-thr', `${Math.round(aircraft.throttle * 100)}%`);
      setText('hud-fuel', `${Math.round(aircraft.fuel)}%`);
      setText('hud-dmg', `${Math.round(aircraft.damage)}%`);
      setWidth('fuel-bar', aircraft.fuel);
      setWidth('dmg-bar', aircraft.damage);
      const fuelBar = document.getElementById('fuel-bar');
      if (fuelBar) fuelBar.classList.toggle('low', aircraft.fuel < 25);
      const dmgBar = document.getElementById('dmg-bar');
      if (dmgBar) dmgBar.classList.toggle('bad', aircraft.damage > 60);
      setText('hud-weather', weather.front.name);
      setText('hud-wind', `${Math.round(Math.hypot(weather.wind.x, weather.wind.z) * 3.6)} km/h`);
      setText('hud-score', String(Math.round(missionRun.score)));
      setText('hud-mission', missionRun.mission.name);
      setText('hud-objective', missionRun.done ? 'Mission complete!' : missionObjectiveText(missionRun));
      if (target) {
        const dx = target.x - aircraft.x;
        const dz = target.z - aircraft.z;
        const dist = Math.hypot(dx, dz);
        const bearing = (Math.atan2(-dx, -dz) * 180) / Math.PI;
        let relative = bearing - heading;
        relative = ((relative + 540) % 360) - 180;
        const arrow = relative > 20 ? '↗' : relative < -20 ? '↖' : '↑';
        setText('hud-target', `${target.label} · ${(dist / 1000).toFixed(1)} km ${arrow}`);
      } else {
        setText('hud-target', '');
      }
      this.drawHorizon(aircraft.roll, aircraft.pitch);
      const gear = document.getElementById('hud-gear');
      if (gear) gear.textContent = aircraft.gearDown ? 'GEAR DOWN' : 'GEAR UP';
      const warn = document.getElementById('hud-warn');
      if (warn) {
        const warnings = [];
        if (aircraft.fuel < 25 && aircraft.fuel > 0) warnings.push('LOW FUEL');
        if (aircraft.fuel <= 0) warnings.push('FUEL EMPTY — GLIDING');
        if (aircraft.damage > 60) warnings.push('AIRFRAME DAMAGE');
        if (aircraft.speed < aircraft.spec.stall && !aircraft.onGround && aircraft.y > 10) warnings.push('STALL — NOSE DOWN, POWER UP');
        warn.textContent = warnings.join(' · ');
        warn.style.display = warnings.length ? 'block' : 'none';
      }
    },
    showBanner(text, subtext) {
      setText('banner-title', text);
      setText('banner-sub', subtext ?? '');
      const banner = document.getElementById('banner');
      if (banner) {
        banner.style.display = 'block';
        banner.classList.remove('fade');
        window.setTimeout(() => banner.classList.add('fade'), 2600);
      }
    },
    hideBanner() {
      const banner = document.getElementById('banner');
      if (banner) banner.style.display = 'none';
    },
    setCockpitMode(cockpit) {
      document.body.classList.toggle('cockpit', cockpit);
    },
  };
}
