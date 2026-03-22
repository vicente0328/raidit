import heroImg from './assets/sprites/hero.png';
import patrolImg from './assets/sprites/patrol.png';
import stationaryImg from './assets/sprites/stationary.png';
import bossImg from './assets/sprites/boss.png';
import wallImg from './assets/sprites/wall.png';
import spikeImg from './assets/sprites/spike.png';
import doorImg from './assets/sprites/door.png';
import floorImg from './assets/sprites/floor.png';
import spawnImg from './assets/sprites/spawn.png';

function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export const SPRITES = {
  hero: loadImage(heroImg),
  patrol: loadImage(patrolImg),
  stationary: loadImage(stationaryImg),
  boss: loadImage(bossImg),
  wall: loadImage(wallImg),
  spike: loadImage(spikeImg),
  door: loadImage(doorImg),
  floor: loadImage(floorImg),
  spawn: loadImage(spawnImg),
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
};
