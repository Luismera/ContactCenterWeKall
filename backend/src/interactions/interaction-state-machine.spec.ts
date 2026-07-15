import { isValidTransition } from './interaction-state-machine';

describe('isValidTransition', () => {
  it('allows the forward chain open -> in_progress -> resolved', () => {
    expect(isValidTransition('open', 'in_progress')).toBe(true);
    expect(isValidTransition('in_progress', 'resolved')).toBe(true);
  });

  it('rejects skipping a step (open -> resolved directly)', () => {
    expect(isValidTransition('open', 'resolved')).toBe(false);
  });

  it('rejects moving backwards', () => {
    expect(isValidTransition('in_progress', 'open')).toBe(false);
    expect(isValidTransition('resolved', 'in_progress')).toBe(false);
    expect(isValidTransition('resolved', 'open')).toBe(false);
  });

  it('rejects transitioning to the same status', () => {
    expect(isValidTransition('open', 'open')).toBe(false);
    expect(isValidTransition('resolved', 'resolved')).toBe(false);
  });
});
