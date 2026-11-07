import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { configure, render, screen } from '@testing-library/react-native';
import { Skia } from '@shopify/react-native-skia';

import { skyScene } from '../../shared/domain/skyScene';
import { AnimatedSky } from '../../shared/ui/sky/AnimatedSky';
import { resetCloudEffect } from '../../shared/ui/sky/cloudShader';

// A bare render has no navigator to ask whether the tab is in view.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

// The whole sky is hidden from screen readers on purpose, so every query here
// has to look at hidden elements too.
configure({ defaultIncludeHiddenElements: true });

const at = (hours: number) => new Date(2026, 10, 7, hours).toISOString();
const sceneFor = (weatherCode: number, isDay = true, hours = 12) => skyScene({ weatherCode, isDay, observedAt: at(hours) });

const make = Skia.RuntimeEffect.Make as jest.Mock;

beforeEach(() => {
  resetCloudEffect();
  make.mockClear();
});

describe('AnimatedSky', () => {
  it('draws the cloud shader, and no rain or lightning, on a clear day', () => {
    render(<AnimatedSky scene={sceneFor(0)} />);
    expect(screen.getByTestId('sky-clouds')).toBeTruthy();
    expect(screen.queryByTestId('sky-rain')).toBeNull();
    expect(screen.queryByTestId('sky-lightning')).toBeNull();
  });

  it('adds rain for rain, and lightning only for a storm', () => {
    const { rerender } = render(<AnimatedSky scene={sceneFor(61)} />);
    expect(screen.getByTestId('sky-rain')).toBeTruthy();
    expect(screen.queryByTestId('sky-lightning')).toBeNull();

    rerender(<AnimatedSky scene={sceneFor(95)} />);
    expect(screen.getByTestId('sky-rain')).toBeTruthy();
    expect(screen.getByTestId('sky-lightning')).toBeTruthy();
  });

  it('falls back to a plain gradient when the shader does not compile', () => {
    make.mockReturnValueOnce(null);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<AnimatedSky scene={sceneFor(3)} />);
    expect(screen.getByTestId('sky-gradient')).toBeTruthy();
    expect(screen.queryByTestId('sky-clouds')).toBeNull();
    warn.mockRestore();
  });

  it('compiles the shader once, not on every render', () => {
    const { rerender } = render(<AnimatedSky scene={sceneFor(0)} />);
    rerender(<AnimatedSky scene={sceneFor(61)} />);
    render(<AnimatedSky scene={sceneFor(95)} />);
    expect(make).toHaveBeenCalledTimes(1);
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
    expect(screen.getByTestId('sky-clouds')).toBeTruthy();
  });
});
