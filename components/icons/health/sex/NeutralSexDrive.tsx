import React from 'react';
import { SvgProps } from 'react-native-svg';
import NeutralDriveSvg from './neutral-drive.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const NeutralSexDriveIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EB4748',
  ...props
}) => {
  return <NeutralDriveSvg width={size} height={size} fill={color} {...props} />;
};
