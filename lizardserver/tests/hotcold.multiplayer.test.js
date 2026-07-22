const Match = require('../game');
const Player = require('../player');
const { TEMP_START } = require('../constants');

describe('multiplayer hot/cold regression', () => {
  test('server-authoritative thermal zones warm players in range', () => {
    const io = {
      to: jest.fn(() => ({ emit: jest.fn() }))
    };

    const playerA = new Player('uid-a', { id: 'socket-a' });
    const playerB = new Player('uid-b', { id: 'socket-b' });
    const match = new Match(io, [playerA, playerB]);

    match.zones = [{
      id: 1,
      type: 'sun',
      x: 0,
      w: 100,
      yTop: 0,
      yBot: 100,
      heatRate: 0.055
    }];

    playerA.lane = 0;
    playerA.temp = TEMP_START;
    const before = playerA.temp;

    match.tick();

    expect(playerA.temp).toBeGreaterThan(before);
  });
});
