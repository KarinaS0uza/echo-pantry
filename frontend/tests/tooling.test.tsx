import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { View, Text } from 'react-native';
import { GluestackUIProvider, Button, ButtonText } from '@gluestack-ui/themed';
import { Circle } from 'lucide-react-native';

describe('web test runtime', () => {
  it('renders React Native through the web alias in jsdom', () => {
    render(<View><Text>Runtime probe</Text></View>);
    expect(screen.getByText('Runtime probe')).toBeVisible();
  });

  it('loads Gluestack and native SVG dependencies in the web runtime', () => {
    render(
      <GluestackUIProvider>
        <Button accessibilityLabel="Dependency probe">
          <ButtonText>Dependency probe</ButtonText>
          <Circle accessibilityLabel="Probe icon" />
        </Button>
      </GluestackUIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Dependency probe' })).toBeInTheDocument();
  });
});
