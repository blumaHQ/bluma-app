import React from 'react';
import { SvgProps } from 'react-native-svg';
import EditSvg from './edit.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const EditIcon: React.FC<IconProps> = ({
  size = 30,
  color = '#1C1B1F',
  ...props
}) => {
  return <EditSvg width={size} height={size} fill={color} color={color} {...props} />;
};