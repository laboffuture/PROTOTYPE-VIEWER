import { render, screen, fireEvent } from '@testing-library/react';
import { ModelCarousel } from './ModelCarousel';

const models = [
  { _id: 'm1', name: 'Model One', sketchfabEmbedUrl: 'https://sketchfab.com/models/1/embed' },
  { _id: 'm2', name: 'Model Two', sketchfabEmbedUrl: 'https://sketchfab.com/models/2/embed' },
  { _id: 'm3', name: 'Model Three', sketchfabEmbedUrl: 'https://sketchfab.com/models/3/embed' },
];

describe('ModelCarousel', () => {
  it('shows first model name and progress 1 of 3', () => {
    render(<ModelCarousel models={models} ratings={{}} onRate={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('Model One')).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('shows Next button and no Previous on first model', () => {
    render(<ModelCarousel models={models} ratings={{}} onRate={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.queryByText('← Previous')).not.toBeInTheDocument();
  });

  it('navigates forward to second model on Next click', () => {
    render(<ModelCarousel models={models} ratings={{}} onRate={() => {}} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Model Two')).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    expect(screen.getByText('← Previous')).toBeInTheDocument();
  });

  it('navigates back to first model on Previous click', () => {
    render(<ModelCarousel models={models} ratings={{}} onRate={() => {}} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('← Previous'));
    expect(screen.getByText('Model One')).toBeInTheDocument();
  });

  it('shows Submit button on last model', () => {
    render(<ModelCarousel models={models} ratings={{}} onRate={() => {}} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Submit Ratings')).toBeInTheDocument();
    expect(screen.queryByText('Next →')).not.toBeInTheDocument();
  });

  it('Submit is disabled when last model not rated', () => {
    render(<ModelCarousel models={models} ratings={{}} onRate={() => {}} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Submit Ratings')).toBeDisabled();
  });

  it('Submit is enabled when last model is rated', () => {
    const ratings = { m3: 4 };
    render(<ModelCarousel models={models} ratings={ratings} onRate={() => {}} onSubmit={() => {}} />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Submit Ratings')).not.toBeDisabled();
  });

  it('calls onSubmit when Submit button clicked', () => {
    const onSubmit = vi.fn();
    const ratings = { m3: 5 };
    render(<ModelCarousel models={models} ratings={ratings} onRate={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Submit Ratings'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
