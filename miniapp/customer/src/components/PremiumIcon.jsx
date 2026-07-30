import React from 'react';
import {
  GiGamepad, GiKey, GiTrophyCup, GiSkullCrossedBones, GiWallet, GiShield,
  GiShoppingBag, GiShoppingCart, GiTargetArrows, GiJoystick, GiChest,
  GiPartyPopper, GiTakeMyMoney, GiCrystalBall, GiMegaphone, GiHelp,
  GiGearHammer, GiGhost, GiCrossedSwords, GiClockwork, GiCancel
} from 'react-icons/gi';
import { FiUser, FiMessageCircle, FiGlobe, FiCopy, FiCheck, FiChevronDown, FiChevronRight, FiChevronLeft, FiZap } from 'react-icons/fi';

const ICONS = {
  gamepad: GiGamepad, controller: GiGamepad, games: GiGamepad, shop: GiShoppingBag, shopping: GiShoppingCart,
  key: GiKey, keys: GiKey, trophy: GiTrophyCup, success: GiTrophyCup, skull: GiSkullCrossedBones, help: GiHelp,
  danger: GiSkullCrossbones, wallet: GiWallet, shield: GiShield, support: GiHelp, chat: FiMessageCircle,
  user: FiUser, profile: FiUser, globe: FiGlobe, target: GiTargetArrows, joystick: GiJoystick,
  box: GiChest, gift: GiChest, coin: GiTakeMyMoney, gem: GiCrystalBall, megaphone: GiMegaphone, bolt: FiZap, sparkle: GiCrystalBall,
  settings: GiGearHammer, ghost: GiGhost, dragon: GiCrossedSwords, clock: GiClockwork,
  copy: FiCopy, check: FiCheck, down: FiChevronDown, right: FiChevronRight, left: FiChevronLeft,
  cancel: GiCancel, celebration: GiPartyPopper
};

export default function PremiumIcon({ name = 'gamepad', size = '1em', className = '' }) {
  const Icon = ICONS[name] || GiGamepad;
  return <Icon aria-hidden="true" className={`premium-icon ${className}`} style={{ fontSize: size }} />;
}
