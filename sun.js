/* 太陽方位角/仰角計算(純JS版，移植自Python的astral套件邏輯，不依賴任何外部函式庫)。
   演算法基礎：低精度太陽座標公式(Jean Meeus, Astronomical Algorithms)，跟suncalc.js
   用的是同一套，精度對拍照方向建議來說綽綽有餘(誤差通常在零點幾度內)。

   方位角採用標準羅盤慣例：0=正北，順時針增加(90=東，180=南，270=西)，
   跟lighting_direction.py(用astral)的輸出定義一致，已經拿同一組lat/lon/time
   互相驗證過數字對得上。
*/
const SUN = (() => {
  const RAD = Math.PI / 180;
  const DAY_MS = 1000 * 60 * 60 * 24;
  const J1970 = 2440588, J2000 = 2451545;
  const OBLIQUITY = RAD * 23.4397;

  function toJulian(date) { return date.valueOf() / DAY_MS - 0.5 + J1970; }
  function toDays(date) { return toJulian(date) - J2000; }

  function rightAscension(l, b) {
    return Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
  }
  function declination(l, b) {
    return Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
  }
  function siderealTime(d, lw) { return RAD * (280.16 + 360.9856235 * d) - lw; }
  function solarMeanAnomaly(d) { return RAD * (357.5291 + 0.98560028 * d); }
  function eclipticLongitude(M) {
    const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const P = RAD * 102.9372;
    return M + C + P + Math.PI;
  }
  function sunCoords(d) {
    const M = solarMeanAnomaly(d);
    const L = eclipticLongitude(M);
    return { dec: declination(L, 0), ra: rightAscension(L, 0) };
  }

  /** 回傳 {azimuthDeg, elevationDeg}，azimuthDeg：0=北，順時針。*/
  function position(date, lat, lon) {
    const lw = RAD * -lon;
    const phi = RAD * lat;
    const d = toDays(date);
    const c = sunCoords(d);
    const H = siderealTime(d, lw) - c.ra;

    const elevation = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
    // suncalc慣例的azimuth是「從南方起算，往西為正」，轉成標準「從北方起算，順時針」：
    // standardAzimuth = suncalcAzimuth + 180
    const suncalcAzimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi));
    let azimuthDeg = (suncalcAzimuth / RAD + 180) % 360;
    if (azimuthDeg < 0) azimuthDeg += 360;

    return { azimuthDeg, elevationDeg: elevation / RAD };
  }

  return { position };
})();

if (typeof module !== "undefined") module.exports = SUN;
