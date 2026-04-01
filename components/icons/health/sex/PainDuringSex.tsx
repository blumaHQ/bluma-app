import React from 'react';
import { SvgProps } from 'react-native-svg';
import PainfulSexSvg from './painful-sex.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const PainDuringSexIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EB4748',
  ...props
}) => {
  return <PainfulSexSvg width={size} height={size} fill={color} {...props} />;
};
