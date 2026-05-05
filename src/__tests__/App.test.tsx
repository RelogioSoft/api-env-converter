import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App smoke tests', () => {
  it('renders the converter with default example input', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /credentialsconverter/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"name": "local"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convert postman → bruno/i })).toBeInTheDocument();
  });

  it('loads the selected source example', () => {
    render(<App />);

    const [sourceSelect] = screen.getAllByRole('combobox');
    fireEvent.change(sourceSelect, { target: { value: 'bruno' } });

    expect(screen.getByDisplayValue(/vars \{/)).toBeInTheDocument();
    expect(screen.getByText(/Loaded Bruno example\./)).toBeInTheDocument();
  });

  it('converts the default Postman example to Bruno output', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: /convert postman → bruno/i }));

    expect(container).toHaveTextContent('baseUrl: https://api.example.com');
    expect(container).toHaveTextContent('vars:secret');
    expect(screen.getByText(/Converted successfully\./)).toBeInTheDocument();
  });

  it('shows a friendly validation error for invalid input', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByDisplayValue(/"name": "local"/);
    fireEvent.change(input, { target: { value: '{' } });
    await user.click(screen.getByRole('button', { name: /convert postman → bruno/i }));

    expect(screen.getByText(/Postman environment must be valid JSON\./)).toBeInTheDocument();
  });

  it('keeps copy and download disabled until output exists', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
  });
});
