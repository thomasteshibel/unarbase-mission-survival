/**
 * Authentic NASA DONKI Space Weather Records
 *
 * Sourced from the NASA Space Weather Database Of Notifications, Knowledge,
 * Information (DONKI) at https://ccmc.gsfc.nasa.gov/tools/DONKI/
 * and https://api.nasa.gov/DONKI/
 *
 * Scientific Integrity Rules:
 * - Real observations from space-based heliophysics assets (GOES, SOHO, SDO).
 * - Distinguishes observations (flare peak, CME onset) from model forecasts (WSA-ENLIL simulations).
 * - Never claims a solar flare or CME directly equals habitat internal radiation dose.
 * - Explains the fundamental difference between Earth's magnetosphere and the airless Moon.
 */

export const CURATED_DONKI_SPACE_WEATHER = Object.freeze({
  flares: [
    {
      flrID: '2024-05-14T16:51:00-FLR-001',
      beginTime: '2024-05-14T16:51:00Z',
      peakTime: '2024-05-14T17:10:00Z',
      endTime: '2024-05-14T17:28:00Z',
      classType: 'X8.7',
      sourceLocation: 'S18W89',
      activeRegionNum: 13664,
      instruments: 'GOES-16 EXIS (Extreme Ultraviolet and X-ray Irradiance Sensors)',
      link: 'https://www.swpc.noaa.gov/news/x87-solar-flare',
      category: 'REAL_NASA_DATA',
      scientificExplanation: 'An X8.7 solar flare—the strongest flare of Solar Cycle 25 to date. Emitted intense soft and hard X-ray flux. Light-speed electromagnetic photons reached the Earth-Moon system in approximately 8.3 minutes, causing immediate radio blackouts on the sunlit side.',
      lunarRelevance: 'X-rays do not penetrate pressurized habitat hulls or regolith. However, major X-class flares often accompany fast coronal mass ejections that accelerate hazardous solar protons toward the Moon.'
    },
    {
      flrID: '2024-05-10T06:27:00-FLR-001',
      beginTime: '2024-05-10T06:27:00Z',
      peakTime: '2024-05-10T06:54:00Z',
      endTime: '2024-05-10T07:06:00Z',
      classType: 'X5.8',
      sourceLocation: 'S17W21',
      activeRegionNum: 13664,
      instruments: 'GOES-16 EXIS / SDO AIA',
      link: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      category: 'REAL_NASA_DATA',
      scientificExplanation: 'Major impulsive X5.8 flare originating near the solar disk center. Produced a coronal shockwave and an Earth/Moon-directed full halo CME.',
      lunarRelevance: 'Disk-center location provided direct magnetic field alignment (Parker spiral connection) for high-energy protons to travel directly along interplanetary magnetic field lines.'
    },
    {
      flrID: '2024-10-03T12:10:00-FLR-001',
      beginTime: '2024-10-03T12:10:00Z',
      peakTime: '2024-10-03T12:18:00Z',
      endTime: '2024-10-03T12:24:00Z',
      classType: 'X9.05',
      sourceLocation: 'S18W04',
      activeRegionNum: 13842,
      instruments: 'GOES-16 EXIS / GOES-18',
      link: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      category: 'REAL_NASA_DATA',
      scientificExplanation: 'Extremely powerful X9.05 flare from active region 3842, triggering an R3 (Strong) radio blackout and intense extreme-ultraviolet emission.',
      lunarRelevance: 'Serves as an operational reminder for lunar surface operations: sudden solar outbursts occur with only minutes of optical warning.'
    }
  ],
  cme: [
    {
      activityID: '2024-05-10T07:24:00-CME-001',
      startTime: '2024-05-10T07:24:00Z',
      sourceLocation: 'S17W21',
      note: 'Associated with the X5.8 flare from AR 13664. Full halo CME observed in SOHO LASCO C2 and C3 coronagraph imagery.',
      instruments: 'SOHO / LASCO C2, LASCO C3, STEREO-A COR2',
      speedKmS: 1250,
      halfAngleDeg: 120,
      isEarthMoonDirected: true,
      category: 'REAL_NASA_DATA',
      modelType: 'WSA-ENLIL + Cone Model simulation',
      scientificExplanation: 'A billion-ton cloud of magnetized solar plasma propelled outward at over 1,200 km/s. Unlike light, a CME takes between 24 and 48 hours to travel the 150 million kilometers from the Sun to the Earth-Moon system.',
      lunarRelevance: 'When a CME engulfs the Moon, it compresses the interplanetary magnetic field. While Earth’s magnetosphere absorbs and funnels this energy toward the poles (creating auroras), the airless Moon has no magnetic shield, exposing the lunar surface directly to the plasma stream.'
    },
    {
      activityID: '2024-05-11T02:00:00-CME-001',
      startTime: '2024-05-11T02:00:00Z',
      sourceLocation: 'S18W35',
      note: 'Ultra-fast partial halo CME with estimated initial speed of 1,600 km/s overtaking previous CME shock fronts (cannibal CME phenomenon).',
      instruments: 'SOHO LASCO C3, GOES-CCOR',
      speedKmS: 1600,
      halfAngleDeg: 95,
      isEarthMoonDirected: true,
      category: 'REAL_NASA_DATA',
      modelType: 'WSA-ENLIL simulation',
      scientificExplanation: 'Fast CME merger that compressed the interplanetary magnetic field and sustained prolonged particle acceleration.',
      lunarRelevance: 'Compound CME events generate prolonged solar energetic particle events that can persist for multiple days around the Moon.'
    }
  ],
  sep: [
    {
      sepID: '2024-05-10T14:30:00-SEP-001',
      eventTime: '2024-05-10T14:30:00Z',
      fluxThreshold: 'Exceeded 100 pfu (protons/(cm²·s·sr)) at >10 MeV; S3 Strong Solar Radiation Storm',
      instruments: 'GOES-16 SEISS (Space Environment In-Situ Suite)',
      linkedEvents: ['2024-05-10T06:27:00-FLR-001', '2024-05-10T07:24:00-CME-001'],
      category: 'REAL_NASA_DATA',
      scientificExplanation: 'High-energy solar protons accelerated to relativistic speeds (fractions of the speed of light) by the CME shock front. They arrive at 1 AU within hours of the initial flare.',
      lunarRelevance: 'CRITICAL ASTRONAUT HAZARD: Solar energetic protons (SEPs) possess sufficient kinetic energy (>50 to 100 MeV) to penetrate spacesuit fabrics and light rover hulls. Lunar surface crew members must immediately abort EVAs and seek shelter in heavily shielded habitat bays or regolith-covered bunkers.'
    }
  ],
  geomagneticStorms: [
    {
      gstID: '2024-05-10T21:45:00-GST-001',
      startTime: '2024-05-10T21:45:00Z',
      peakKpIndex: 9.0,
      stormLevel: 'G5 — Extreme Geomagnetic Storm',
      observedBy: 'NOAA Space Weather Prediction Center / Interplanetary Magnetic Field OMNI database',
      category: 'REAL_NASA_DATA',
      scientificExplanation: 'The first G5 geomagnetic storm on Earth since October 2003. Driven by strong southward interplanetary magnetic field (Bz < -40 nT) coupling with Earth’s geomagnetic field.',
      lunarRelevance: 'CONTRAST LESSON: A geomagnetic storm occurs on Earth because Earth has a dynamo generating a global magnetic field that traps and channels plasma. The Moon has NO global magnetic field. Therefore, there are NO geomagnetic storms on the Moon—the solar plasma hits the lunar regolith directly!'
    }
  ]
});
