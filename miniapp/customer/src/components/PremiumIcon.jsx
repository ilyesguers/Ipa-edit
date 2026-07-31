import React from 'react';
import {
  GiGamepad, GiTrophyCup, GiSkullCrossedBones, GiWallet, GiShield,
  GiShoppingBag, GiTargetArrows, GiJoystick, GiChest, GiPartyPopper,
  GiTakeMyMoney, GiCrystalBall, GiMegaphone, GiHelp, GiGearHammer,
  GiGhost, GiCrossedSwords, GiClockwork, GiCancel, GiFlame, GiRocketThruster,
  GiCrown, GiLightningTrio, GiBrightExplosion, GiDiamondTrophy, GiAlienSkull,
  GiSwordsPower, GiFireRay, GiBoltShield, GiCrystalShine, GiCoins,
  GiStarFormation, GiSparkles, GiMoneyStack, GiConsoleController
} from 'react-icons/gi';
import { FiUser, FiMessageCircle, FiGlobe, FiCopy, FiCheck, FiChevronDown, FiChevronRight, FiChevronLeft, FiZap, FiShoppingCart, FiStar } from 'react-icons/fi';
import { FaFire, FaRocket, FaCrown, FaGhost } from 'react-icons/fa';

const ICONS = {
  // Primary gamer icons - each unique for teens
  gamepad: GiConsoleController,
  controller: GiConsoleController,
  games: GiGamepad,
  shop: FaRocket,
  shopping: FiShoppingCart,
  rocket: GiRocketThruster,
  rocket_boost: FaRocket,
  fire: FaFire,
  flame: GiFlame,
  hot: GiFireRay,
  trophy: GiTrophyCup,
  victory: GiDiamondTrophy,
  crown: FaCrown,
  king: GiCrown,
  pro: GiSwordsPower,
  lightning: GiLightningTrio,
  bolt: FiZap,
  zap: GiBoltShield,
  target: GiTargetArrows,
  crosshair: GiTargetArrows,
  focus: GiTargetArrows,
  explosion: GiBrightExplosion,
  boom: GiBrightExplosion,
  bomb: GiBrightExplosion,
  gem: GiCrystalShine,
  diamond: GiCrystalBall,
  crystal: GiCrystalBall,
  loot: GiChest,
  gift: GiChest,
  coin: GiCoins,
  money: GiMoneyStack,
  wallet: GiWallet,
  cash: GiTakeMyMoney,
  skull: GiSkullCrossedBones,
  danger: GiSkullCrossedBones,
  ghost: FaGhost,
  alien: GiAlienSkull,
  monster: GiAlienSkull,
  shield: GiShield,
  safe: GiBoltShield,
  checkmark: FiCheck,
  sparkle: GiSparkles,
  magic: GiSparkles,
  star: FiStar,
  stars: GiStarFormation,
  key: GiCrystalShine,
  keys: GiCrystalShine,
  box: GiChest,
  bag: GiShoppingBag,
  creditcard: GiWallet,
  orders: GiTrophyCup,
  tag: GiCrown,
  link: GiSwordsPower,
  mobile: GiRocketThruster,
  chat: FiMessageCircle,
  support: FaFire,
  megaphone: GiMegaphone,
  back: FiChevronRight,
  left: FiChevronLeft,
  right: FiChevronRight,
  down: FiChevronDown,
  lock: GiShield,
  bell: FaFire,
  notification: FaFire,
  gear: GiGearHammer,
  settings: GiGearHammer,
  clock: GiClockwork,
  calendar: GiClockwork,
  globe: FiGlobe,
  help: GiHelp,
  user: FiUser,
  profile: FiUser,
  admin: GiCrown,
  users: FiUser,
  copy: FiCopy,
  check: FiCheck,
  cancel: GiCancel,
  celebration: GiPartyPopper,
  // legacy aliases
  success: GiTrophyCup,
  primary: FaRocket
};

export default function PremiumIcon({ name = 'gamepad', size = '1em', className = '', style = {} }) {
  // Normalize name to handle different formats
  const normalizedName = String(name || 'gamepad').toLowerCase().trim();
  const Icon = ICONS[normalizedName] || ICONS[normalizedName.replace('emoji', '')] || GiGamepad;
  return <Icon aria-hidden="true" className={`premium-icon ${className}`} style={{ fontSize: size, ...style }} />;
}

// Export for direct use
export { ICONS };
