import React, {useRef} from 'react';
import {View} from 'react-native';
import {
  PinchGestureHandler,
  State,
  type HandlerStateChangeEvent,
  type PinchGestureHandlerEventPayload,
  type PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

export const ARTICLE_FONT_MIN = 14;
export const ARTICLE_FONT_MAX = 30;

type Props = {
  children: React.ReactNode;
  /** Mirror of current body font size (update each render in parent). */
  fontSizeRef: React.MutableRefObject<number>;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
};

/**
 * Pinch-to-zoom on article text: adjusts the same font size as the +/- controls.
 */
export function PinchZoomArticleBody({children, fontSizeRef, setFontSize}: Props) {
  const pinchBaseRef = useRef(ARTICLE_FONT_MIN);

  const onHandlerStateChange = (
    e: HandlerStateChangeEvent<PinchGestureHandlerEventPayload>,
  ) => {
    if (e.nativeEvent.state === State.BEGAN) {
      pinchBaseRef.current = fontSizeRef.current;
    }
  };

  const onGestureEvent = (e: PinchGestureHandlerGestureEvent) => {
    const next = Math.round(
      Math.min(
        ARTICLE_FONT_MAX,
        Math.max(ARTICLE_FONT_MIN, pinchBaseRef.current * e.nativeEvent.scale),
      ),
    );
    setFontSize(next);
  };

  return (
    <PinchGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}>
      <View collapsable={false}>{children}</View>
    </PinchGestureHandler>
  );
}
