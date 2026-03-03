import React from 'react';
import { SvgProps } from 'react-native-svg';
import PlusSvg from './plus.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const CycleIcon: React.FC<IconProps> = ({
  size = 30,
  color = '#1C1B1F',
  ...props
}) => {
  return <PlusSvg width={size} height={size} fill={color} color={color} {...props} />;
};
