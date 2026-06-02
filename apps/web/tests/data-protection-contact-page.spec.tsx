import { render, screen } from '@testing-library/react';
import { DataProtectionContactPage } from '../src/features/settings/DataProtectionContactPage';

describe('DataProtectionContactPage', () => {
  it('shows the contact email, rights, policy links and ICO complaint route', () => {
    render(<DataProtectionContactPage />);

    expect(screen.getByText('Data Protection Contact')).toBeInTheDocument();

    const email = screen.getByRole('link', { name: 'admin@clinvara.com' });
    expect(email).toHaveAttribute('href', 'mailto:admin@clinvara.com');

    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/legal/privacy',
    );
    expect(screen.getByRole('link', { name: 'Data Processing Agreement' })).toHaveAttribute(
      'href',
      '/legal/dpa',
    );
    expect(screen.getByRole('link', { name: 'ico.org.uk' })).toHaveAttribute(
      'href',
      'https://ico.org.uk',
    );

    expect(screen.getByText(/Access — a copy of the personal data/i)).toBeInTheDocument();
  });
});
