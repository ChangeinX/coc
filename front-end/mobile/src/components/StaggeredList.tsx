import React, { useRef, useEffect } from 'react';
import { Animated, FlatList } from 'react-native';
import { useTheme } from '@theme/index';

export interface StaggeredListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  staggerDelay?: number;
  animationType?: 'fadeIn' | 'slideUp' | 'scaleIn';
  keyExtractor?: (item: T, index: number) => string;
  contentContainerStyle?: any;
  style?: any;
  scrollEnabled?: boolean;
}

export function StaggeredList<T>({
  data,
  renderItem,
  staggerDelay = 100,
  animationType = 'fadeIn',
  keyExtractor,
  contentContainerStyle,
  style,
  scrollEnabled = true,
}: StaggeredListProps<T>) {
  const theme = useTheme();
  const animatedValues = useRef<Animated.Value[]>([]).current;

  // Initialize animated values for each item
  useEffect(() => {
    // Clear old values
    animatedValues.splice(0);
    
    // Create new animated values for current data
    data.forEach((_, index) => {
      animatedValues[index] = new Animated.Value(0);
    });

    // Start staggered animations
    const animations = animatedValues.map((animValue, index) =>
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        delay: index * staggerDelay,
        useNativeDriver: true,
      })
    );

    // Start all animations
    Animated.parallel(animations).start();
  }, [data, staggerDelay, animatedValues]);

  const getAnimatedStyle = (index: number) => {
    const animValue = animatedValues[index];
    if (!animValue) return {};

    switch (animationType) {
      case 'slideUp':
        return {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        };
      case 'scaleIn':
        return {
          opacity: animValue,
          transform: [
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      case 'fadeIn':
      default:
        return {
          opacity: animValue,
        };
    }
  };

  const animatedRenderItem = ({ item, index }: { item: T; index: number }) => {
    return (
      <Animated.View style={[getAnimatedStyle(index), { marginBottom: theme.spacing.sm }]}>
        {renderItem({ item, index })}
      </Animated.View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={animatedRenderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[{ gap: 0 }, contentContainerStyle]}
      style={style}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
    />
  );
}