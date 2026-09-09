import { createModal } from '@gluestack-ui/modal';
import { View, Pressable } from 'react-native';

// Stable primitives preserve the focused DOM node across theme/language updates.
// Gluestack continues to own the portal, dialog semantics and focus scope.
export const Modal = createModal({ Root: View, Content: View, Backdrop: Pressable, CloseButton: Pressable, Header: View, Footer: View, Body: View });
export const ModalContent = Modal.Content;
export const ModalBackdrop = Modal.Backdrop;
