import React from 'react';
import { SvgProps } from 'react-native-svg';
import NoSexSvg from './no-sex.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const NoSexIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EB4748',
  ...props
}) => {
  return <NoSexSvg width={size} height={size} fill={color} {...props} />;
};
