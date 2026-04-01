import React from 'react';
import { SvgProps } from 'react-native-svg';
import HighDriveSvg from './high-drive.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const HighSexDriveIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EB4748',
  ...props
}) => {
  return <HighDriveSvg width={size} height={size} fill={color} {...props} />;
};
