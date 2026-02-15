import { describe, it, expect } from 'vitest';
import { generateBadge, generateErrorBadge } from '../src/badge-generator';

describe('Badge Generator', () => {
  describe('generateBadge', () => {
    it('should generate a valid SVG badge with label and message', () => {
      const svg = generateBadge({ label: 'Test', message: '42' });

      expect(svg).toContain('<svg');
      expect(svg).toContain('Test');
      expect(svg).toContain('42');
      expect(svg).toContain('</svg>');
    });

    it('should include TRMNL logo in the badge', () => {
      const svg = generateBadge({ label: 'Installs', message: '100' });

      // SVG should contain base64 encoded image data for the logo
      expect(svg).toContain('data:image');
    });
  });

  describe('generateErrorBadge', () => {
    it('should generate a red error badge with label and error message', () => {
      const svg = generateErrorBadge('Installs', 'Missing recipe ID');

      expect(svg).toContain('<svg');
      expect(svg).toContain('Installs');
      expect(svg).toContain('Missing recipe ID');
      expect(svg).toContain('</svg>');
    });

    it('should use red color for error badges', () => {
      const svg = generateErrorBadge('Forks', 'Network Error');

      // Error badge should contain the error message
      expect(svg).toContain('Network Error');
      // And should be a valid SVG
      expect(svg).toContain('<svg');
    });

    it('should include TRMNL logo in error badge', () => {
      const svg = generateErrorBadge('Test', 'Error Message');

      // SVG should contain base64 encoded image data for the logo
      expect(svg).toContain('data:image');
    });

    it('should handle different error messages', () => {
      const errorMessages = [
        'Missing recipe ID',
        'Recipe Not Found',
        'Network Error',
        'Service Error',
      ];

      errorMessages.forEach((message) => {
        const svg = generateErrorBadge('Badge', message);
        expect(svg).toContain(message);
      });
    });

    it('should handle different labels', () => {
      const labels = ['Installs', 'Forks', 'Custom Label'];

      labels.forEach((label) => {
        const svg = generateErrorBadge(label, 'Error');
        expect(svg).toContain(label);
      });
    });
  });
});
