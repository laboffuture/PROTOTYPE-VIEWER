import { loadRatings, saveRatings, clearRatings } from './ratingsStore';

beforeEach(() => localStorage.clear());

describe('ratingsStore', () => {
  it('saves and loads a ratings map', () => {
    saveRatings('s1', { m1: 4, m2: 2 });
    expect(loadRatings('s1')).toEqual({ m1: 4, m2: 2 });
  });

  it('returns an empty object when nothing is saved', () => {
    expect(loadRatings('missing')).toEqual({});
  });

  it('drops ratings for models no longer in the batch', () => {
    saveRatings('s1', { m1: 5, gone: 3, m2: 1 });
    expect(loadRatings('s1', ['m1', 'm2'])).toEqual({ m1: 5, m2: 1 });
  });

  it('clears saved ratings', () => {
    saveRatings('s1', { m1: 4 });
    clearRatings('s1');
    expect(loadRatings('s1')).toEqual({});
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('ratings_s1', '{not json');
    expect(loadRatings('s1')).toEqual({});
  });
});
