import heroImg from './assets/sprites/hero.png';
import heroRun1Img from './assets/sprites/hero_run1.png';
import heroRun2Img from './assets/sprites/hero_run2.png';
import heroAtkImg from './assets/sprites/hero_atk.png';
import patrolImg from './assets/sprites/patrol.png';
import patrolWalkImg from './assets/sprites/patrol_walk.png';
import stationaryImg from './assets/sprites/stationary.png';
import stationaryCastImg from './assets/sprites/stationary_cast.png';
import bossImg from './assets/sprites/boss.png';
import bossAltImg from './assets/sprites/boss_alt.png';
import wallImg from './assets/sprites/wall.png';
import spikeImg from './assets/sprites/spike.png';
import doorImg from './assets/sprites/door.png';
import floorImg from './assets/sprites/floor.png';
import spawnImg from './assets/sprites/spawn.png';
import platformImg from './assets/sprites/platform.png';
import potionImg from './assets/sprites/potion.png';
import gargoyleImg from './assets/sprites/gargoyle.png';
import slimeImg from './assets/sprites/slime.png';
import impImg from './assets/sprites/imp.png';
import skeletonKnightImg from './assets/sprites/skeleton_knight.png';
import heroWallslideImg from './assets/sprites/hero_wallslide.png';

function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export const SPRITES = {
  hero: loadImage(heroImg),
  heroRun1: loadImage(heroRun1Img),
  heroRun2: loadImage(heroRun2Img),
  heroAtk: loadImage(heroAtkImg),
  patrol: loadImage(patrolImg),
  patrolWalk: loadImage(patrolWalkImg),
  stationary: loadImage(stationaryImg),
  stationaryCast: loadImage(stationaryCastImg),
  boss: loadImage(bossImg),
  bossAlt: loadImage(bossAltImg),
  wall: loadImage(wallImg),
  spike: loadImage(spikeImg),
  door: loadImage(doorImg),
  floor: loadImage(floorImg),
  spawn: loadImage(spawnImg),
  platform: loadImage(platformImg),
  potion: loadImage(potionImg),
  gargoyle: loadImage(gargoyleImg),
  slime: loadImage(slimeImg),
  imp: loadImage(impImg),
  skeletonKnight: loadImage(skeletonKnightImg),
  heroWallslide: loadImage(heroWallslideImg),
};

// Animation frame sets for cycling
export const ANIM = {
  hero: {
    idle: [SPRITES.hero],
    run: [SPRITES.heroRun1, SPRITES.heroRun2],
    attack: [SPRITES.heroAtk],
    wallslide: [SPRITES.heroWallslide],
  },
  patrol: {
    idle: [SPRITES.patrol],
    walk: [SPRITES.patrol, SPRITES.patrolWalk],
  },
  stationary: {
    idle: [SPRITES.stationary],
    cast: [SPRITES.stationary, SPRITES.stationaryCast],
  },
  boss: {
    idle: [SPRITES.boss, SPRITES.bossAlt],
  },
};

// URL exports for CSS background-image usage in LevelEditor
export const SPRITE_URLS = {
  hero: heroImg,
  patrol: patrolImg,
  stationary: stationaryImg,
  boss: bossImg,
  wall: wallImg,
  spike: spikeImg,
  door: doorImg,
  floor: floorImg,
  spawn: spawnImg,
  platform: platformImg,
  potion: potionImg,
  gargoyle: gargoyleImg,
  slime: slimeImg,
  imp: impImg,
  skeletonKnight: skeletonKnightImg,
};
