import { render, screen } from '@testing-library/react';
import { DonutChart } from './DonutChart';

describe('DonutChart', () => {
  it('renders one segment per non-empty star bucket', () => {
    render(<DonutChart distribution={[0, 1, 1, 1, 1]} average={3.5} />);
    expect(screen.getAllByTestId('donut-segment')).toHaveLength(4);
  });

  it('shows the average rating in the center', () => {
    render(<DonutChart distribution={[0, 1, 1, 1, 1]} average={3.5} />);
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('renders the empty state when there are no votes', () => {
    render(<DonutChart distribution={[0, 0, 0, 0, 0]} average={0} />);
    expect(screen.getByText(/no votes/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId('donut-segment')).toHaveLength(0);
  });
});
