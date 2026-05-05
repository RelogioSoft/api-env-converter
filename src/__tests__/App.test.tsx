import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App smoke tests', () => {
  it('renders the converter with default example input', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /credentialsconverter/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"name": "local"/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument();
  });

  it('loads the selected source example', () => {
    render(<App />);

    const [sourceSelect] = screen.getAllByRole('combobox');
    fireEvent.change(sourceSelect, { target: { value: 'bruno' } });

    expect(screen.getByDisplayValue(/vars \{/)).toBeInTheDocument();
    expect(screen.getByText(/Loaded Bruno example\./)).toBeInTheDocument();
  });

  it('converts the default Postman example to Bruno output automatically', async () => {
    const { container } = render(<App />);

    expect(await screen.findByText(/vars:secret/)).toBeInTheDocument();
    expect(container).toHaveTextContent('baseUrl: https://api.example.com');
    expect(container).toHaveTextContent('vars:secret');
  });

  it('shows a friendly validation error for invalid input automatically', async () => {
    render(<App />);

    const input = screen.getByDisplayValue(/"name": "local"/);
    fireEvent.change(input, { target: { value: '{' } });

    expect(
      await screen.findByText(/Postman environment must be valid JSON\./),
    ).toBeInTheDocument();
  });

  it('keeps copy and download disabled when output is empty', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
  });
});
