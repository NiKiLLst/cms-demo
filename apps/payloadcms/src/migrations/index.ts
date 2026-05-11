import * as migration_20260511_102848_initial from './20260511_102848_initial';

export const migrations = [
  {
    up: migration_20260511_102848_initial.up,
    down: migration_20260511_102848_initial.down,
    name: '20260511_102848_initial'
  },
];
