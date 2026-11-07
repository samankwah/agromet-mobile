import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { configure, render, screen } from '@testing-library/react-native';

import { skyScene, type CloudCover } from '../../shared/domain/skyScene';
import { AnimatedSky } from '../../shared/ui/sky/AnimatedSky';

// A bare render has no navigator to ask whether the tab is in view.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

// The whole sky is hidden from screen readers on purpose, so every query here
// has to look at hidden elements too.
configure({ defaultIncludeHiddenElements: true });

const at = (hours: number) => new Date(Date.UTC(2026, 10, 7, hours));
const sceneFor = (weatherCode: number, hours = 12, cloudCover?: CloudCover) =>
  skyScene({ weatherCode, at: at(hours), lat: 5.6037, lng: -0.187, cloudCover });

describe('AnimatedSky', () => {
  it('shows the painted sky the scene picks, with no rain or lightning on a clear day', () => {
    render(<AnimatedSky scene={sceneFor(0, 12, { total: 3, low: 3, mid: 0, high: 0 })} />);
    expect(screen.getByTestId('sky-clear-day')).toBeTruthy();
    expect(screen.queryByTestId('sky-rain')).toBeNull();
    expect(screen.queryByTestId('sky-lightning')).toBeNull();
  });

  it('shows the night painting after dark', () => {
    render(<AnimatedSky scene={sceneFor(0, 23, { total: 30, low: 30, mid: 0, high: 0 })} />);
    expect(screen.getByTestId('sky-partly-night')).toBeTruthy();
  });

  it('adds live rain for rain, and lightning only for a storm', () => {
    const { rerender } = render(<AnimatedSky scene={sceneFor(61)} />);
    expect(screen.getByTestId('sky-rain-day')).toBeTruthy();
    expect(screen.getByTestId('sky-rain')).toBeTruthy();
    expect(screen.queryByTestId('sky-lightning')).toBeNull();

    rerender(<AnimatedSky scene={sceneFor(95)} />);
    expect(screen.getByTestId('sky-storm-day')).toBeTruthy();
    expect(screen.getByTestId('sky-lightning')).toBeTruthy();
  });

  it('is hidden from screen readers and from touch', () => {
    render(<AnimatedSky scene={sceneFor(95)} />);
    const sky = screen.getByTestId('animated-sky');
    expect(sky.props.pointerEvents).toBe('none');
    expect(sky.props.accessibilityElementsHidden).toBe(true);
  });

  it('still shows the whole scene when the phone asks for reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<AnimatedSky scene={sceneFor(95)} />);
    expect(await screen.findByTestId('sky-lightning')).toBeTruthy();
    expect(screen.getByTestId('sky-storm-day')).toBeTruthy();
  });
});
