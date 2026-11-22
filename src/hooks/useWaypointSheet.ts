import {useCallback, useMemo, useRef, useState} from 'react';
import {Animated, PanResponder} from 'react-native';
import type {LayoutChangeEvent} from 'react-native';

const COLLAPSED_HEIGHT = 49;
const SWIPE_VELOCITY = 0.35;

type Drag = {
  start: number | null;
  dy: number;
  release?: {velocity: number} | 'cancelled';
};

export function useWaypointSheet(reduceMotion: boolean) {
  const translateY = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const collapsed = useRef(false);
  const drag = useRef<Drag | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const snap = useCallback(
    (next: boolean) => {
      drag.current = null;
      collapsed.current = next;
      setIsCollapsed(next);
      const target = next ? Math.max(0, height.current - COLLAPSED_HEIGHT) : 0;
      if (reduceMotion) {
        translateY.setValue(target);
        return;
      }

      Animated.spring(translateY, {
        toValue: target,
        useNativeDriver: true,
        damping: 23,
        stiffness: 230,
        mass: 0.7,
        overshootClamping: true,
      }).start();
    },
    [reduceMotion, translateY],
  );

  const getVisibleHeight = useCallback(
    () => (collapsed.current ? COLLAPSED_HEIGHT : height.current),
    [],
  );

  const onLayout = useCallback(
    ({nativeEvent}: LayoutChangeEvent) => {
      const measuredHeight = nativeEvent.layout.height;
      if (measuredHeight !== height.current) {
        height.current = measuredHeight;
        if (!drag.current && collapsed.current) {
          translateY.setValue(Math.max(0, measuredHeight - COLLAPSED_HEIGHT));
        }
      }
    },
    [translateY],
  );

  const panHandlers = useMemo(() => {
    const updateDrag = (gesture: Drag) => {
      if (drag.current !== gesture || gesture.start === null) {
        return;
      }

      const limit = Math.max(0, height.current - COLLAPSED_HEIGHT);
      const offset = Math.min(limit, Math.max(0, gesture.start + gesture.dy));
      if (!gesture.release) {
        translateY.setValue(offset);
        return;
      }

      const {release} = gesture;
      const next =
        release === 'cancelled'
          ? collapsed.current
          : Math.abs(release.velocity) > SWIPE_VELOCITY
          ? release.velocity > 0
          : offset > limit / 2;
      snap(next);
    };

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, {dx, dy}) =>
        Math.abs(dy) > 5 && Math.abs(dy) > Math.abs(dx),
      onPanResponderGrant: (_, {dy}) => {
        const gesture: Drag = {start: null, dy};
        drag.current = gesture;
        translateY.stopAnimation(value => {
          gesture.start = value;
          updateDrag(gesture);
        });
      },
      onPanResponderMove: (_, {dy}) => {
        if (drag.current) {
          drag.current.dy = dy;
          updateDrag(drag.current);
        }
      },
      onPanResponderRelease: (_, {dy, vy}) => {
        if (drag.current) {
          drag.current.dy = dy;
          drag.current.release = {velocity: vy};
          updateDrag(drag.current);
        }
      },
      onPanResponderTerminate: () => {
        if (drag.current) {
          drag.current.release = 'cancelled';
          updateDrag(drag.current);
        }
      },
    }).panHandlers;
  }, [snap, translateY]);

  const toggle = () => snap(!collapsed.current);
  const collapse = () => {
    if (!collapsed.current) {
      snap(true);
    }
  };
  const expand = () => {
    if (collapsed.current) {
      snap(false);
    }
  };

  return {
    translateY,
    isCollapsed,
    getVisibleHeight,
    onLayout,
    panHandlers,
    toggle,
    collapse,
    expand,
  };
}
