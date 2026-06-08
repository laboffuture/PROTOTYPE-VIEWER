import { render, screen } from '@testing-library/react';
import { RankingsTable } from './RankingsTable';

describe('RankingsTable', () => {
  it('shows "No votes yet." when results is empty', () => {
    render(<RankingsTable results={[]} />);
    expect(screen.getByText('No votes yet.')).toBeInTheDocument();
  });

  it('renders rank, name, average rating, and vote count', () => {
    const results = [
      { id: '1', name: 'Heat Seek Rover', averageRating: 4.7, voteCount: 24 },
      { id: '2', name: 'Catapult Glider', averageRating: 4.1, voteCount: 22 },
    ];
    render(<RankingsTable results={results} />);
    expect(screen.getByText('Heat Seek Rover')).toBeInTheDocument();
    expect(screen.getByText('★ 4.7')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});
