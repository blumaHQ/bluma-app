import React from 'react';
import { SvgProps } from 'react-native-svg';
import ProtectedSexSvg from './protected-sex.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const ProtectedSexIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EA4845',
  ...props
}) => {
  return <ProtectedSexSvg width={size} height={size} fill={color} {...props} />;
};
