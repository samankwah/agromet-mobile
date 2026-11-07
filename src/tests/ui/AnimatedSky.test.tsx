import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { configure, render, screen } from '@testing-library/react-native';

import { skyScene } from '../../shared/domain/skyScene';
import { AnimatedSky } from '../../shared/ui/sky/AnimatedSky';

// A bare render has no navigator to ask whether the tab is in view.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

// The whole sky is hidden from screen readers on purpose, so every query here
// has to look at hidden elements too.
configure({ defaultIncludeHiddenElements: true });

const at = (hours: number) => new Date(2026, 10, 7, hours).toISOString();
const sceneFor = (weatherCode: number, isDay = true, hours = 12) => skyScene({ weatherCode, isDay, observedAt: at(hours) });

describe('AnimatedSky', () => {
  it('draws the sun, and no rain or lightning, on a clear day', () => {
    render(<AnimatedSky scene={sceneFor(0)} />);
    expect(screen.getByTestId('sky-sun')).toBeTruthy();
    expect(screen.queryByTestId('sky-rain')).toBeNull();
    expect(screen.queryByTestId('sky-lightning')).toBeNull();
    expect(screen.queryByTestId('sky-stars')).toBeNull();
  });

  it('draws rain for rain, and lightning only for a storm', () => {
    const { rerender } = render(<AnimatedSky scene={sceneFor(61)} />);
    expect(screen.getByTestId('sky-rain')).toBeTruthy();
    expect(screen.queryByTestId('sky-lightning')).toBeNull();

    rerender(<AnimatedSky scene={sceneFor(95)} />);
    expect(screen.getByTestId('sky-rain')).toBeTruthy();
    expect(screen.getByTestId('sky-lightning')).toBeTruthy();
  });

  it('draws stars on a clear night', () => {
    render(<AnimatedSky scene={sceneFor(0, false, 23)} />);
    expect(screen.getByTestId('sky-stars')).toBeTruthy();
    expect(screen.queryByTestId('sky-sun')).toBeNull();
  });

  it('is hidden from screen readers and from touch', () => {
    render(<AnimatedSky scene={sceneFor(95)} />);
    const sky = screen.getByTestId('animated-sky');
    expect(sky.props.pointerEvents).toBe('none');
    expect(sky.props.accessibilityElementsHidden).toBe(true);
  });

  it('still draws the whole scene when the phone asks for reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<AnimatedSky scene={sceneFor(95)} />);
    expect(await screen.findByTestId('sky-lightning')).toBeTruthy();
    expect(screen.getByTestId('sky-rain')).toBeTruthy();
  });
});
