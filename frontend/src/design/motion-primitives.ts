import { View, Pressable } from 'react-native';
import { motion, AnimatePresence } from 'motion/react';

export const MotionView = motion.create(View);
export const MotionPressable = motion.create(Pressable);

/** Gluestack's resolver needs a driver or it silently renders fragments. */
export class MotionDriver {
  engine = { View: MotionView, props: MotionView, Pressable: MotionPressable, AnimatePresence };
  config = {};
}
