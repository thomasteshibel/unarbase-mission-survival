const nasaImages = 'https://images.nasa.gov/details/';

export const VISUAL_ASSETS = Object.freeze({
  crewCommander: {
    path: 'assets/crew/commander.jpg',
    title: 'Jessica Meir · NASA astronaut',
    alt: 'NASA astronaut Jessica Meir wearing an astronaut spacesuit.',
    credit: 'NASA / Josh Valcarcel',
    sourceUrl: `${nasaImages}jsc2025e078605_alt`,
    context: 'Representative portrait only; this real astronaut is not the fictional LunarBase crew member.'
  },
  crewEngineer: {
    path: 'assets/crew/engineer.jpg',
    title: 'Jack Hathaway · NASA astronaut',
    alt: 'NASA astronaut Jack Hathaway in a NASA portrait.',
    credit: 'NASA / Josh Valcarcel',
    sourceUrl: `${nasaImages}jsc2025e068207_alt`,
    context: 'Representative portrait only; this real astronaut is not the fictional LunarBase crew member.'
  },
  crewMedical: {
    path: 'assets/crew/medical-officer.jpg',
    title: 'Jonny Kim · NASA astronaut',
    alt: 'NASA astronaut Jonny Kim in a NASA portrait.',
    credit: 'NASA / Josh Valcarcel',
    sourceUrl: `${nasaImages}jsc2024e052674_alt`,
    context: 'Representative portrait only; this real astronaut is not the fictional LunarBase crew member.'
  },
  crewScience: {
    path: 'assets/crew/science-officer.jpg',
    title: 'Luca Parmitano · ESA astronaut',
    alt: 'ESA astronaut Luca Parmitano wearing an extravehicular mobility suit.',
    credit: 'NASA / James Blair',
    sourceUrl: `${nasaImages}jsc2013e007948`,
    context: 'Representative portrait only; this real astronaut is not the fictional LunarBase crew member.'
  },
  apolloSurface: {
    path: 'assets/mission/apollo-17-surface.jpg',
    title: 'Apollo 17 lunar surface',
    alt: 'Apollo 17 astronaut conducting an extravehicular activity on the lunar surface beside equipment.',
    credit: 'NASA / Harrison H. Schmitt',
    sourceUrl: `${nasaImages}as17-134-20476`,
    context: 'Historical Apollo 17 photograph from 1972; not the fictional outpost or current mission.'
  },
  issCrewQuarters: {
    path: 'assets/mission/iss-crew-quarters.jpg',
    title: 'Crew quarters aboard the ISS',
    alt: 'Interior view of crew quarters where astronauts sleep aboard the International Space Station.',
    credit: 'NASA / Johnson Space Center',
    sourceUrl: `${nasaImages}iss054e022260`,
    context: 'ISS sleeping-area reference; not the LunarBase habitat interior or a lunar sleeping-quarters design.'
  },
  gateway: {
    path: 'assets/mission/gateway-configuration.jpg',
    title: 'Gateway lunar-orbit concept',
    alt: 'Artist rendering of the NASA Gateway station configuration in lunar orbit.',
    credit: 'NASA / Kennedy Space Center',
    sourceUrl: `${nasaImages}KSC-20240716-PH-NAS01_0002`,
    context: 'Conceptual lunar-orbit station rendering; Gateway is not a lunar surface habitat.'
  },
  earthrise: {
    path: 'assets/mission/lro-earthrise.jpg',
    title: 'Earthrise from lunar orbit',
    alt: 'Earth appearing above the lunar horizon, observed by the Lunar Reconnaissance Orbiter.',
    credit: 'NASA / Goddard Space Flight Center / Arizona State University',
    sourceUrl: `${nasaImages}GSFC_20171208_Archive_e000496`,
    context: 'Archived LRO image for mission context; not live mission telemetry.'
  },
  southPoleIllumination: {
    path: 'assets/mission/lunar-south-pole-illumination.jpg',
    title: 'South-pole illumination visualization',
    alt: 'NASA visualization of terrain and changing illumination near the lunar south pole.',
    credit: 'NASA Goddard Space Flight Center Scientific Visualization Studio',
    sourceUrl: 'https://svs.gsfc.nasa.gov/5027',
    context: 'Educational visualization based on LOLA terrain and JPL DE421 ephemeris; not a live forecast or this mission’s power input.'
  },
  eclssFlow: {
    path: 'assets/systems/iss-eclss-resource-flow.jpg',
    title: 'ISS environmental control and life support flow',
    alt: 'Diagram showing resource and air-flow relationships in the International Space Station life-support system.',
    credit: 'NASA / Marshall Space Flight Center',
    sourceUrl: `${nasaImages}0102167`,
    context: 'International Space Station reference diagram; not a lunar habitat design or simulation telemetry.'
  },
  waterRecoveryFlow: {
    path: 'assets/systems/iss-water-recovery-flow.jpg',
    title: 'ISS water recovery process',
    alt: 'Diagram of water recovery and processing equipment aboard the International Space Station.',
    credit: 'NASA / Marshall Space Flight Center',
    sourceUrl: `${nasaImages}0102168`,
    context: 'International Space Station reference diagram; it does not represent the simulator’s modeled recycler.'
  },
  waterRecoveryMaintenance: {
    path: 'assets/systems/iss-water-recovery-maintenance.jpg',
    title: 'ISS water recovery maintenance',
    alt: 'ESA astronaut Thomas Pesquet installing water recovery hardware aboard the International Space Station.',
    credit: 'ESA astronaut Thomas Pesquet / NASA',
    sourceUrl: `${nasaImages}iss065e333421`,
    context: 'ISS maintenance photograph; not a depiction of the simulated lunar equipment or event.'
  },
  oxygenMaintenance: {
    path: 'assets/systems/iss-oxygen-generator-maintenance.jpg',
    title: 'ISS oxygen generator maintenance',
    alt: 'Astronaut working on oxygen-generation equipment aboard the International Space Station.',
    credit: 'NASA / Johnson Space Center',
    sourceUrl: `${nasaImages}iss011e05517`,
    context: 'ISS maintenance photograph; not a depiction of the simulated lunar equipment or event.'
  },
  missionControl: {
    path: 'assets/systems/iss-flight-control-room.jpg',
    title: 'ISS flight control room',
    alt: 'International Space Station flight-control room at NASA Johnson Space Center.',
    credit: 'NASA / Robert Markowitz',
    sourceUrl: `${nasaImages}jsc2006e43863`,
    context: 'Earth-based ISS operations room photographed in 2006; not the LunarBase control room or a lunar habitat.'
  },
  solarRover: {
    path: 'assets/systems/cadre-rover-solar-array.jpg',
    title: 'CADRE solar-powered rover',
    alt: 'NASA/JPL CADRE rover prototype with solar arrays in a clean-room setting.',
    credit: 'NASA / JPL-Caltech',
    sourceUrl: `${nasaImages}PIA26169`,
    context: 'Technology illustration photographed on Earth; not a lunar deployment or the simulator’s power system.'
  },
  spaceFood: {
    path: 'assets/systems/iss-meal-packet.jpg',
    title: 'Packaged meal aboard the ISS',
    alt: 'NASA astronaut holding a packaged meal aboard the International Space Station.',
    credit: 'NASA / Johnson Space Center',
    sourceUrl: `${nasaImages}iss062e151565`,
    context: 'ISS meal example; the image does not define the simulator’s ration mass or nutrition assumptions.'
  }
});
