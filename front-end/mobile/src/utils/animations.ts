import { useRef, useCallback } from 'react';
import { Animated, Easing, Platform } from 'react-native';

// Animation presets
export const AnimationPresets = {
  // Entrance animations
  fadeIn: {
    duration: 300,
    easing: Easing.out(Easing.ease),
  },
  slideInFromRight: {
    duration: 300,
    easing: Easing.out(Easing.back(1.2)),
  },
  slideInFromBottom: {
    duration: 400,
    easing: Easing.out(Easing.back(1)),
  },
  scaleIn: {
    duration: 250,
    easing: Easing.out(Easing.back(1.5)),
  },

  // Exit animations
  fadeOut: {
    duration: 200,
    easing: Easing.in(Easing.ease),
  },
  slideOutToRight: {
    duration: 250,
    easing: Easing.in(Easing.back(1)),
  },
  scaleOut: {
    duration: 200,
    easing: Easing.in(Easing.ease),
  },

  // Interactive animations
  spring: {
    tension: 300,
    friction: 8,
  },
  bounce: {
    tension: 180,
    friction: 12,
  },

  // Platform-specific animations
  platform: Platform.select({
    ios: {
      duration: 300,
      easing: Easing.out(Easing.ease),
    },
    android: {
      duration: 250,
      easing: Easing.out(Easing.ease),
    },
    default: {
      duration: 300,
      easing: Easing.out(Easing.ease),
    },
  }),
};

// Fade animation hook
export function useFadeAnimation(initialValue = 0) {
  const opacity = useRef(new Animated.Value(initialValue)).current;

  const fadeIn = useCallback((config = AnimationPresets.fadeIn) => {
    return Animated.timing(opacity, {
      toValue: 1,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [opacity]);

  const fadeOut = useCallback((config = AnimationPresets.fadeOut) => {
    return Animated.timing(opacity, {
      toValue: 0,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [opacity]);

  const fadeToValue = useCallback((toValue: number, config = AnimationPresets.fadeIn) => {
    return Animated.timing(opacity, {
      toValue,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [opacity]);

  return {
    opacity,
    fadeIn,
    fadeOut,
    fadeToValue,
    animatedStyle: { opacity },
  };
}

// Scale animation hook
export function useScaleAnimation(initialValue = 1) {
  const scale = useRef(new Animated.Value(initialValue)).current;

  const scaleIn = useCallback((config = AnimationPresets.scaleIn) => {
    return Animated.timing(scale, {
      toValue: 1,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [scale]);

  const scaleOut = useCallback((config = AnimationPresets.scaleOut) => {
    return Animated.timing(scale, {
      toValue: 0,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [scale]);

  const scaleTo = useCallback((toValue: number, config = AnimationPresets.scaleIn) => {
    return Animated.timing(scale, {
      toValue,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [scale]);

  const press = useCallback(() => {
    return Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);
  }, [scale]);

  return {
    scale,
    scaleIn,
    scaleOut,
    scaleTo,
    press,
    animatedStyle: { transform: [{ scale }] },
  };
}

// Slide animation hook
export function useSlideAnimation(initialValue = 0) {
  const translateX = useRef(new Animated.Value(initialValue)).current;
  const translateY = useRef(new Animated.Value(initialValue)).current;

  const slideInFromRight = useCallback((distance = 300, config = AnimationPresets.slideInFromRight) => {
    translateX.setValue(distance);
    return Animated.timing(translateX, {
      toValue: 0,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [translateX]);

  const slideInFromLeft = useCallback((distance = -300, config = AnimationPresets.slideInFromRight) => {
    translateX.setValue(distance);
    return Animated.timing(translateX, {
      toValue: 0,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [translateX]);

  const slideInFromBottom = useCallback((distance = 300, config = AnimationPresets.slideInFromBottom) => {
    translateY.setValue(distance);
    return Animated.timing(translateY, {
      toValue: 0,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [translateY]);

  const slideOutToRight = useCallback((distance = 300, config = AnimationPresets.slideOutToRight) => {
    return Animated.timing(translateX, {
      toValue: distance,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [translateX]);

  return {
    translateX,
    translateY,
    slideInFromRight,
    slideInFromLeft,
    slideInFromBottom,
    slideOutToRight,
    animatedStyle: { transform: [{ translateX }, { translateY }] },
  };
}

// Spring animation hook
export function useSpringAnimation(initialValue = 0) {
  const value = useRef(new Animated.Value(initialValue)).current;

  const spring = useCallback((toValue: number, config = AnimationPresets.spring) => {
    return Animated.spring(value, {
      toValue,
      tension: config.tension,
      friction: config.friction,
      useNativeDriver: true,
    });
  }, [value]);

  const bounce = useCallback((toValue: number, config = AnimationPresets.bounce) => {
    return Animated.spring(value, {
      toValue,
      tension: config.tension,
      friction: config.friction,
      useNativeDriver: true,
    });
  }, [value]);

  return {
    value,
    spring,
    bounce,
  };
}

// Rotation animation hook
export function useRotationAnimation(initialValue = 0) {
  const rotation = useRef(new Animated.Value(initialValue)).current;

  const rotate = useCallback((toValue: number, config = AnimationPresets.fadeIn) => {
    return Animated.timing(rotation, {
      toValue,
      duration: config.duration,
      easing: config.easing,
      useNativeDriver: true,
    });
  }, [rotation]);

  const spin = useCallback((duration = 1000) => {
    return Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
  }, [rotation]);

  const animatedStyle = {
    transform: [{
      rotate: rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    }],
  };

  return {
    rotation,
    rotate,
    spin,
    animatedStyle,
  };
}

// Combined entrance animation
export function useEntranceAnimation() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  const enter = useCallback((config = AnimationPresets.scaleIn) => {
    return Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: true,
      }),
    ]);
  }, [opacity, scale, translateY]);

  const exit = useCallback((config = AnimationPresets.scaleOut) => {
    return Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 30,
        duration: config.duration,
        easing: config.easing,
        useNativeDriver: true,
      }),
    ]);
  }, [opacity, scale, translateY]);

  return {
    enter,
    exit,
    animatedStyle: {
      opacity,
      transform: [{ scale }, { translateY }],
    },
  };
}

// Stagger animation utility
export function createStaggerAnimation(
  animations: Animated.CompositeAnimation[],
  staggerDelay = 100
): Animated.CompositeAnimation {
  return Animated.stagger(staggerDelay, animations);
}

// Sequence animation utility
export function createSequenceAnimation(
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation {
  return Animated.sequence(animations);
}