import React from 'react';
import { SvgProps } from 'react-native-svg';
import TemperatureSvg from './temperature.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const TemperatureIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#7FB3F8',
  ...props
}) => {
  return <TemperatureSvg width={size} height={size} fill={color} {...props} />;
};

export default TemperatureIcon;

