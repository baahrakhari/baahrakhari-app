import React, {useRef} from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function DentArticleAction({
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Props): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const dentIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 6,
      tension: 280,
    }).start();
    onPressIn?.(e);
  };

  const dentOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 280,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[style, {transform: [{scale}]}]}>
      <Pressable
        {...rest}
        style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}
        onPressIn={dentIn}
        onPressOut={dentOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
