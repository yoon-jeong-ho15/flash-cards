import React from 'react';
import { View } from 'react-native';
import { colors } from './kit';

export type IconName = 'menu' | 'search' | 'home' | 'layers' | 'folder' | 'plus' | 'arrow' | 'back' | 'close' | 'check' | 'book' | 'target' | 'sparkles' | 'pencil' | 'trash' | 'rotate' | 'thumb';
// Native strokes keep the navigation icons crisp without loading a remote font.
export function Icon({ name, size = 20, color = colors.green }: { name: IconName; size?: number; color?: string }) {
  const line = (x: number, y: number, width: number, angle = 0, key = `${x}:${y}`) => <View key={key} style={{ position: 'absolute', left: x, top: y, width, height: 1.6, backgroundColor: color, borderRadius: 1, transform: [{ rotate: `${angle}deg` }] }} />;
  const rect = (x: number, y: number, width: number, height: number, radius = 2) => <View style={{ position: 'absolute', left: x, top: y, width, height, borderWidth: 1.6, borderColor: color, borderRadius: radius }} />;
  let drawing: React.ReactNode;
  switch (name) {
    case 'pencil': drawing = <>{line(4, 12, 18, -45)}{line(6, 14, 18, -45)}{line(3, 20, 5, -15)}{line(16, 5, 6, 45)}</>; break;
    case 'trash': drawing = <>{rect(5, 7, 14, 14)}{line(3, 5, 18)}{line(9, 2, 6)}{line(5, 14, 9, 90)}{line(10, 14, 9, 90)}</>; break;
    case 'rotate': drawing = <><View style={{ position: 'absolute', left: 4, top: 4, width: 16, height: 16, borderWidth: 1.6, borderColor: color, borderLeftColor: 'transparent', borderRadius: 10 }} />{line(2, 7, 7, 90)}{line(2, 10, 7)}</>; break;
    case 'thumb': drawing = <>{rect(2, 11, 4, 11, 1)}{rect(8, 10, 13, 12, 3)}{line(6, 7, 11, -58)}{line(12, 5, 8, 90)}</>; break;
    case 'menu': drawing = <>{[5, 11, 17].map(y => line(3, y, 18))}</>; break;
    case 'search': drawing = <>{rect(3, 3, 13, 13, 8)}{line(14, 17, 8, 45)}</>; break;
    case 'home': drawing = <>{line(2, 7, 12, -42)}{line(10, 7, 12, 42)}{rect(5, 10, 14, 11)}{rect(10, 15, 4, 6, 0)}</>; break;
    case 'folder': drawing = <>{rect(2, 7, 20, 14)}{line(3, 4, 7)}{line(9, 5.5, 5, 45)}</>; break;
    case 'layers': drawing = <>{rect(6, 3, 14, 16)}{line(3, 7, 1)}{line(3, 14, 1)}{line(3, 21, 14)}</>; break;
    case 'book': drawing = <>{rect(2, 4, 20, 16)}{line(4, 12, 16, 90)}{line(6, 8, 3)}{line(15, 8, 3)}</>; break;
    case 'target': drawing = <>{rect(2, 2, 20, 20, 12)}{rect(7, 7, 10, 10, 6)}{rect(11, 11, 2, 2, 1)}</>; break;
    case 'plus': drawing = <>{line(4, 11, 16)}{line(4, 11, 16, 90)}</>; break;
    case 'close': drawing = <>{line(3, 11, 18, 45)}{line(3, 11, 18, -45)}</>; break;
    case 'check': drawing = <>{line(3, 13, 8, 45)}{line(8, 11, 15, -48)}</>; break;
    case 'sparkles': drawing = <>{line(4, 12, 16)}{line(4, 12, 16, 90)}{line(14, 4, 7)}{line(14, 4, 7, 90)}</>; break;
    default: drawing = <>{line(3, 12, 18)}{line(13, 8.5, 9, 45)}{line(13, 15, 9, -45)}</>;
  }
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: name === 'back' ? [{ rotate: '180deg' }] : [] }}><View style={{ width: 24, height: 24, transform: [{ scale: size / 24 }] }}>{drawing}</View></View>;
}
