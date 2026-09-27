/* 取景距離、閃燈計算、光線方向建議 — 純JS版，移植自framing.py/flash.py/lighting_direction.py。
   邏輯完全比照Python版(含所有假設常數)，只是搬到前端跑，不需要後端伺服器。
   sun.js的SUN.position()提供太陽方位角/仰角，這裡負責其餘的商業邏輯。
*/
const SENSOR_LONG_SIDE_MM = {
  "全片幅 (Full Frame)": 36.0,
  "APS-C (Canon)": 22.3,
  "APS-C (Nikon/Sony/Fuji)": 23.5,
  "M4/3 (Olympus/Panasonic)": 17.3,
};

const FRAMING_SUBJECT_HEIGHT_M = {
  "特寫 (頭肩)": 0.55,
  "半身 (腰部以上)": 1.05,
  "七分身 (膝蓋以上)": 1.45,
  "全身": 1.95,
};

const LIGHT_TYPE_THETA_DEG = {
  "逆光": 0,
  "側逆光": 45,
  "側光 (90度)": 90,
  "45度側光 (短光)": 135,
  "順光": 180,
};

function framingRecommend(focalMm, sensor, framingType) {
  const sensorMm = SENSOR_LONG_SIDE_MM[sensor];
  const subjectH = FRAMING_SUBJECT_HEIGHT_M[framingType];
  const distanceM = subjectH * focalMm / sensorMm;
  const longSide = sensorMm;
  const shortSide = longSide * (2 / 3);
  const fovDeg = 2 * Math.atan(shortSide / (2 * focalMm)) * (180 / Math.PI);
  return { distance_m: Math.round(distanceM * 100) / 100, horizontal_fov_deg: Math.round(fovDeg * 10) / 10 };
}

function flashDistance(gn, aperture, iso, power) {
  const effGn = gn * Math.sqrt(iso / 100) * Math.sqrt(power);
  return Math.round((effGn / aperture) * 100) / 100;
}

function flashPowerForDistance(gn, aperture, iso, targetDistanceM) {
  const requiredGn = targetDistanceM * aperture;
  const p = Math.pow(requiredGn / (gn * Math.sqrt(iso / 100)), 2);
  return Math.round(p * 10000) / 10000;
}

function powerFractionToStopsLabel(power) {
  if (power >= 1.0) return "1/1 (全出力，或已超出全出力範圍)";
  const stops = Math.max(0, Math.round(-Math.log2(power)));
  return `1/${2 ** stops}`;
}

function bearingLabel(bearingDeg) {
  const dirs = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
  const idx = Math.round(bearingDeg / 45) % 8;
  return `${dirs[idx]} (方位角${Math.round(bearingDeg)}度)`;
}

function recommendCameraBearing(lat, lon, lightType, when) {
  const sun = SUN.position(when || new Date(), lat, lon);
  const theta = LIGHT_TYPE_THETA_DEG[lightType];
  const bearingA = (sun.azimuthDeg + theta + 360) % 360;
  const bearingB = (sun.azimuthDeg - theta + 360) % 360;

  let warning = null;
  if (sun.elevationDeg < 0) {
    warning = "太陽已在地平線下(目前是夜晚/未升起)，方位角建議僅供參考，此時沒有方向性陽光可用";
  } else if (sun.elevationDeg > 70) {
    warning = "太陽仰角過高(接近正中午)，光線接近頂光，方位角對陰影方向的影響會變小，建議避開此時段拍攝";
  }

  return {
    sun_azimuth_deg: Math.round(sun.azimuthDeg * 10) / 10,
    sun_elevation_deg: Math.round(sun.elevationDeg * 10) / 10,
    camera_bearing_option_A: bearingLabel(bearingA),
    camera_bearing_option_B: bearingLabel(bearingB),
    bearing_a_deg: bearingA,
    warning,
  };
}
