// components/icons/index.tsx
import React from 'react';
import { HappyIcon } from './moods/Happy';
import { AngryIcon } from './moods/Angry';
import { EnergeticIcon } from './moods/Energetic';
import { SadIcon } from './moods/Sad';
import { AnxiousIcon } from './moods/Anxious';
import { FriskyIcon } from './moods/Frisky';
import { ConfusedIcon } from './moods/Confused';
import { ApaticIcon } from './moods/Apathetic';
import { MoodSwingsIcon } from './moods/MoodSwings';
import { IrritatedIcon } from './moods/Irritated';
import { CalmIcon } from './moods/Calm';
import { BoredIcon } from './moods/Bored';
import { GrumpyIcon } from './moods/Grumpy';
import { SleepyIcon } from './moods/Sleepy';
import { StressedIcon } from './moods/Stressed';
import { RelaxedIcon } from './moods/Relaxed';
import { LightFlowIcon } from './flows/LightFlow';
import { MediumFlowIcon } from './flows/MediumFlow';
import { HeavyFlowIcon } from './flows/HeavyFlow';
import { BloodClotsIcon } from './flows/BloodClots';
import { CrampsIcon } from './symptoms/Cramps';
import { DiarheaIcon } from './symptoms/Diarhea';
import { OkeyIcon } from './symptoms/Okey';
import { FatigueIcon } from './symptoms/Fatigue';
import { CravingsIcon } from './symptoms/Cravings';
import { BloatingIcon } from './symptoms/Bloating';
import { NauseaIcon } from './symptoms/Nausea';
import { DischargeIcon } from './symptoms/VaginalDryness';
import { UrinationIcon } from './symptoms/Urination';
import { HeadacheIcon } from './symptoms/Headache';
import { SweatsIcon } from './symptoms/Sweats';
import { JointPainIcon } from './symptoms/JointPain';
import { HotFlashesIcon } from './symptoms/HotFlashes';
import { DizzinessIcon } from './symptoms/Dizziness';
import { BrainFogIcon } from './symptoms/BrainFog';
import { ConstipationIcon } from './symptoms/Constipation';
import { InsomniaIcon } from './symptoms/Insomnia';
import { AcneIcon } from './symptoms/Acne';
import { TenderBreastsIcon } from './symptoms/TenderBreasts';
import { BackacheIcon } from './symptoms/Backache';
import { CreamyIcon } from './discharge/Creamy';
import { EggWhiteIcon } from './discharge/EggWhite';
import { GreyDischargeIcon } from './discharge/GreyDischarge';
import { NoDischargeIcon } from './discharge/NoDischarge';
import { SpottingIcon } from './discharge/Spotting';
import { StickyIcon } from './discharge/Sticky';
import { UnusualIcon } from './discharge/Unusual';
import { WateryIcon } from './discharge/Watery';
import { ProtectedSexIcon } from './sex/ProtectedSex';
import { UnprotectedSexIcon } from './sex/UnprotectedSex';
import { HighSexDriveIcon } from './sex/HighSexDrive';
import { NeutralSexDriveIcon } from './sex/NeutralSexDrive';
import { LowSexDriveIcon } from './sex/LowSexDrive';
import { PainDuringSexIcon } from './sex/PainDuringSex';
import { NoSexIcon } from './sex/NoSex';

interface IconProps {
  size?: number;
  color?: string;
}

export type IconName =
  | 'joint-pain'
  | 'brain-fog'
  | 'backacke'
  | 'acne'
  | 'tender-breasts'
  | 'insomnia'
  | 'hot flashes'
  | 'im-okay'
  | 'nausea'
  | 'night-sweats'
  | 'vaginal dryness'
  | 'frequent-urination'
  | 'apathetic'
  | 'headache'
  | 'cramps'
  | 'dizziness'
  | 'diarrhea'
  | 'cramping'
  | 'fatigue'
  | 'bloating'
  | 'bored'
  | 'constipation'
  | 'cravings'
  | 'calm'
  | 'happy'
  | 'energetic'
  | 'sad'
  | 'anxious'
  | 'confused'
  | 'irritated'
  | 'angry'
  | 'grumpy'
  | 'sleepy'
  | 'stressed'
  | 'relaxed'
  | 'mood-swings'
  | 'frisky'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'blood-clots'
  | 'creamy'
  | 'egg-white'
  | 'grey-discharge'
  | 'no-discharge'
  | 'spotting'
  | 'sticky'
  | 'unusual'
  | 'watery'
  | 'protected-sex'
  | 'unprotected-sex'
  | 'high-sex-drive'
  | 'neutral-sex-drive'
  | 'low-sex-drive'
  | 'pain-during-sex'
  | 'no-sex';

const iconMap: Record<IconName, React.FC<IconProps>> = {
  'joint-pain': JointPainIcon,
  'brain-fog': BrainFogIcon,
  backacke: BackacheIcon,
  acne: AcneIcon,
  'tender-breasts': TenderBreastsIcon,
  insomnia: InsomniaIcon,
  'hot flashes': HotFlashesIcon,
  'im-okay': OkeyIcon,
  nausea: NauseaIcon,
  'vaginal dryness': DischargeIcon,
  'night-sweats': SweatsIcon,
  'frequent-urination': UrinationIcon,
  apathetic: ApaticIcon,
  headache: HeadacheIcon,
  cramps: CrampsIcon,
  dizziness: DizzinessIcon,
  fatigue: FatigueIcon,
  bloating: BloatingIcon,
  bored: BoredIcon,
  constipation: ConstipationIcon,
  cravings: CravingsIcon,
  calm: CalmIcon,
  happy: HappyIcon,
  energetic: EnergeticIcon,
  sad: SadIcon,
  anxious: AnxiousIcon,
  confused: ConfusedIcon,
  irritated: IrritatedIcon,
  angry: AngryIcon,
  grumpy: GrumpyIcon,
  sleepy: SleepyIcon,
  stressed: StressedIcon,
  relaxed: RelaxedIcon,
  'mood-swings': MoodSwingsIcon,
  frisky: FriskyIcon,
  diarrhea: DiarheaIcon,
  cramping: CrampsIcon,
  light: LightFlowIcon,
  medium: MediumFlowIcon,
  heavy: HeavyFlowIcon,
  'blood-clots': BloodClotsIcon,
  creamy: CreamyIcon,
  'egg-white': EggWhiteIcon,
  'grey-discharge': GreyDischargeIcon,
  'no-discharge': NoDischargeIcon,
  spotting: SpottingIcon,
  sticky: StickyIcon,
  unusual: UnusualIcon,
  watery: WateryIcon,
  'protected-sex': ProtectedSexIcon,
  'unprotected-sex': UnprotectedSexIcon,
  'high-sex-drive': HighSexDriveIcon,
  'neutral-sex-drive': NeutralSexDriveIcon,
  'low-sex-drive': LowSexDriveIcon,
  'pain-during-sex': PainDuringSexIcon,
  'no-sex': NoSexIcon,
};

interface CustomIconProps extends IconProps {
  name: IconName;
}

export const CustomIcon: React.FC<CustomIconProps> = ({ name, ...props }) => {
  const IconComponent = iconMap[name];
  return IconComponent ? <IconComponent {...props} /> : null;
};
