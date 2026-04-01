import React from 'react';
import { SvgProps } from 'react-native-svg';
import UnprotectedSexSvg from './unprotected-sex.svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const UnprotectedSexIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#EA4845',
  ...props
}) => {
  return <UnprotectedSexSvg width={size} height={size} fill={color} {...props} />;
};
