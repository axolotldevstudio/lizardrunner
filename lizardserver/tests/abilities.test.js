const Match = require('../game');
const Player = require('../player');

describe('ability mechanics', () => {
  test('sprint drains energy while active', () => {
    const player = new Player('uid-sprint', { id: 'socket-sprint' });
    player.energy = 10;
    player.sprinting = true;

    player.tick();

    expect(player.energy).toBeLessThan(10);
    expect(player.sprinting).toBe(true);
  });

  test('push moves an opponent one lane and enters cooldown', () => {
    const io = {
      to: jest.fn(() => ({ emit: jest.fn() }))
    };
    const playerA = new Player('uid-push-a', { id: 'socket-a' });
    const playerB = new Player('uid-push-b', { id: 'socket-b' });
    const match = new Match(io, [playerA, playerB]);

    playerA.lane = 1;
    playerB.lane = 2;
    playerA.pushCooldown = 0;
    playerA.energy = 20;
    const originalRandom = Math.random;
    Math.random = () => 0.1;

    const result = playerA.applyInput({ type: 'push' });
    match.applyPush(playerA);

    Math.random = originalRandom;

    expect(result).toBe('push');
    expect(playerB.lane).toBe(1);
    expect(playerA.pushCooldown).toBeGreaterThan(0);
  });
});
