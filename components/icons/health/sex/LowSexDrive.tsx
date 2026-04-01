import React from 'react';
import { SvgProps } from 'react-native-svg';
import LowDriveSvg from './low-drive.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const LowSexDriveIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EB4748',
  ...props
}) => {
  return <LowDriveSvg width={size} height={size} fill={color} {...props} />;
};
